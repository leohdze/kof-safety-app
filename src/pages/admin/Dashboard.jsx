import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// ─── Mock data ────────────────────────────────────────────────────────────────

const H    = 3600000
const D    = 86400000
const BASE = Date.now()

const PROXIMOS = [
  { id: 1, rutina: 'Inspección de extintores',          tsd: 'Benjamin Torres Tapia',          uo: 'Coecillo',            vence: BASE + 47   * H },
  { id: 2, rutina: 'Revisión de EPP',                   tsd: 'Cristina Rodriguez Valdez',       uo: 'Pacífico',            vence: BASE + 31   * H },
  { id: 3, rutina: 'Check-list de vehículos',           tsd: 'Gustavo Sanchez Avendaño',        uo: 'Atlihuetzía',         vence: BASE + 22   * H },
  { id: 4, rutina: 'Auditoría de botiquines',           tsd: 'Eder Luis Hernandez Alcocer',     uo: 'KM17',                vence: BASE + 9    * H },
  { id: 5, rutina: 'Revisión de señalética',            tsd: 'Andrea Gadiel Corona Hernandez',  uo: 'Renacimiento',        vence: BASE + 4    * H },
  { id: 6, rutina: 'Limpieza y orden 5S',               tsd: 'Mayra del Carmen Ramirez Tavera', uo: 'Polvorín',            vence: BASE + 1.5  * H },
]

const VENCIDAS = [
  { id: 1, rutina: 'Evaluación de riesgos trimestral',  tsd: 'Teresa Castro Hernandez',         uo: 'Tlapa',               vencio: BASE - 1 * D },
  { id: 2, rutina: 'Simulacro de evacuación',           tsd: 'Oscar Eduardo Brito Bustillos',   uo: 'Chilpancingo',        vencio: BASE - 2 * D },
  { id: 3, rutina: 'Prueba de sistemas incendio',       tsd: 'Bernardo Galvez Altamirano',      uo: 'Ciel Puebla',         vencio: BASE - 3 * D },
  { id: 4, rutina: 'Revisión de procedimientos',        tsd: 'Alan Miguel Irigoyen',            uo: 'Puebla Norte',        vencio: BASE - 5 * D },
]

const RANKING_TSDS = [
  { nombre: 'Cristina Rodriguez Valdez',        uo: 'Pacífico',                    pct: 98, comp: 47, venc: 1  },
  { nombre: 'Daniela Nava Gomez',               uo: 'Tenango, Ixtapan, Tejupilco', pct: 95, comp: 52, venc: 2  },
  { nombre: 'Benjamin Torres Tapia',            uo: 'Coecillo',                    pct: 94, comp: 45, venc: 2  },
  { nombre: 'Jose Angel Lopez Ortega',          uo: 'Litos Toluca',                pct: 91, comp: 39, venc: 3  },
  { nombre: 'Hector M. Hernandez Jaimes',       uo: 'Progreso, Cuernavaca',        pct: 89, comp: 41, venc: 5  },
  { nombre: 'Gustavo Sanchez Avendaño',         uo: 'Atlihuetzía',                 pct: 87, comp: 38, venc: 5  },
  { nombre: 'Eder Luis Hernandez Alcocer',      uo: 'KM17, Cuauhtémoc',            pct: 85, comp: 36, venc: 5  },
  { nombre: 'Jesus F. Juarez Hernandez',        uo: 'Huetamo, Valle de Bravo',     pct: 84, comp: 35, venc: 6  },
  { nombre: 'Andrea Gadiel Corona Hernandez',   uo: 'Cayaco, Renacimiento, Tecpan',pct: 82, comp: 34, venc: 7  },
  { nombre: 'Mayra del C. Ramirez Tavera',      uo: 'Polvorín, Puente de Ixtla',   pct: 80, comp: 33, venc: 8  },
  { nombre: 'Alma Jessica Vidal Peñaloza',      uo: 'Taxco, Huitzuco, Iguala',     pct: 78, comp: 32, venc: 9  },
  { nombre: 'Carlos E. Herrera Cortes',         uo: 'Mega Puebla',                 pct: 76, comp: 31, venc: 9  },
  { nombre: 'Bernardo Galvez Altamirano',       uo: 'Ciel Puebla',                 pct: 74, comp: 30, venc: 10 },
  { nombre: 'Jose Carlos Juarez Gutierrez',     uo: 'Puebla Sur',                  pct: 72, comp: 29, venc: 11 },
  { nombre: 'Alan Miguel Irigoyen',             uo: 'Puebla Norte, Matamoros',     pct: 70, comp: 28, venc: 12 },
  { nombre: 'Teresa Castro Hernandez',          uo: 'Tlapa, Chilapa',              pct: 65, comp: 25, venc: 13 },
  { nombre: 'Oscar Eduardo Brito Bustillos',    uo: 'Tierra Colorada, Chilpancingo',pct: 60, comp: 23, venc: 15 },
]

