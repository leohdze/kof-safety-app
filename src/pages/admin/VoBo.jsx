import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getPendingVobos, updateVobo } from '../../services/completionService'

// ─── Mock fallback ────────────────────────────────────────────────────────────

const D = 86400000
const _NOW = Date.now()

const MOCK_VOBO = [
  {
    id: 'mock-1',
    rutina: 'Inspección de extintores', periodicidad: 'Mensual', clasificacion: 'Operativa',
    tsd: { id: 3, nombre: 'Benjamin Torres Tapia', iniciales: 'BT', uo: 'Coecillo', region: 'Coecillo' },
    completadaEn: _NOW - 2 * D,
    evidencias: [
      { nombre: 'extintor_frente.jpg',           tipo: 'image' },
      { nombre: 'Formato-Extintores-Jun2026.pdf', tipo: 'pdf'  },
    ],
    estado: 'pendiente', aprobadoPor: null, aprobadoEn: null, motivoRechazo: null,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ms) {
  const diff = Date.now() - ms
  const d = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  if (d >= 7)  return `hace ${Math.floor(d / 7)} sem`
  if (d >= 1)  return `hace ${d} día${d > 1 ? 's' : ''}`
  if (h >= 1)  return `hace ${h}h`
  return 'hace unos minutos'
}

function fmtDate(ms) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ms))
}

const EV_ICON_STYLE = {
  image: { bg: 'bg-blue-50 text-blue-500',       label: 'IMG' },
  pdf:   { bg: 'bg-red-50 text-red-500',         label: 'PDF' },
  excel: { bg: 'bg-emerald-50 text-emerald-600', label: 'XLS' },
  word:  { bg: 'bg-indigo-50 text-indigo-500',   label: 'DOC' },
  video: { bg: 'bg-purple-50 text-purple-500',   label: 'VID' },
}

const REGIONES = [
  'Todas las regiones', 'Coecillo', 'Tenango', 'Pacífico', 'Tlaxcala', 'Toluca',
  'Puebla Foránea', 'Puebla', 'Montaña', 'Acapulco', 'Cuernavaca',
]

