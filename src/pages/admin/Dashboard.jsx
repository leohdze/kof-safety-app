import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const H = 3600000
const D = 86400000

function countdown(targetMs) {
  const diff = targetMs - Date.now()
  if (diff <= 0) return { text: 'Vencida', level: 'expired' }
  const h = Math.floor(diff / H)
  const m = Math.floor((diff % H) / 60000)
  if (h >= 24) { const d = Math.floor(h / 24); return { text: `${d}d ${h % 24}h`, level: 'ok' } }
  if (h >= 6)  return { text: `${h}h ${m}m`, level: 'warning' }
  return { text: h >= 1 ? `${h}h ${m}m` : `${m}m`, level: 'urgent' }
}

const CD_STYLES = {
  ok:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50  text-amber-700  border-amber-200',
  urgent:  'bg-red-50    text-kof-red    border-red-200',
  expired: 'bg-gray-100  text-gray-400   border-gray-200',
}

function daysLate(ts) {
  const d = Math.floor((Date.now() - ts) / D)
  return `${d} ${d === 1 ? 'día' : 'días'}`
}

function lastSeen(ts) {
  if (!ts) return 'Sin actividad'
  const d = Math.floor((Date.now() - ts) / D)
  if (d >= 1) return `Hace ${d} ${d === 1 ? 'día' : 'días'}`
  return `Hace ${Math.floor((Date.now() - ts) / H)}h`
}

function pctBarColor(p) {
  return p >= 90 ? 'bg-emerald-500' : p >= 70 ? 'bg-blue-500' : p >= 50 ? 'bg-amber-500' : 'bg-kof-red'
}

function pctTextColor(p) {
  return p >= 90 ? 'text-emerald-600' : p >= 70 ? 'text-blue-600' : p >= 50 ? 'text-amber-600' : 'text-kof-red'
}

function initials(n = '') {
  return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const TODAY = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date())

// ─── Carga de datos reales ────────────────────────────────────────────────────

