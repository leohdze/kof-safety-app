import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useField, getStatus } from '../../context/FieldContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PERIO_STYLE = {
  Diario: 'bg-rose-100 text-rose-700',        Semanal: 'bg-orange-100 text-orange-700',
  Quincenal: 'bg-amber-100 text-amber-700',    Mensual: 'bg-blue-100 text-blue-700',
  Trimestral: 'bg-violet-100 text-violet-700', Semestral: 'bg-purple-100 text-purple-700',
  Anual: 'bg-gray-100 text-gray-600',          Bimensual: 'bg-indigo-100 text-indigo-700',
}

const EV_ICON = {
  image: { bg: 'bg-blue-50 text-blue-500',        label: 'IMG' },
  pdf:   { bg: 'bg-red-50 text-red-500',          label: 'PDF' },
  excel: { bg: 'bg-emerald-50 text-emerald-600',  label: 'XLS' },
  word:  { bg: 'bg-indigo-50 text-indigo-500',    label: 'DOC' },
  video: { bg: 'bg-purple-50 text-purple-500',    label: 'VID' },
  jpg: { bg: 'bg-blue-50 text-blue-500', label: 'IMG' },
  jpeg: { bg: 'bg-blue-50 text-blue-500', label: 'IMG' },
  png: { bg: 'bg-blue-50 text-blue-500', label: 'IMG' },
  heic: { bg: 'bg-blue-50 text-blue-500', label: 'IMG' },
  pdf_ext: { bg: 'bg-red-50 text-red-500', label: 'PDF' },
  xlsx: { bg: 'bg-emerald-50 text-emerald-600', label: 'XLS' },
  xls: { bg: 'bg-emerald-50 text-emerald-600', label: 'XLS' },
  docx: { bg: 'bg-indigo-50 text-indigo-500', label: 'DOC' },
  doc: { bg: 'bg-indigo-50 text-indigo-500', label: 'DOC' },
  mp4: { bg: 'bg-purple-50 text-purple-500', label: 'VID' },
  mov: { bg: 'bg-purple-50 text-purple-500', label: 'VID' },
}

function getEvidIcon(ev) {
  // ev from DB: { file_type: 'jpg' } | ev from FieldContext: { tipo: 'image' }
  const key = ev.file_type ?? ev.tipo ?? ''
  return EV_ICON[key] ?? { bg: 'bg-gray-100 text-gray-500', label: 'FILE' }
}

function isImageType(ev) {
  const t = ev.file_type ?? ev.tipo ?? ''
  return ['jpg','jpeg','png','heic','gif','webp','image'].includes(t)
}

function fmtCompletedAt(ms) {
  if (!ms) return ''
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(ms))
}

// ─── EvidenciaChip ─────────────────────────────────────────────────────────────

function EvidenciaChip({ ev }) {
  const s = getEvidIcon(ev)
  if (isImageType(ev) && (ev.file_url || ev.preview)) {
    return (
      <a href={ev.file_url || ev.preview} target="_blank" rel="noreferrer"
        className="w-8 h-8 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 block">
        <img src={ev.file_url || ev.preview} alt={ev.file_name || ev.nombre} className="w-full h-full object-cover" />
      </a>
    )
  }
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${s.bg}`}>{s.label}</span>
  )
}

// ─── Tarjeta de tarea completada ──────────────────────────────────────────────

function TaskCard({ task, evidencias, onClick }) {
  const count = evidencias?.length ?? task.evidencias?.length ?? 0
  return (
    <button onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left active:scale-[0.98] transition-transform">
      <div className="flex items-start gap-3">
        {/* Check icon */}
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-800 leading-snug">{task.nombre}</p>
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PERIO_STYLE[task.periodicidad] ?? 'bg-gray-100 text-gray-400'}`}>
              {task.periodicidad}
            </span>
            {task.completadaEn && (
              <span className="text-[11px] text-gray-400">{fmtCompletedAt(task.completadaEn)}</span>
            )}
          </div>

          {/* Evidencias preview */}
          {count > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5">
              {/* Show up to 4 items then a +N */}
              {(evidencias ?? task.evidencias ?? []).slice(0, 4).map((ev, i) => (
                <EvidenciaChip key={i} ev={ev} />
              ))}
              {count > 4 && (
                <span className="text-[10px] font-semibold text-gray-400">+{count - 4}</span>
              )}
              <span className="text-[10px] text-gray-400 ml-1">
                {count} evidencia{count !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {count === 0 && (
            <p className="text-[11px] text-gray-400 mt-1.5">Sin evidencias registradas</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Historial() {
  const { tasks }  = useField()
  const { user }   = useAuth()
  const navigate   = useNavigate()

  // { [taskId]: EvidenciaDB[] } — loaded from Supabase for each completed task
  const [dbEvidMap, setDbEvidMap] = useState({})
  const [loading, setLoading]     = useState(true)

  const completadas = tasks
    .filter(t => getStatus(t) === 'completada')
    .sort((a, b) => (b.completadaEn ?? 0) - (a.completadaEn ?? 0))

  // Load evidence counts from Supabase for all completed tasks in one query
  useEffect(() => {
    if (!user?.id || completadas.length === 0) { setLoading(false); return }
    const ids = completadas.map(t => String(t.id))
    supabase
      .from('task_evidence')
      .select('*')
      .eq('user_id', user.id)
      .in('task_id', ids)
      .order('uploaded_at', { ascending: true })
      .then(({ data }) => {
        if (!data) { setLoading(false); return }
        const map = {}
        data.forEach(row => {
          if (!map[row.task_id]) map[row.task_id] = []
          map[row.task_id].push(row)
        })
        setDbEvidMap(map)
        setLoading(false)
      })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col">

      {/* Buscador header */}
      <div className="sticky top-0 z-10 bg-kof-bg px-4 py-3 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">Historial</h1>
        <p className="text-xs text-gray-400 mt-0.5">{completadas.length} tarea{completadas.length !== 1 ? 's' : ''} completada{completadas.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="p-4 space-y-3">
        {completadas.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">Sin tareas completadas</p>
            <p className="text-xs text-gray-400 mt-1">Las tareas que completes aparecerán aquí.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-kof-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          completadas.map(task => {
            // Prefer DB evidence, fallback to in-memory
            const dbEvid = dbEvidMap[String(task.id)]
            const evidencias = dbEvid?.length > 0 ? dbEvid : (task.evidencias?.length > 0 ? task.evidencias : null)
            return (
              <TaskCard
                key={task.id}
                task={task}
                evidencias={evidencias}
                onClick={() => navigate(`/app/tareas/${task.id}`)}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