function EvidPill({ tipo, nombre, url }) {
  if (tipo === 'image' && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer"
        className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 block">
        <img src={url} alt={nombre} className="w-full h-full object-cover" />
      </a>
    )
  }
  const s = EV_ICON_STYLE[tipo] ?? { bg: 'bg-gray-100 text-gray-500', label: 'FILE' }
  return (
    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
      <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${s.bg}`}>{s.label}</span>
      <span className="text-[10px] text-gray-600 truncate max-w-[120px]">{nombre}</span>
    </div>
  )
}

// ─── Modal de rechazo ─────────────────────────────────────────────────────────

function RejectModal({ item, onConfirm, onCancel }) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900 mb-1">Rechazar VoBo</h3>
        <p className="text-sm text-gray-500 mb-4">
          Indica el motivo del rechazo para{' '}
          <span className="font-semibold text-gray-700">{item.tsd.nombre}</span>.
          Se le notificará para que corrija y resubmita.
        </p>
        <textarea
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700
            placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-kof-red resize-none"
          rows={3}
          placeholder="Ej: La foto del extintor no muestra el manómetro. Requiere resubir evidencia más clara."
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold
              text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={() => motivo.trim() && onConfirm(motivo.trim())}
            disabled={!motivo.trim()}
            className="flex-1 py-2.5 bg-kof-red text-white rounded-xl text-sm font-semibold
              hover:bg-kof-red-dark active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            Rechazar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function VoBo() {
  const { user } = useAuth()
  const [items, setItems]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [filterRegion, setFilterRegion] = useState('Todas las regiones')
  const [filterTab, setFilterTab]     = useState('Pendientes')

  useEffect(() => {
    setLoading(true)
    getPendingVobos()
      .then(data => setItems(data.length ? data : MOCK_VOBO))
      .catch(err => {
        console.warn('[VoBo] Supabase unavailable, usando mock:', err.message)
        setItems(MOCK_VOBO)
      })
      .finally(() => setLoading(false))
  }, [])

  const pendientes = items.filter(i => i.estado === 'pendiente')
  const aprobados  = items.filter(i => i.estado === 'aprobado')
  const rechazados = items.filter(i => i.estado === 'rechazado')

  const baseList = filterTab === 'Pendientes' ? pendientes
    : filterTab === 'Aprobados' ? aprobados
    : rechazados

  const visible = baseList.filter(i =>
    filterRegion === 'Todas las regiones' || i.tsd.region === filterRegion
  )

  const execNombre = user?.user_metadata?.nombre
    || user?.email?.split('@')[0]
    || 'Ejecutivo'

  async function approve(item) {
    const now = Date.now()
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, estado: 'aprobado', aprobadoPor: execNombre, aprobadoEn: now }
      : i
    ))
    window.dispatchEvent(new Event('vobo-updated'))
    if (!String(item.id).startsWith('mock-')) {
      updateVobo(item.id, 'approved', null)
        .catch(err => console.warn('[VoBo] approve error:', err.message))
    }
  }

  async function reject(item, motivo) {
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, estado: 'rechazado', motivoRechazo: motivo }
      : i
    ))
    setRejectTarget(null)
    window.dispatchEvent(new Event('vobo-updated'))
    if (!String(item.id).startsWith('mock-')) {
      updateVobo(item.id, 'rejected', motivo)
        .catch(err => console.warn('[VoBo] reject error:', err.message))
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Bandeja de VoBo
            {pendientes.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold
                bg-kof-red text-white rounded-full">
                {pendientes.length}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''} ·{' '}
            {aprobados.length} aprobado{aprobados.length !== 1 ? 's' : ''} ·{' '}
            {rechazados.length} rechazado{rechazados.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tabs + filtro región */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {['Pendientes', 'Aprobados', 'Rechazados'].map(tab => (
            <button key={tab} onClick={() => setFilterTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === tab ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}>
              {tab}
              {tab === 'Pendientes' && pendientes.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-kof-red text-white rounded-full px-1.5">
                  {pendientes.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <select
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white
            text-gray-700 focus:outline-none focus:ring-2 focus:ring-kof-red"
          value={filterRegion}
          onChange={e => setFilterRegion(e.target.value)}>
          {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-kof-red border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-medium">Cargando bandeja...</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">Sin registros</p>
          <p className="text-xs text-gray-400 mt-1">
            No hay VoBos {filterTab.toLowerCase()} en esta región.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
              item.estado === 'rechazado' ? 'border-red-100'
              : item.estado === 'aprobado' ? 'border-emerald-100'
              : 'border-gray-100'
            }`}>
              {/* Header del item */}
              <div className="flex items-start gap-4 p-5">
                <div className="w-10 h-10 rounded-xl bg-kof-red/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-kof-red">{item.tsd.iniciales}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {item.periodicidad}
                    </span>
                    {item.clasificacion && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.clasificacion === 'Operativa'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {item.clasificacion}
                      </span>
                    )}
                    {item.estado === 'aprobado' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        ✓ Aprobado
                      </span>
                    )}
                    {item.estado === 'rechazado' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        ✗ Rechazado
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-900">{item.rutina}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-semibold text-gray-700">{item.tsd.nombre}</span>
                    {item.tsd.region && <> · {item.tsd.region}</>}
                    {item.tsd.uo && <> · {item.tsd.uo}</>}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-500">{timeAgo(item.completadaEn)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(item.completadaEn)}</p>
                </div>
              </div>

              {/* Evidencias */}
              {item.evidencias.length > 0 && (
                <div className="px-5 pb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Evidencias ({item.evidencias.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.evidencias.map((e, i) => (
                      <EvidPill key={e.id ?? i} tipo={e.tipo} nombre={e.nombre} url={e.url} />
                    ))}
                  </div>
                </div>
              )}

              {/* Motivo rechazo */}
              {item.estado === 'rechazado' && item.motivoRechazo && (
                <div className="mx-5 mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-1">
                    Motivo del rechazo
                  </p>
                  <p className="text-xs text-red-700">{item.motivoRechazo}</p>
                </div>
              )}

              {/* Info aprobación */}
              {item.estado === 'aprobado' && item.aprobadoPor && (
                <div className="mx-5 mb-4 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                  <p className="text-xs text-emerald-700">
                    Aprobado por{' '}
                    <span className="font-semibold">{item.aprobadoPor}</span>
                    {item.aprobadoEn && (
                      <span className="text-emerald-500"> · {fmtDate(item.aprobadoEn)}</span>
                    )}
                  </p>
                </div>
              )}

              {/* Botones de acción */}
              {item.estado === 'pendiente' && (
                <div className="flex border-t border-gray-50">
                  <button onClick={() => setRejectTarget(item)}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm
                      font-semibold text-kof-red hover:bg-red-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Rechazar
                  </button>
                  <div className="w-px bg-gray-100" />
                  <button onClick={() => approve(item)}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm
                      font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Aprobar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de rechazo */}
      {rejectTarget && (
        <RejectModal
          item={rejectTarget}
          onConfirm={motivo => reject(rejectTarget, motivo)}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  )
}
