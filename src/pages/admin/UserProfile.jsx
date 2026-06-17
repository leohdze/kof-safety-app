import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MOCK_USERS, initials } from '../../data/mockUsers'

// ─── Mock task catalog (matches FieldContext) ─────────────────────────────────

const D = 86400000
const H = 3600000
const NOW = Date.now()

const CATALOG = [
  { id: 1,  nombre: 'Check-list de vehículos de servicio', periodicidad: 'Diario',      requiereVobo: false },
  { id: 2,  nombre: 'Inspección de extintores',            periodicidad: 'Mensual',     requiereVobo: true  },
  { id: 3,  nombre: 'Revisión de señalética de emergencia',periodicidad: 'Mensual',     requiereVobo: false },
  { id: 4,  nombre: 'Auditoría de botiquines',             periodicidad: 'Quincenal',   requiereVobo: false },
  { id: 5,  nombre: 'Revisión de EPP',                     periodicidad: 'Semanal',     requiereVobo: false },
  { id: 6,  nombre: 'Inspección de andamios',              periodicidad: 'Semanal',     requiereVobo: true  },
  { id: 7,  nombre: 'Registro de incidentes',              periodicidad: 'Semanal',     requiereVobo: false },
  { id: 8,  nombre: 'Capacitación en materiales peligrosos',periodicidad: 'Mensual',    requiereVobo: true  },
  { id: 9,  nombre: 'Prueba de sistemas contra incendio',  periodicidad: 'Trimestral',  requiereVobo: true  },
  { id: 10, nombre: 'Evaluación de riesgos trimestral',    periodicidad: 'Trimestral',  requiereVobo: true  },
  { id: 11, nombre: 'Limpieza y orden de áreas de trabajo',periodicidad: 'Diario',      requiereVobo: false },
  { id: 12, nombre: 'Control de acceso a zonas restringidas',periodicidad: 'Quincenal', requiereVobo: false },
]

const RATES = [88, 75, 62, 92, 70, 83, 95, 68, 77, 85, 60, 91, 73, 88, 80, 65, 90]

function generateData(userId) {
  const rate = RATES[userId % RATES.length]
  const total = CATALOG.length
  const nDone = Math.round(total * rate / 100)
  const nVenc = Math.max(0, Math.round((total - nDone) * 0.45))
  const nPend = total - nDone - nVenc

  const completadas = CATALOG.slice(0, nDone).map((t, i) => {
    const enTiempo = (userId + i) % 3 !== 0
    const completadaEn = NOW - ((i * 1.8 + (userId % 5)) * D)
    const voboEst = t.requiereVobo ? ((i + userId) % 2 === 0 ? 'aprobado' : 'pendiente') : null
    const evs = [
      ...((i % 2 === 0) ? [{ nombre: `evidencia_${t.id}_foto.jpg`, tipo: 'image' }] : []),
      ...(t.requiereVobo   ? [{ nombre: `reporte_${t.id}.pdf`, tipo: 'pdf' }] : []),
      ...((i % 4 === 0)    ? [{ nombre: `formato_${t.id}.xlsx`, tipo: 'excel' }] : []),
    ]
    return { ...t, completadaEn, enTiempo, voboEst, evidencias: evs }
  })

  const vencidas = CATALOG.slice(nDone, nDone + nVenc).map((t, i) => ({
    ...t, fechaLimite: NOW - ((i + 1 + userId % 3) * D),
    diasRetraso: i + 1 + (userId % 4),
  }))

  const pendientes = CATALOG.slice(nDone + nVenc).map((t, i) => ({
    ...t, fechaLimite: NOW + ((i + 1) * D + userId * H),
  }))

  const fuera = completadas.filter(t => !t.enTiempo).length
  return { rate, completadas, vencidas, pendientes, fuera }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PERIO_STYLE = {
  Diario: 'bg-rose-100 text-rose-700',        Semanal: 'bg-orange-100 text-orange-700',
  Quincenal: 'bg-amber-100 text-amber-700',    Mensual: 'bg-blue-100 text-blue-700',
  Trimestral: 'bg-violet-100 text-violet-700', Semestral: 'bg-purple-100 text-purple-700',
  Anual: 'bg-gray-100 text-gray-600',
}

function pctColor(p) {
  if (p >= 85) return 'text-emerald-600'
  if (p >= 70) return 'text-amber-600'
  return 'text-kof-red'
}

function barColor(p) {
  if (p >= 85) return 'bg-emerald-500'
  if (p >= 70) return 'bg-amber-400'
  return 'bg-kof-red'
}

function fmtDate(ms) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ms))
}

