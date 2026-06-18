import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getUserProfile } from '../../services/userService'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function fmtDate(iso) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function fmtDeadline(iso) {
  const diff = new Date(iso).getTime() - Date.now()
  const D = 86400000, H = 3600000
  if (diff < 0) return `Vencida hace ${Math.ceil(-diff / D)}d`
  if (diff < H * 24) return `Hoy ${new Date(iso).toTimeString().slice(0, 5)}`
  return `en ${Math.ceil(diff / D)}d`
}

function pctColor(p) {
  return p >= 85 ? 'text-emerald-600' : p >= 70 ? 'text-amber-600' : 'text-kof-red'
}
function barColor(p) {
  return p >= 85 ? 'bg-emerald-500' : p >= 70 ? 'bg-amber-400' : 'bg-kof-red'
}

function ext2tipo(ext = '') {
  if (['jpg','jpeg','png','heic','gif','webp'].includes(ext)) return 'image'
  if (ext === 'pdf')  return 'pdf'
  if (['xlsx','xls'].includes(ext)) return 'excel'
  if (['docx','doc'].includes(ext)) return 'word'
  if (['mp4','mov','avi'].includes(ext)) return 'video'
  return 'file'
}

const EV_COLORS = {
  image: 'bg-blue-50 text-blue-500', pdf: 'bg-red-50 text-red-500',
  excel: 'bg-emerald-50 text-emerald-600', word: 'bg-indigo-50 text-indigo-500',
  video: 'bg-purple-50 text-purple-500',
}

const PERIO_STYLE = {
  Diario: 'bg-rose-100 text-rose-700', Semanal: 'bg-orange-100 text-orange-700',
  Quincenal: 'bg-amber-100 text-amber-700', Mensual: 'bg-blue-100 text-blue-700',
  Trimestral: 'bg-violet-100 text-violet-700', Semestral: 'bg-purple-100 text-purple-700',
}

function SectionTitle({ children }) {
  return <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 mt-6 px-1">{children}</h2>
}