const RANKING_INSTRUCTORES = Array.from({ length: 8 }, (_, i) => ({
  nombre: `Instructor ${i + 1}`,
  uo: '—',
  pct: 0, comp: 0, venc: 0,
  pendiente: true,
}))

const INACTIVIDAD = [
  { nombre: 'Oscar Eduardo Brito Bustillos', uo: 'Chilpancingo', ts: BASE - 5   * D },
  { nombre: 'Teresa Castro Hernandez',       uo: 'Tlapa',        ts: BASE - 4   * D },
  { nombre: 'Alan Miguel Irigoyen',          uo: 'Puebla Norte', ts: BASE - 3.2 * D },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function initials(n) {
  return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const TODAY = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date())

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function SectionCard({ title, count, action, children }) {
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
      {children}
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

// ─── Secciones ───────────────────────────────────────────────────────────────

function QuickAccess({ navigate }) {
  const items = [
    {
      label: 'Usuarios',
      sub: '27 usuarios',
      to: '/admin/usuarios',
      icon: <svg className="w-6 h-6 text-kof-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      label: 'Rutinas',
      sub: '22 rutinas activas',
      to: '/admin/rutinas',
      icon: <svg className="w-6 h-6 text-kof-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    },
    {
      label: 'Reportes',
      sub: 'Próximamente',
      to: '/admin/reportes',
      icon: <svg className="w-6 h-6 text-kof-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
    {
      label: 'Nueva rutina',
      sub: 'Crear rápido',
      to: '/admin/rutinas',
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

function ProximosVencer({ now }) {
  return (
    <SectionCard title="Próximos a vencer" count={PROXIMOS.length}>
      <div className="divide-y divide-gray-50">
        {PROXIMOS.map(item => {
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
    </SectionCard>
  )
}

function TareasVencidas() {
  return (
    <SectionCard title="Tareas vencidas" count={VENCIDAS.length}>
      <div className="divide-y divide-gray-50">
        {VENCIDAS.map(item => (
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
    </SectionCard>
  )
}

function RankingTSDs() {
  const [tab, setTab] = useState('tsds')
  const data = tab === 'tsds' ? RANKING_TSDS : RANKING_INSTRUCTORES

  return (
    <SectionCard
      title="Ranking de desempeño"
      action={
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {[['tsds', 'TSDs'], ['instructores', 'Instructores']].map(([val, lbl]) => (
            <button key={val} onClick={() => setTab(val)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${tab === val ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {lbl}
            </button>
          ))}
        </div>
      }
    >
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
            {data.map((item, i) => (
              <tr key={item.nombre} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <Medal rank={i + 1} />
                </td>
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
                  {item.pendiente ? (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Sin asignar</span>
                  ) : (
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${pctBarColor(item.pct)}`}
                          style={{ width: `${item.pct}%` }}
                        />
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
    </SectionCard>
  )
}

function AlertasInactividad() {
  return (
    <SectionCard title="Alertas de inactividad" count={INACTIVIDAD.length}>
      <div className="divide-y divide-gray-50">
        {INACTIVIDAD.map(item => (
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
    </SectionCard>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  const nombre = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Ejecutivo'
  const firstName = nombre.split(' ')[0]

  return (
    <div className="p-5 md:p-8 space-y-5 md:space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, {firstName}</h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{TODAY}</p>
        </div>
        <div className="hidden md:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          En línea
        </div>
      </div>

      {/* Accesos directos */}
      <QuickAccess navigate={navigate} />

      {/* Próximos a vencer + Vencidas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-6">
        <ProximosVencer now={now} />
        <TareasVencidas />
      </div>

      {/* Ranking */}
      <RankingTSDs />

      {/* Inactividad */}
      <AlertasInactividad />

    </div>
  )
}