function fmtDeadline(ms) {
  const diff = ms - NOW
  if (diff < 0) return `Vencida hace ${Math.ceil(-diff / D)}d`
  if (diff < 24 * H) return `Hoy ${new Date(ms).toTimeString().slice(0, 5)}`
  return `en ${Math.ceil(diff / D)}d`
}

function EvidIcon({ tipo }) {
  if (tipo === 'image') return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
  if (tipo === 'pdf') return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
  if (tipo === 'excel') return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
  if (tipo === 'video') return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.677V15.32a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
    </svg>
  )
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

const EV_COLORS = {
  image: 'bg-blue-50 text-blue-500',
  pdf:   'bg-red-50 text-red-500',
  excel: 'bg-emerald-50 text-emerald-600',
  word:  'bg-indigo-50 text-indigo-500',
  video: 'bg-purple-50 text-purple-500',
}

function SectionTitle({ children }) {
  return <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 mt-6 px-1">{children}</h2>
}

// ─── Componente principal ─────────────────────────────────────────────────────

const TABS_GALLERY = ['Todas', 'Imágenes', 'Documentos', 'Videos']

export default function UserProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [evidTab, setEvidTab] = useState('Todas')

  const user = MOCK_USERS.find(u => u.id === Number(id))

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-gray-500">Usuario no encontrado.</p>
        <button onClick={() => navigate('/admin/usuarios')} className="mt-4 text-sm font-semibold text-kof-red">
          ← Volver a Usuarios
        </button>
      </div>
    )
  }

  const data = generateData(user.id)

  // Evidence gallery: flatten all evidences from completadas
  const allEvidence = data.completadas.flatMap(t =>
    t.evidencias.map(e => ({ ...e, tarea: t.nombre, tareaId: t.id }))
  )
  const filteredEvidence = allEvidence.filter(e => {
    if (evidTab === 'Imágenes')   return e.tipo === 'image'
    if (evidTab === 'Documentos') return ['pdf','excel','word'].includes(e.tipo)
    if (evidTab === 'Videos')     return e.tipo === 'video'
    return true
  })

  const ini = initials(user.nombre)
  const subroleBadge = user.subrole === 'TSD'
    ? 'bg-amber-100 text-amber-700'
    : user.subrole === 'Instructor'
    ? 'bg-teal-100 text-teal-700'
    : 'bg-purple-100 text-purple-700'

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Back */}
      <button onClick={() => navigate('/admin/usuarios')}
        className="flex items-center gap-1.5 text-sm font-semibold text-kof-red mb-5">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Usuarios
      </button>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-kof-red/10 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-kof-red">{ini}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${subroleBadge}`}>{user.subrole}</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${user.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {user.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{user.nombre}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user.correo}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">Región: </span>{user.region}
            </span>
            {user.uo !== '—' && (
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">UO: </span>{user.uo}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate(`/admin/usuarios`, { state: { editId: user.id } })}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
      </div>

      {/* ── Estadísticas del mes ───────────────────────────────────────────── */}
      <SectionTitle>Estadísticas del mes</SectionTitle>

      {/* Barra de cumplimiento */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">% Cumplimiento</span>
          <span className={`text-2xl font-bold ${pctColor(data.rate)}`}>{data.rate}%</span>
        </div>
        <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div className={`h-2.5 rounded-full transition-all ${barColor(data.rate)}`} style={{ width: `${data.rate}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Completadas',   value: data.completadas.length, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Pendientes',    value: data.pendientes.length,  color: 'bg-blue-50 text-blue-700'     },
          { label: 'Vencidas',      value: data.vencidas.length,    color: 'bg-red-50 text-kof-red'       },
          { label: 'Fuera de tiempo',value: data.fuera,             color: 'bg-amber-50 text-amber-700'   },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 text-center ${s.color}`}>
            <p className="text-3xl font-bold leading-none">{s.value}</p>
            <p className="text-[11px] font-semibold mt-1.5 leading-tight opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Pendientes ────────────────────────────────────────────────────── */}
      {data.pendientes.length > 0 && (
        <>
          <SectionTitle>Pendientes</SectionTitle>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {data.pendientes.map((t, i) => (
              <div key={t.id} className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{t.nombre}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PERIO_STYLE[t.periodicidad] ?? 'bg-gray-100 text-gray-400'}`}>
                    {t.periodicidad}
                  </span>
                </div>
                <span className="text-xs font-semibold text-blue-600 flex-shrink-0">{fmtDeadline(t.fechaLimite)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Vencidas ──────────────────────────────────────────────────────── */}
      {data.vencidas.length > 0 && (
        <>
          <SectionTitle>Vencidas</SectionTitle>
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
            {data.vencidas.map((t, i) => (
              <div key={t.id} className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-red-50' : ''}`}>
                <div className="w-2 h-2 rounded-full bg-kof-red flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{t.nombre}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PERIO_STYLE[t.periodicidad] ?? 'bg-gray-100 text-gray-400'}`}>
                    {t.periodicidad}
                  </span>
                </div>
                <span className="text-xs font-bold text-kof-red flex-shrink-0 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                  +{t.diasRetraso}d
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Completadas ───────────────────────────────────────────────────── */}
      {data.completadas.length > 0 && (
        <>
          <SectionTitle>Completadas este mes</SectionTitle>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {data.completadas.map((t, i) => (
              <div key={t.id} className={`flex items-start gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{t.nombre}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(t.completadaEn)}</p>
                  {t.evidencias.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {t.evidencias.map((e, j) => (
                        <span key={j} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${EV_COLORS[e.tipo] ?? 'bg-gray-100 text-gray-500'}`}>
                          <EvidIcon tipo={e.tipo} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    t.enTiempo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {t.enTiempo ? 'En tiempo' : 'Fuera de tiempo'}
                  </span>
                  {t.voboEst && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      t.voboEst === 'aprobado' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      VoBo {t.voboEst}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Galería de evidencias ─────────────────────────────────────────── */}
      <SectionTitle>Evidencias subidas</SectionTitle>

      {/* Filtro por tipo */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS_GALLERY.map(tab => (
          <button key={tab} onClick={() => setEvidTab(tab)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all ${
              evidTab === tab ? 'bg-kof-red text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {tab}
            {tab === 'Todas' && ` (${allEvidence.length})`}
          </button>
        ))}
      </div>

      {filteredEvidence.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-sm text-gray-400">Sin evidencias en esta categoría</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          {/* Imágenes en grid */}
          {filteredEvidence.filter(e => e.tipo === 'image').length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filteredEvidence.filter(e => e.tipo === 'image').map((e, i) => (
                <div key={i} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-100 border border-gray-100 flex flex-col items-center justify-center gap-1 flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-[9px] text-gray-500 leading-tight text-center px-0.5 truncate w-full text-center">{e.nombre.split('_')[0]}</span>
                </div>
              ))}
            </div>
          )}
          {/* Docs y videos en lista */}
          {filteredEvidence.filter(e => e.tipo !== 'image').map((e, i) => (
            <div key={i} className={`flex items-center gap-3 py-2 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${EV_COLORS[e.tipo] ?? 'bg-gray-100 text-gray-500'}`}>
                <EvidIcon tipo={e.tipo} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 truncate">{e.nombre}</p>
                <p className="text-[10px] text-gray-400 truncate">{e.tarea}</p>
              </div>
              <button className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pb-8" />
    </div>
  )
}
