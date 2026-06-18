import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  useField, getStatus, getUrgencyLevel, urgencyLabel,
  URGENCY_STYLE, formatDeadline,
} from '../../context/FieldContext'

const PERIODICIDAD_STYLE = {
  Diario: 'bg-rose-100 text-rose-700',        Semanal: 'bg-orange-100 text-orange-700',
  Quincenal: 'bg-amber-100 text-amber-700',    Mensual: 'bg-blue-100 text-blue-700',
  Trimestral: 'bg-violet-100 text-violet-700', Semestral: 'bg-purple-100 text-purple-700',
  Anual: 'bg-gray-100 text-gray-600',          Bimensual: 'bg-indigo-100 text-indigo-700',
  'Cada 3 semanas': 'bg-yellow-100 text-yellow-700',
}

function TaskRow({ task, onClick }) {
  const level  = getUrgencyLevel(task)
  const status = getStatus(task)
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 bg-white px-4 py-3.5 text-left active:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
      {/* Dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        status === 'completada' ? 'bg-emerald-400'
        : status === 'vencida'  ? 'bg-kof-red'
        : level === 'urgent'    ? 'bg-kof-red'
        : level === 'warning'   ? 'bg-amber-400' : 'bg-blue-400'
      }`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug truncate ${
          status === 'completada' ? 'text-gray-400 line-through' : 'text-gray-800'
        }`}>{task.nombre}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PERIODICIDAD_STYLE[task.periodicidad] ?? 'bg-gray-100 text-gray-400'}`}>
            {task.periodicidad}
          </span>
          <span className="text-[11px] text-gray-400">{formatDeadline(task.fechaLimite)}</span>
        </div>
      </div>

      {/* Badge */}
      <span className={`flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full border ${URGENCY_STYLE[level]}`}>
        {urgencyLabel(task)}
      </span>

      {/* Chevron */}
      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

function SectionHeader({ label, count, color }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2 ${color}`}>
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold opacity-70">{count}</span>
    </div>
  )
}

export default function Tareas() {
  const { tasks, usingMock } = useField()
  const navigate   = useNavigate()
  const location   = useLocation()
  const [search, setSearch] = useState('')

  const vencidasRef    = useRef(null)
  const pendientesRef  = useRef(null)
  const completadasRef = useRef(null)

  // Scroll a la sección indicada por el chip del dashboard
  useEffect(() => {
    const filtro = location.state?.filtro
    if (!filtro) return
    const refMap = { vencidas: vencidasRef, pendientes: pendientesRef, completadas: completadasRef }
    const ref = refMap[filtro]
    const timer = setTimeout(() => {
      ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => clearTimeout(timer)
  }, [location.state?.filtro])

  const q = search.toLowerCase()
  const visible = tasks.filter(t => t.nombre.toLowerCase().includes(q))

  const vencidas    = visible.filter(t => getStatus(t) === 'vencida')
  const pendientes  = visible.filter(t => getStatus(t) === 'pendiente')
  const completadas = visible.filter(t => getStatus(t) === 'completada')

  // sort each group by fechaLimite
  vencidas.sort((a, b) => a.fechaLimite - b.fechaLimite)   // oldest overdue first
  pendientes.sort((a, b) => a.fechaLimite - b.fechaLimite)
  completadas.sort((a, b) => (b.completadaEn ?? 0) - (a.completadaEn ?? 0)) // most recent first

  function go(id) { navigate(`/app/tareas/${id}`) }

  return (
    <div className="flex flex-col">

      {/* Banner modo offline */}
      {usingMock && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs font-semibold text-amber-700">Modo sin conexión — mostrando tareas de ejemplo</p>
        </div>
      )}

      {/* Buscador */}
      <div className="sticky top-0 z-10 bg-kof-bg px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-kof-red focus:border-transparent"
            placeholder="Buscar tarea…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-t-2xl mt-2 mx-3 overflow-hidden shadow-sm border border-gray-100">

        {/* Vencidas */}
        {vencidas.length > 0 && (
          <div ref={vencidasRef}>
            <SectionHeader label="Vencidas" count={vencidas.length} color="bg-red-50 text-kof-red" />
            {vencidas.map(t => <TaskRow key={t.id} task={t} onClick={() => go(t.id)} />)}
          </div>
        )}

        {/* Pendientes */}
        {pendientes.length > 0 && (
          <div ref={pendientesRef} className={vencidas.length > 0 ? 'border-t border-gray-100' : ''}>
            <SectionHeader label="Pendientes" count={pendientes.length} color="bg-blue-50 text-blue-700" />
            {pendientes.map(t => <TaskRow key={t.id} task={t} onClick={() => go(t.id)} />)}
          </div>
        )}

        {/* Completadas */}
        {completadas.length > 0 && (
          <div ref={completadasRef} className={(vencidas.length > 0 || pendientes.length > 0) ? 'border-t border-gray-100' : ''}>
            <SectionHeader label="Completadas" count={completadas.length} color="bg-emerald-50 text-emerald-700" />
            {completadas.map(t => <TaskRow key={t.id} task={t} onClick={() => go(t.id)} />)}
          </div>
        )}

        {visible.length === 0 && (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-gray-500">Sin resultados</p>
            <p className="text-xs text-gray-400 mt-1">Intenta con otro término de búsqueda.</p>
          </div>
        )}
      </div>

      {/* Contador total */}
      <p className="text-center text-xs text-gray-400 py-4">
        {tasks.length} rutinas asignadas
      </p>

    </div>
  )
}