async function loadDashboard() {
  const now   = new Date()
  const in48h = new Date(now.getTime() + 48 * H)
  const ago30d = new Date(now.getTime() - 30 * D)
  const ago3d  = new Date(now.getTime() - 3  * D)

  // Fase 1: paralelo
  const [proxRes, vencRes, usersRes, compRes] = await Promise.all([
    supabase.from('task_assignments')
      .select('id, due_date, user_id, tasks!inner(title)')
      .eq('status', 'pending')
      .gte('due_date', now.toISOString())
      .lte('due_date', in48h.toISOString())
      .order('due_date')
      .limit(6),

    supabase.from('task_assignments')
      .select('id, due_date, user_id, tasks!inner(title)')
      .in('status', ['pending', 'overdue'])
      .not('due_date', 'is', null)
      .lt('due_date', now.toISOString())
      .order('due_date')
      .limit(6),

    supabase.from('user_profiles')
      .select('id, full_name, region, uo')
      .eq('role', 'field')
      .neq('is_active', false),

    supabase.from('task_completions')
      .select('user_id, completed_at')
      .gte('completed_at', ago30d.toISOString()),
  ])

  const fieldUsers    = usersRes.data ?? []
  const fieldUserIds  = new Set(fieldUsers.map(u => u.id))
  const profileMap    = {}
  fieldUsers.forEach(u => { profileMap[u.id] = u })

  // Fase 2: perfiles extra para proximos/vencidas + assignments de field users
  const extraIds = [
    ...(proxRes.data ?? []).map(a => a.user_id),
    ...(vencRes.data ?? []).map(a => a.user_id),
  ].filter(id => !profileMap[id])
  const uniqueExtraIds = [...new Set(extraIds)]

  const [extraProfRes, assignRes] = await Promise.all([
    uniqueExtraIds.length > 0
      ? supabase.from('user_profiles').select('id, full_name, region, uo').in('id', uniqueExtraIds)
      : { data: [] },
    fieldUsers.length > 0
      ? supabase.from('task_assignments').select('user_id, status, due_date').in('user_id', [...fieldUserIds])
      : { data: [] },
  ])

  ;(extraProfRes.data ?? []).forEach(p => { profileMap[p.id] = p })

  function resolveUo(prof) {
    if (!prof?.uo) return '—'
    return Array.isArray(prof.uo) ? prof.uo.join(', ') : prof.uo
  }

  // Próximos a vencer
  const proximos = (proxRes.data ?? []).map(a => {
    const prof = profileMap[a.user_id] ?? {}
    return { id: a.id, rutina: a.tasks?.title ?? '—', tsd: prof.full_name ?? 'TSD', uo: resolveUo(prof), vence: new Date(a.due_date).getTime() }
  })

  // Tareas vencidas
  const vencidas = (vencRes.data ?? []).map(a => {
    const prof = profileMap[a.user_id] ?? {}
    return { id: a.id, rutina: a.tasks?.title ?? '—', tsd: prof.full_name ?? 'TSD', uo: resolveUo(prof), vencio: new Date(a.due_date).getTime() }
  })

  // Ranking TSDs
  const allAssignments = assignRes.data ?? []
  const assignByUser = {}
  allAssignments.forEach(a => {
    if (!assignByUser[a.user_id]) assignByUser[a.user_id] = { total: 0, completed: 0, overdue: 0 }
    assignByUser[a.user_id].total++
    if (a.status === 'completed') assignByUser[a.user_id].completed++
    if (a.status !== 'completed' && a.due_date && new Date(a.due_date) < now) {
      assignByUser[a.user_id].overdue++
    }
  })

  const ranking = fieldUsers
    .map(u => {
      const d = assignByUser[u.id] ?? { total: 0, completed: 0, overdue: 0 }
      const pct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
      return { id: u.id, nombre: u.full_name, uo: resolveUo(u), pct, comp: d.completed, venc: d.overdue, total: d.total }
    })
    .sort((a, b) => b.pct - a.pct)

  // Alertas de inactividad
  const compByUser = {}
  ;(compRes.data ?? []).forEach(c => {
    if (!fieldUserIds.has(c.user_id)) return
    if (!compByUser[c.user_id] || c.completed_at > compByUser[c.user_id]) {
      compByUser[c.user_id] = c.completed_at
    }
  })

  const inactivos = fieldUsers
    .filter(u => { const last = compByUser[u.id]; return !last || new Date(last) < ago3d })
    .map(u => ({ nombre: u.full_name, uo: resolveUo(u), ts: compByUser[u.id] ? new Date(compByUser[u.id]).getTime() : null }))
    .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0))
    .slice(0, 5)

  return { proximos, vencidas, ranking, inactivos, totalUsers: fieldUsers.length }
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionCard({ title, count, action, children, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{count}</span>
          )}
          {action}
        </div>
      </div>
      {loading ? (
        <div className="py-10 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-kof-red/30 border-t-kof-red rounded-full animate-spin" />
        </div>
      ) : children}
    </div>
  )
}