function EvidIcon({ tipo }) {
  const paths = {
    image: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z',
    pdf:   'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    excel: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    word:  'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    video: 'M15 10l4.553-2.276A1 1 0 0121 8.677V15.32a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
  }
  const d = paths[tipo] ?? paths.pdf
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const TABS_GALLERY = ['Todas', 'Imágenes', 'Documentos', 'Videos']

export default function UserProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [evidTab, setEvidTab] = useState('Todas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [completions, setCompletions] = useState([])
  const [pendingItems, setPendingItems] = useState([])
  const [overdueItems, setOverdueItems] = useState([])

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      getUserProfile(id),
      supabase
        .from('task_assignments')
        .select('id, status, due_date, tasks(id, title, periodicity)')
        .eq('user_id', id),
      supabase
        .from('task_completions')
        .select('id, completed_at, is_on_time, vobo_status, tasks(id, title, periodicity), task_evidence(id, file_url, file_name, file_type)')
        .eq('user_id', id)
        .order('completed_at', { ascending: false })
        .limit(50),
    ])
      .then(([prof, assignRes, compRes]) => {
        if (!prof) { setError('Usuario no encontrado'); return }
        setProfile(prof)

        const assignments = assignRes.data ?? []
        const comps = compRes.data ?? []
        setCompletions(comps)

        const nowTs = Date.now()
        const pending = assignments.filter(a => a.status === 'pending' && new Date(a.due_date || 0).getTime() > nowTs)
        const overdue = assignments.filter(a => a.status !== 'completed' && a.due_date && new Date(a.due_date).getTime() < nowTs)

        setPendingItems(pending)
        setOverdueItems(overdue)

        const completadas = comps.length
        const vencidasN   = overdue.length
        if (assignRes.error) console.warn('[UserProfile] assignments RLS/error:', assignRes.error.message)
        if (compRes.error)   console.warn('[UserProfile] completions RLS/error:', compRes.error.message)
        setStats({
          total:         assignments.length,
          completadas,
          pendientes:    pending.length,
          vencidas:      vencidasN,
          fueraDeTiempo: comps.filter(c => c.is_on_time === false).length,
          voboAprobado:  comps.filter(c => c.vobo_status === 'approved').length,
          voboPendiente: comps.filter(c => c.vobo_status === 'pending').length,
          cumplimiento:  (completadas + vencidasN) > 0
            ? Math.min(100, Math.round((completadas / (completadas + vencidasN)) * 100))
            : 0,
        })
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const allEvidence = completions.flatMap(c =>
    (c.task_evidence ?? []).map(e => ({
      nombre: e.file_name, url: e.file_url,
      tipo: ext2tipo(e.file_type), tarea: c.tasks?.title ?? '',
    }))
  )
  const filteredEvidence = allEvidence.filter(e => {
    if (evidTab === 'Imágenes')   return e.tipo === 'image'
    if (evidTab === 'Documentos') return ['pdf','excel','word'].includes(e.tipo)
    if (evidTab === 'Videos')     return e.tipo === 'video'
    return true
  })

  // ── Loading ──
  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[300px]">
      <div className="w-6 h-6 border-2 border-kof-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ── Error ──
  if (error || !profile) return (
    <div className="p-8 text-center">
      <p className="text-sm text-gray-500">{error ?? 'Usuario no encontrado.'}</p>
      <button onClick={() => navigate('/admin/usuarios')}
        className="mt-4 text-sm font-semibold text-kof-red">← Volver a Usuarios</button>
    </div>
  )

  const ini = initials(profile.nombre)
  const subroleBadge = profile.subrole === 'TSD'
    ? 'bg-amber-100 text-amber-700'
    : profile.subrole === 'Instructor'
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

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-kof-red/10 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-kof-red">{ini}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {profile.subrole && (
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${subroleBadge}`}>{profile.subrole}</span>
            )}
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${profile.activo !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {profile.activo !== false ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{profile.nombre}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{profile.correo}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {profile.region && (
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">Región: </span>{profile.region}
              </span>
            )}
            {profile.uo && (
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">UO: </span>{profile.uo}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/usuarios', { state: { editId: id } })}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
      </div>

      {/* ── Estadísticas globales ── */}
      <SectionTitle>Estadísticas globales</SectionTitle>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">% Cumplimiento</span>
          <span className={`text-2xl font-bold ${pctColor(stats.cumplimiento)}`}>{stats.cumplimiento}%</span>
        </div>
        <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div className={`h-2.5 rounded-full transition-all ${barColor(stats.cumplimiento)}`}
            style={{ width: `${stats.cumplimiento}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {stats.completadas} de {stats.total} tareas asignadas completadas
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Completadas',    value: stats.completadas,   color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Pendientes',     value: stats.pendientes,    color: 'bg-blue-50 text-blue-700'       },
          { label: 'Vencidas',       value: stats.vencidas,      color: 'bg-red-50 text-kof-red'         },
          { label: 'Fuera de tiempo',value: stats.fueraDeTiempo, color: 'bg-amber-50 text-amber-700'     },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 text-center ${s.color}`}>
            <p className="text-3xl font-bold leading-none">{s.value}</p>
            <p className="text-[11px] font-semibold mt-1.5 leading-tight opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {(stats.voboAprobado > 0 || stats.voboPendiente > 0) && (
        <div className="flex gap-3 mt-3">
          {stats.voboAprobado > 0 && (
            <div className="flex-1 bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-purple-700">{stats.voboAprobado}</p>
              <p className="text-[11px] text-purple-600 font-semibold mt-0.5">VoBo aprobados</p>
            </div>
          )}
          {stats.voboPendiente > 0 && (
            <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-orange-700">{stats.voboPendiente}</p>
              <p className="text-[11px] text-orange-600 font-semibold mt-0.5">VoBo pendientes</p>
            </div>
          )}
        </div>
      )}

      {/* ── Pendientes ── */}
      {pendingItems.length > 0 && (
        <>
          <SectionTitle>Pendientes</SectionTitle>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {pendingItems.map((t, i) => (
              <div key={t.id} className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{t.tasks?.title ?? '—'}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PERIO_STYLE[t.tasks?.periodicity] ?? 'bg-gray-100 text-gray-400'}`}>
                    {t.tasks?.periodicity}
                  </span>
                </div>
                <span className="text-xs font-semibold text-blue-600 flex-shrink-0">
                  {t.due_date ? fmtDeadline(t.due_date) : '—'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Vencidas ── */}
      {overdueItems.length > 0 && (
        <>
          <SectionTitle>Vencidas</SectionTitle>
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
            {overdueItems.map((t, i) => {
              const dias = Math.floor((Date.now() - new Date(t.due_date).getTime()) / 86400000)
              return (
                <div key={t.id} className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-red-50' : ''}`}>
                  <div className="w-2 h-2 rounded-full bg-kof-red flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{t.tasks?.title ?? '—'}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PERIO_STYLE[t.tasks?.periodicity] ?? 'bg-gray-100 text-gray-400'}`}>
                      {t.tasks?.periodicity}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-kof-red bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                    +{dias}d
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Historial de completadas ── */}
      <SectionTitle>Historial de completadas</SectionTitle>
      {completions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-sm text-gray-400">Sin tareas completadas aún</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {completions.map((c, i) => (
            <div key={c.id} className={`flex items-start gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{c.tasks?.title ?? '—'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(c.completed_at)}</p>
                {c.task_evidence?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.task_evidence.map((e, j) => {
                      const tipo = ext2tipo(e.file_type)
                      return (
                        <span key={j} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${EV_COLORS[tipo] ?? 'bg-gray-100 text-gray-500'}`}>
                          <EvidIcon tipo={tipo} />
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {c.is_on_time !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    c.is_on_time
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {c.is_on_time ? 'En tiempo' : 'Fuera de tiempo'}
                  </span>
                )}
                {c.vobo_status && c.vobo_status !== 'not_required' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    c.vobo_status === 'approved' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    c.vobo_status === 'rejected' ? 'bg-red-50 text-kof-red border-red-200' :
                    'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    VoBo {c.vobo_status === 'approved' ? 'aprobado' : c.vobo_status === 'rejected' ? 'rechazado' : 'pendiente'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Galería de evidencias ── */}
      <SectionTitle>Evidencias subidas</SectionTitle>

      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS_GALLERY.map(tab => (
          <button key={tab} onClick={() => setEvidTab(tab)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all ${
              evidTab === tab ? 'bg-kof-red text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {tab}{tab === 'Todas' && ` (${allEvidence.length})`}
          </button>
        ))}
      </div>

      {filteredEvidence.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-sm text-gray-400">Sin evidencias en esta categoría</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          {filteredEvidence.filter(e => e.tipo === 'image').length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filteredEvidence.filter(e => e.tipo === 'image').map((e, i) =>
                e.url ? (
                  <a key={i} href={e.url} target="_blank" rel="noreferrer"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0 block">
                    <img src={e.url} alt={e.nombre} className="w-full h-full object-cover" />
                  </a>
                ) : (
                  <div key={i} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-100 border border-gray-100 flex items-center justify-center flex-shrink-0">
                    <EvidIcon tipo="image" />
                  </div>
                )
              )}
            </div>
          )}
          {filteredEvidence.filter(e => e.tipo !== 'image').map((e, i) => (
            <div key={i} className={`flex items-center gap-3 py-2 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${EV_COLORS[e.tipo] ?? 'bg-gray-100 text-gray-500'}`}>
                <EvidIcon tipo={e.tipo} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 truncate">{e.nombre}</p>
                <p className="text-[10px] text-gray-400 truncate">{e.tarea}</p>
              </div>
              {e.url && (
                <a href={e.url} target="_blank" rel="noreferrer"
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pb-8" />
    </div>
  )
}
