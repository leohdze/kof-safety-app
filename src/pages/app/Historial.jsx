import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PERIO_STYLE = {
  Diario: 'bg-rose-100 text-rose-700',        Semanal: 'bg-orange-100 text-orange-700',
  Quincenal: 'bg-amber-100 text-amber-700',    Mensual: 'bg-blue-100 text-blue-700',
  Trimestral: 'bg-violet-100 text-violet-700', Semestral: 'bg-purple-100 text-purple-700',
  Anual: 'bg-gray-100 text-gray-600',          Bimensual: 'bg-indigo-100 text-indigo-700',
  'Cada 3 semanas': 'bg-yellow-100 text-yellow-700',
}

const EV_ICON = {
  jpg: 'bg-blue-50 text-blue-500', jpeg: 'bg-blue-50 text-blue-500',
  png: 'bg-blue-50 text-blue-500', heic: 'bg-blue-50 text-blue-500',
  gif: 'bg-blue-50 text-blue-500', webp: 'bg-blue-50 text-blue-500',
  pdf: 'bg-red-50 text-red-500',
  xlsx: 'bg-emerald-50 text-emerald-600', xls: 'bg-emerald-50 text-emerald-600',
  docx: 'bg-indigo-50 text-indigo-500',   doc: 'bg-indigo-50 text-indigo-500',
  mp4: 'bg-purple-50 text-purple-500',    mov: 'bg-purple-50 text-purple-500',
}

const IMG_EXTS = new Set(['jpg','jpeg','png','heic','gif','webp'])

function isImg(ext) { return IMG_EXTS.has(ext ?? '') }

function fmtDate(ms) {
  if (!ms) return ''
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(ms))
}

function normalizeCompletion(c) {
  return {
    id:           c.id,
    assignmentId: c.assignment_id,
    nombre:       c.tasks?.title      ?? '',
    periodicidad: c.tasks?.periodicity ?? '',
    clasificacion: c.tasks?.classification ?? '',
    completadaEn: c.completed_at ? new Date(c.completed_at).getTime() : null,
    isOnTime:     c.is_on_time,
    voboStatus:   c.vobo_status,
    comentario:   c.comments ?? '',
    evidencias:   (c.task_evidence ?? []).map(e => ({
      id:       e.id,
      nombre:   e.file_name,
      ext:      e.file_type ?? '',
      url:      e.file_url,
      size:     e.file_size,
      isImage:  isImg(e.file_type),
    })),
  }
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function EvidChip({ ev }) {
  const cls = EV_ICON[ev.ext] ?? 'bg-gray-100 text-gray-500'
  const label = isImg(ev.ext) ? 'IMG'
    : ev.ext === 'pdf' ? 'PDF'
    : ['xlsx','xls'].includes(ev.ext) ? 'XLS'
    : ['docx','doc'].includes(ev.ext) ? 'DOC'
    : ['mp4','mov'].includes(ev.ext) ? 'VID' : 'FILE'

  if (ev.isImage && ev.url) {
    return (
      <a href={ev.url} target="_blank" rel="noreferrer"
        className="w-8 h-8 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 block">
        <img src={ev.url} alt={ev.nombre} className="w-full h-full object-cover" />
      </a>
    )
  }
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${cls}`}>{label}</span>
  )
}

function TaskCard({ item, onClick }) {
  const count = item.evidencias.length
  const voboLabel = item.voboStatus === 'approved' ? '✓ VoBo' : item.voboStatus === 'pending' ? 'VoBo pend.' : null

  return (
    <button onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left active:scale-[0.98] transition-transform">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-800 leading-snug">{item.nombre}</p>
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {item.periodicidad && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PERIO_STYLE[item.periodicidad] ?? 'bg-gray-100 text-gray-400'}`}>
                {item.periodicidad}
              </span>
            )}
            {item.isOnTime !== null && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                item.isOnTime ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {item.isOnTime ? 'En tiempo' : 'Fuera de tiempo'}
              </span>
            )}
            {voboLabel && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                item.voboStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'
              }`}>
                {voboLabel}
              </span>
            )}
            {item.completadaEn && (
              <span className="text-[11px] text-gray-400">{fmtDate(item.completadaEn)}</span>
            )}
          </div>

          {count > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5">
              {item.evidencias.slice(0, 4).map((ev, i) => (
                <EvidChip key={ev.id ?? i} ev={ev} />
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
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    supabase
      .from('task_completions')
      .select(`
        id, assignment_id, completed_at, is_on_time, comments, vobo_status,
        tasks ( id, title, periodicity, classification ),
        task_evidence ( id, file_url, file_name, file_type, file_size )
      `)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.warn('[Historial] Supabase error:', error.message)
          setItems([])
        } else {
          setItems((data ?? []).map(normalizeCompletion))
        }
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  return (
    <div className="flex flex-col">

      <div className="sticky top-0 z-10 bg-kof-bg px-4 py-3 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">Historial</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {items.length} tarea{items.length !== 1 ? 's' : ''} completada{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-kof-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">Sin tareas completadas</p>
            <p className="text-xs text-gray-400 mt-1">Las tareas que completes aparecerán aquí.</p>
          </div>
        ) : (
          items.map(item => (
            <TaskCard
              key={item.id}
              item={item}
              onClick={() => navigate(`/app/tareas/${item.assignmentId}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}