function Avatar({ nombre, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-xs'
  return (
    <div className={`${sz} rounded-full bg-kof-red/10 flex items-center justify-center flex-shrink-0`}>
      <span className="font-bold text-kof-red">{initials(nombre)}</span>
    </div>
  )
}

function Medal({ rank }) {
  if (rank === 1) return <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0"><span className="text-[11px] font-bold text-white">1</span></div>
  if (rank === 2) return <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0"><span className="text-[11px] font-bold text-white">2</span></div>
  if (rank === 3) return <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0"><span className="text-[11px] font-bold text-white">3</span></div>
  return <span className="text-sm font-medium text-gray-400 w-6 text-center flex-shrink-0">{rank}</span>
}

function QuickAccess({ navigate, totalUsers }) {
  const items = [
    {
      label: 'Usuarios',
      sub: totalUsers > 0 ? `${totalUsers} TSDs activos` : 'Gestión de usuarios',
      to: '/admin/usuarios',
      icon: <svg className="w-6 h-6 text-kof-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      label: 'Rutinas',
      sub: 'Ver tareas activas',
      to: '/admin/tareas',
      icon: <svg className="w-6 h-6 text-kof-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    },
    {
      label: 'VoBo',
      sub: 'Bandeja de revisión',
      to: '/admin/vobo',
      icon: <svg className="w-6 h-6 text-kof-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: 'Nueva rutina',
      sub: 'Crear rápido',
      to: '/admin/tareas',
      highlight: true,
      icon: <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(item => (
        <button key={item.to + item.label} onClick={() => navigate(item.to)}
          className={[
            'flex items-center gap-3 p-4 rounded-2xl border transition-all group text-left',
            item.highlight
              ? 'bg-kof-red border-kof-red shadow-md shadow-kof-red/20 hover:bg-kof-red-dark'
              : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200',
          ].join(' ')}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${item.highlight ? 'bg-white/20' : 'bg-kof-red/8'}`}>
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold truncate ${item.highlight ? 'text-white' : 'text-gray-800'}`}>{item.label}</p>
            <p className={`text-xs mt-0.5 ${item.highlight ? 'text-white/70' : 'text-gray-400'}`}>{item.sub}</p>
          </div>
          <svg className={`w-4 h-4 ml-auto flex-shrink-0 ${item.highlight ? 'text-white/50' : 'text-gray-200 group-hover:text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      ))}
    </div>
  )
}

function ProximosVencer({ items, loading }) {
  return (
    <SectionCard title="Próximos a vencer" count={items.length} loading={loading}>
      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">Sin tareas próximas a vencer</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map(item => {
            const cd = countdown(item.vence)
            return (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                <Avatar nombre={item.tsd} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.rutina}</p>
                  <p className="text-xs text-gray-400 truncate">{item.tsd} · <span className="font-medium text-gray-500">{item.uo}</span></p>
                </div>
                <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${CD_STYLES[cd.level]}`}>
                  {cd.text}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

function TareasVencidas({ items, loading }) {
  return (
    <SectionCard title="Tareas vencidas" count={items.length} loading={loading}>
      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-emerald-600 font-semibold">Sin tareas vencidas</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
              <Avatar nombre={item.tsd} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.rutina}</p>
                <p className="text-xs text-gray-400 truncate">{item.tsd} · <span className="font-medium text-gray-500">{item.uo}</span></p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-xs font-bold text-kof-red bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                  +{daysLate(item.vencio)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function RankingTSDs({ tsds, loading }) {
  return (
    <SectionCard title="Ranking de desempeño" loading={loading}>
      {tsds.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">Sin datos de TSDs aún</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-10">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide min-w-[160px]">% Cumplimiento</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Completadas</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Vencidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tsds.map((item, i) => (
                <tr key={item.id ?? item.nombre} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3"><Medal rank={i + 1} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar nombre={item.nombre} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{item.nombre}</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{item.uo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.total === 0 ? (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Sin asignar</span>
                    ) : (
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${pctBarColor(item.pct)}`} style={{ width: `${item.pct}%` }} />
                        </div>
                        <span className={`text-sm font-bold flex-shrink-0 w-10 text-right ${pctTextColor(item.pct)}`}>
                          {item.pct}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-600 text-right">{item.comp}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-bold ${item.venc > 0 ? 'text-kof-red' : 'text-gray-300'}`}>
                      {item.venc}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

function AlertasInactividad({ items, loading }) {
  return (
    <SectionCard title="Alertas de inactividad" count={items.length} loading={loading}>
      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-emerald-600 font-semibold">Todos los TSDs activos recientemente</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map(item => (
            <div key={item.nombre} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
              <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-0.5" />
              <Avatar nombre={item.nombre} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.nombre}</p>
                <p className="text-xs text-gray-400">{item.uo}</p>
              </div>
              <span className="flex-shrink-0 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                {lastSeen(item.ts)}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const EMPTY = { proximos: [], vencidas: [], ranking: [], inactivos: [], totalUsers: 0 }

export default function AdminDashboard() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [now, setNow] = useState(Date.now())
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  const fetch = useCallback(() => {
    setLoading(true)
    loadDashboard()
      .then(setData)
      .catch(err => console.warn('[AdminDashboard] load error:', err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const nombre    = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Ejecutivo'
  const firstName = nombre.split(' ')[0]

  return (
    <div className="p-5 md:p-8 space-y-5 md:space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, {firstName}</h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{TODAY}</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && (
            <button onClick={fetch}
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          )}
          <div className="hidden md:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En línea
          </div>
        </div>
      </div>

      {/* Accesos directos */}
      <QuickAccess navigate={navigate} totalUsers={data.totalUsers} />

      {/* Próximos a vencer + Vencidas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-6">
        <ProximosVencer items={data.proximos} loading={loading} />
        <TareasVencidas items={data.vencidas} loading={loading} />
      </div>

      {/* Ranking */}
      <RankingTSDs tsds={data.ranking} loading={loading} />

      {/* Inactividad */}
      <AlertasInactividad items={data.inactivos} loading={loading} />

    </div>
  )
}
