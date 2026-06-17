import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useField, getStatus, getUrgencyLevel, URGENCY_STYLE, formatDeadline } from '../../context/FieldContext'

// ─── Constantes y helpers ─────────────────────────────────────────────────────

const PERIODICIDAD_STYLE = {
  Diario: 'bg-rose-100 text-rose-700',        Semanal: 'bg-orange-100 text-orange-700',
  Quincenal: 'bg-amber-100 text-amber-700',    Mensual: 'bg-blue-100 text-blue-700',
  Trimestral: 'bg-violet-100 text-violet-700', Semestral: 'bg-purple-100 text-purple-700',
  Anual: 'bg-gray-100 text-gray-600',          Bimensual: 'bg-indigo-100 text-indigo-700',
  'Cada 3 semanas': 'bg-yellow-100 text-yellow-700',
}

const FILE_TYPE_ICONS = {
  PDF:   { bg: 'bg-red-100',    text: 'text-red-700',    label: 'PDF'  },
  Excel: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'XLS'  },
  Word:  { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'DOC'  },
  Video: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'VID'  },
  Foto:  { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'IMG'  },
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatCompletedAt(ts) {
  const dt = new Date(ts)
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(dt)
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function DocChip({ nombre, tipo }) {
  const style = FILE_TYPE_ICONS[tipo] ?? FILE_TYPE_ICONS.PDF
  return (
    <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
      <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
        <span className={`text-[10px] font-bold ${style.text}`}>{style.label}</span>
      </div>
      <p className="text-xs font-medium text-gray-700 truncate flex-1">{nombre}</p>
      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </div>
  )
}

function EvidenciaPreview({ item, onRemove }) {
  const isImage = item.tipo === 'image'
  return (
    <div className="relative group">
      {isImage ? (
        <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
          <img src={item.preview} alt={item.nombre} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-20 h-20 rounded-xl border border-gray-100 bg-gray-50 flex flex-col items-center justify-center flex-shrink-0 gap-1 px-1">
          <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
            <span className="text-[10px] font-bold text-gray-500">
              {item.nombre.split('.').pop()?.toUpperCase().slice(0, 3)}
            </span>
          </div>
          <span className="text-[9px] text-gray-400 text-center leading-tight line-clamp-2 w-full px-1">
            {item.nombre}
          </span>
        </div>
      )}
      {/* Botón eliminar */}
      {onRemove && (
        <button onClick={() => onRemove(item.id)}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-kof-red text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TaskDetail() {
  const { id }           = useParams()
  const navigate         = useNavigate()
  const { tasks, completeTask } = useField()

  const task = tasks.find(t => t.id === Number(id))

  const [evidencias,  setEvidencias]  = useState([])
  const [comentario,  setComentario]  = useState('')
  const [completing,  setCompleting]  = useState(false)
  const [done,        setDone]        = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const cameraRef  = useRef(null)
  const galleryRef = useRef(null)
  const fileRef    = useRef(null)

  // Trigger success animation after state update
  useEffect(() => {
    if (done) {
      const t1 = setTimeout(() => setShowSuccess(true), 50)
      const t2 = setTimeout(() => navigate('/app/tareas', { replace: true }), 2000)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [done, navigate])

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-8">
        <p className="text-sm font-semibold text-gray-500">Tarea no encontrada</p>
        <button onClick={() => navigate('/app/tareas')} className="mt-4 text-kof-red text-sm font-semibold">
          ← Volver a mis tareas
        </button>
      </div>
    )
  }

  const status = getStatus(task)
  const level  = getUrgencyLevel(task)
  const isCompleted = status === 'completada'

  function handleMedia(e) {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setEvidencias(prev => [...prev, {
        id: Date.now() + Math.random(),
        nombre: file.name,
        tipo: file.type.startsWith('image/') ? 'image' : 'file',
        size: file.size,
        preview: ev.target.result,
      }])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function removeEvidencia(itemId) {
    setEvidencias(prev => prev.filter(e => e.id !== itemId))
  }

  async function handleComplete() {
    if (completing || done) return
    setCompleting(true)
    await new Promise(r => setTimeout(r, 300))
    completeTask(task.id, { evidencias, comentario })
    setDone(true)
  }

  return (
    <>
      {/* Overlay de éxito */}
      {done && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
          <div className={`transition-all duration-500 ease-out ${showSuccess ? 'scale-100 opacity-100' : 'scale-50 opacity-0'} flex flex-col items-center`}>
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
              <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xl font-bold text-gray-800">¡Tarea completada!</p>
            <p className="text-sm text-gray-400 mt-2">Regresando a tus tareas…</p>
          </div>
        </div>
      )}

      {/* Inputs ocultos para evidencia */}
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleMedia} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleMedia} />
      <input ref={fileRef}    type="file" accept=".pdf,.xlsx,.xls,.docx,.doc,.mp4,.mov,.avi" multiple className="hidden" onChange={handleMedia} />

      <div className="flex flex-col min-h-full">

        {/* Botón volver */}
        <div className="sticky top-0 z-10 bg-kof-bg px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-semibold text-kof-red">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Mis tareas
          </button>
        </div>

        <div className="flex-1 px-4 py-4 space-y-5">

          {/* Cabecera de la tarea */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${PERIODICIDAD_STYLE[task.periodicidad] ?? 'bg-gray-100 text-gray-400'}`}>
                {task.periodicidad}
              </span>
              {task.requiereVobo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                  Requiere VoBo
                </span>
              )}
            </div>

            <h1 className="text-lg font-bold text-gray-900 leading-snug">{task.nombre}</h1>
            <p className="text-sm text-gray-500 leading-relaxed">{task.descripcion}</p>

            {/* Deadline */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${URGENCY_STYLE[level]}`}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold">
                {isCompleted
                  ? `Completada el ${formatCompletedAt(task.completadaEn)}`
                  : formatDeadline(task.fechaLimite)}
              </span>
            </div>

            {/* Aviso VoBo */}
            {task.requiereVobo && !isCompleted && (
              <div className="flex items-start gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
                <svg className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-purple-700 leading-snug">
                  Esta tarea requiere aprobación de tu ejecutivo (VoBo) antes de cerrarse.
                </p>
              </div>
            )}
          </div>

          {/* Material de apoyo */}
          {task.materialApoyo?.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 px-1">
                Material de apoyo
              </h2>
              <div className="space-y-2">
                {task.materialApoyo.map((doc, i) => (
                  <DocChip key={i} nombre={doc.nombre} tipo={doc.tipo} />
                ))}
              </div>
            </div>
          )}

          {/* Sección de evidencia */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Evidencia</h2>
              {task.evidenciasRequeridas.length > 0 && (
                <div className="flex gap-1">
                  {task.evidenciasRequeridas.map(tipo => {
                    const s = FILE_TYPE_ICONS[tipo] ?? FILE_TYPE_ICONS.PDF
                    return (
                      <span key={tipo} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${s.bg} ${s.text}`}>
                        {tipo}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
              {/* Botones de carga (solo si no completada) */}
              {!isCompleted && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Cámara', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z', ref: cameraRef },
                    { label: 'Galería', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', ref: galleryRef },
                    { label: 'Archivo', icon: 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13', ref: fileRef },
                  ].map(btn => (
                    <button key={btn.label} onClick={() => btn.ref.current?.click()}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-kof-red/5 border border-kof-red/10 hover:bg-kof-red/10 active:scale-95 transition-all">
                      <svg className="w-5 h-5 text-kof-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={btn.icon} />
                      </svg>
                      <span className="text-[11px] font-semibold text-kof-red">{btn.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Vista previa de archivos */}
              {(isCompleted ? task.evidencias : evidencias).length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {(isCompleted ? task.evidencias : evidencias).map(item => (
                    <EvidenciaPreview
                      key={item.id}
                      item={item}
                      onRemove={isCompleted ? null : removeEvidencia}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <svg className="w-8 h-8 text-gray-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-400">
                    {isCompleted ? 'Sin evidencia registrada' : 'Sube fotos o archivos como evidencia'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Comentarios */}
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 px-1">
              Comentarios {!isCompleted && <span className="normal-case font-normal text-gray-400">(opcional)</span>}
            </h2>
            {isCompleted ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
                <p className="text-sm text-gray-600">{task.comentario || <span className="text-gray-400 italic">Sin comentarios</span>}</p>
              </div>
            ) : (
              <textarea
                className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-kof-red focus:border-transparent resize-none"
                rows={3}
                placeholder="Agrega observaciones o notas sobre esta tarea…"
                value={comentario}
                onChange={e => setComentario(e.target.value)}
              />
            )}
          </div>

          {/* Botón completar */}
          {!isCompleted && (
            <div className="pb-2">
              <button onClick={handleComplete} disabled={completing || done}
                className="w-full bg-kof-red text-white font-bold py-4 rounded-2xl shadow-md shadow-kof-red/25 hover:bg-kof-red-dark active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {completing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registrando…
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Marcar como completada
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
