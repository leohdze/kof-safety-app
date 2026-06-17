import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  useField, getStatus, getUrgencyLevel, urgencyLabel,
  URGENCY_STYLE, formatDeadline,
} from '../../context/FieldContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const D = 86400000

function startOfToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime()
}

function getFilteredTasks(tasks, filter) {
  const sod    = startOfToday()
  const cutoff = filter === 'hoy' ? sod + D : filter === 'semana' ? sod + 7 * D : sod + 31 * D
  return tasks
    .filter(t => getStatus(t) !== 'completada')
    .filter(t => t.fechaLimite <= cutoff)
    .sort((a, b) => a.fechaLimite - b.fechaLimite)
}

const TODAY = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long', day: 'numeric', month: 'long',
}).format(new Date())

const PERIODICIDAD_STYLE = {
  Diario: 'bg-rose-100 text-rose-700',        Semanal: 'bg-orange-100 text-orange-700',
  Quincenal: 'bg-amber-100 text-amber-700',    Mensual: 'bg-blue-100 text-blue-700',
  Trimestral: 'bg-violet-100 text-violet-700', Semestral: 'bg-purple-100 text-purple-700',
  Anual: 'bg-gray-100 text-gray-600',          Bimensual: 'bg-indigo-100 text-indigo-700',
  'Cada 3 semanas': 'bg-yellow-100 text-yellow-700',
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatChip({ label, value, color }) {
  return (
    <div className={`flex-1 flex flex-col items-center py-3 rounded-2xl ${color}`}>
      <span className="text-2xl font-bold leading-none">{value}</span>
      <span className="text-[10px] font-semibold mt-1 opacity-75 text-center leading-tight">{label}</span>
    </div>
  )
}

function TaskCard({ task, onClick }) {
  const level = getUrgencyLevel(task)
  return (
    <button onClick={onClick}
      className="w-full flex items-start gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left active:scale-[0.98] transition-transform">
      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
        level === 'overdue' || level === 'urgent' ? 'bg-kof-red'
        : level === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 leading-snug">{task.nombre}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PERIODICIDAD_STYLE[task.periodicidad] ?? 'bg-gray-100 text-gray-500'}`}>
            {task.periodicidad}
          </span>
          <span className="text-xs text-gray-400">{formatDeadline(task.fechaLimite)}</span>
        </div>
      </div>
      <span className={`flex-shrink-0 self-center text-xs font-bold px-2.5 py-1 rounded-full border ${URGENCY_STYLE[level]}`}>
        {urgencyLabel(task)}
      </span>
    </button>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const FILTERS = [
  { value: 'hoy',    label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes',    label: 'Este mes' },
]

export default function AppHome() {
  const { user }   = useAuth()
  const { tasks }  = useField()
  const navigate   = useNavigate()
  const [filter, setFilter] = useState('hoy')

  const nombre    = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const firstName = nombre.split(' ')[0]

  const sod = startOfToday()
  const pendientesHoy  = tasks.filter(t => getStatus(t) === 'pendiente' && t.fechaLimite >= sod && t.fechaLimite < sod + D).length
  const completadasHoy = tasks.filter(t => t.estado === 'completada'    && (t.completadaEn ?? 0) >= sod).length
  const vencidas       = tasks.filter(t => getStatus(t) === 'vencida').length

  const filtered = getFilteredTasks(tasks, filter)

  return (
    <div className="p-4 space-y-4">

      {/* Saludo */}
      <div className="pt-1">
        <h1 className="text-xl font-bold text-gray-900">Hola, {firstName}</h1>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">{TODAY}</p>
      </div>

      {/* Estadísticas */}
      <div className="flex gap-2.5">
        <StatChip label="Pendientes hoy" value={pendientesHoy} color="bg-blue-50 text-blue-700" />
        <StatChip label="Completadas"    value={completadasHoy} color="bg-emerald-50 text-emerald-700" />
        <StatChip label="Vencidas"       value={vencidas}
          color={vencidas > 0 ? 'bg-red-50 text-kof-red' : 'bg-gray-50 text-gray-400'} />
      </div>

      {/* Filtros */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              filter === f.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">¡Todo al día!</p>
          <p className="text-xs text-gray-400 mt-1">No hay tareas pendientes para este período.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(task => (
            <TaskCard key={task.id} task={task}
              onClick={() => navigate(`/app/tareas/${task.id}`)} />
          ))}
        </div>
      )}

    </div>
  )
}
