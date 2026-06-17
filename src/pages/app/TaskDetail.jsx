/*
 * SQL — ejecutar en Supabase Dashboard → SQL Editor
 * ─────────────────────────────────────────────────
 * create table task_evidence (
 *   id          uuid default gen_random_uuid() primary key,
 *   task_id     text not null,
 *   user_id     uuid references auth.users not null,
 *   file_url    text not null,
 *   file_name   text not null,
 *   file_type   text not null,
 *   file_size   integer,
 *   uploaded_at timestamptz default now()
 * );
 * alter table task_evidence enable row level security;
 * create policy "Users can insert own evidence"
 *   on task_evidence for insert with check (auth.uid() = user_id);
 * create policy "Users can read own evidence"
 *   on task_evidence for select using (auth.uid() = user_id);
 * create policy "Executives can read all evidence"
 *   on task_evidence for select using (
 *     (auth.jwt() -> 'app_metadata' ->> 'role') = 'executive'
 *   );
 *
 * Storage — en Supabase Dashboard → Storage
 * ──────────────────────────────────────────
 * 1. Crear bucket "evidencias" y marcarlo como Public.
 * 2. En Policies del bucket agregar:
 *    INSERT: allow authenticated users
 *      check: bucket_id = 'evidencias' and auth.role() = 'authenticated'
 *    DELETE: allow owner
 *      using: bucket_id = 'evidencias'
 *             and auth.uid()::text = (storage.foldername(name))[1]
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  useField, getStatus, getUrgencyLevel, URGENCY_STYLE, formatDeadline,
} from '../../context/FieldContext'
import { submitCompletion } from '../../services/completionService'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ACCEPTED_EXT = ['jpg','jpeg','png','heic','pdf','xlsx','xls','docx','doc','mp4','mov']
const MAX_SIZE     = 50 * 1024 * 1024  // 50 MB
const BUCKET       = 'evidencias'

const PERIODICIDAD_STYLE = {
  Diario: 'bg-rose-100 text-rose-700',        Semanal: 'bg-orange-100 text-orange-700',
  Quincenal: 'bg-amber-100 text-amber-700',    Mensual: 'bg-blue-100 text-blue-700',
  Trimestral: 'bg-violet-100 text-violet-700', Semestral: 'bg-purple-100 text-purple-700',
  Anual: 'bg-gray-100 text-gray-600',          Bimensual: 'bg-indigo-100 text-indigo-700',
  'Cada 3 semanas': 'bg-yellow-100 text-yellow-700',
}

const FILE_TYPE_LABELS = {
  PDF: 'PDF', Excel: 'XLS', Word: 'DOC', Video: 'VID', Foto: 'IMG',
}

function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatCompletedAt(ts) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts))
}

function fileExt(nombre) {
  return nombre.split('.').pop().toLowerCase()
}

function isImageExt(ext) {
  return ['jpg','jpeg','png','heic','gif','webp'].includes(ext)
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function DocChip({ nombre, tipo }) {
  const label = FILE_TYPE_LABELS[tipo] ?? tipo?.toUpperCase().slice(0, 3) ?? '---'
  const colors = {
    PDF: 'bg-red-100 text-red-700',   Excel: 'bg-green-100 text-green-700',
    Word: 'bg-blue-100 text-blue-700', Video: 'bg-purple-100 text-purple-700',
    IMG: 'bg-amber-100 text-amber-700',
  }
  const cls = colors[tipo] ?? 'bg-gray-100 text-gray-600'
  return (
    <div className="flex items-center gap-2.5 bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
      <div className={`w-8 h-8 rounded-lg ${cls} flex items-center justify-center flex-shrink-0`}>
        <span className="text-[10px] font-bold">{label}</span>
      </div>
      <p className="text-xs font-medium text-gray-700 truncate flex-1">{nombre}</p>
      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </div>
  )
}

// Fila de upload: muestra progreso, error, o archivo completado (no imagen)
function UploadRow({ item, onRemove }) {
  const ext = fileExt(item.nombre).toUpperCase().slice(0, 3)
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
      item.status === 'error' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'
    }`}>
      {/* Icono izquierdo */}
      <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${
        item.status === 'uploading' ? 'bg-gray-200 animate-pulse'
        : item.status === 'error'   ? 'bg-red-100'
        : 'bg-emerald-100'
      }`}>
        {item.status === 'error' ? (
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ) : item.status === 'done' ? (
          <span className="text-[11px] font-bold text-emerald-700">{ext}</span>
        ) : null}
      </div>

      {/* Nombre + estado */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700 truncate">{item.nombre}</p>
        {item.status === 'uploading' && (
          <div className="mt-1.5">
            <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-kof-red transition-all duration-300 animate-pulse"
                style={{ width: `${Math.max(item.progress, 10)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{item.progress}% · subiendo…</p>
          </div>
        )}
        {item.status === 'error' && (
          <p className="text-[10px] text-red-600 mt-0.5 leading-snug">{item.error}</p>
        )}
        {item.status === 'done' && (
          <p className="text-[10px] text-emerald-600 mt-0.5">✓ Subido · {formatSize(item.size)}</p>
        )}
      </div>

      {/* Eliminar */}
      <button onClick={() => onRemove(item.tempId)}
        disabled={item.status === 'uploading'}
        className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30 flex-shrink-0">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TaskDetail() {
  const { id }                    = useParams()
  const navigate                  = useNavigate()
  const { user }                  = useAuth()
  const { tasks, completeTask }   = useField()

  const task   = tasks.find(t => String(t.id) === String(id))
  const status = task ? getStatus(task) : null
  const level  = task ? getUrgencyLevel(task) : null
  const isCompleted = status === 'completada'

  // { [tempId]: { tempId, nombre, size, isImage, progress, status, preview, url, path, evidenceId, error } }
  const [uploadsMap,   setUploadsMap]   = useState({})
  const [comentario,   setComentario]   = useState('')
  const [completing,   setCompleting]   = useState(false)
  const [done,         setDone]         = useState(false)
  const [showSuccess,  setShowSuccess]  = useState(false)
  const [dbEvidencias, setDbEvidencias] = useState(null)  // null=not loaded, []+=loaded
  const [loadingEvid,  setLoadingEvid]  = useState(false)

  const cameraRef  = useRef(null)
  const galleryRef = useRef(null)
  const fileRef    = useRef(null)

  // Success overlay + auto-navigate
  useEffect(() => {
    if (!done) return
    const t1 = setTimeout(() => setShowSuccess(true), 50)
    const t2 = setTimeout(() => navigate('/app/tareas', { replace: true }), 2000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [done, navigate])

  // Load evidence from Supabase for completed tasks
  useEffect(() => {
    if (!isCompleted || !user?.id || !task?.id) return
    setLoadingEvid(true)
    supabase
      .from('task_evidence')
      .select('*')
      .eq('task_id', String(task.id))
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: true })
      .then(({ data, error }) => {
        setDbEvidencias(error ? null : (data ?? []))
        setLoadingEvid(false)
      })
  }, [isCompleted, task?.id, user?.id])

  // ── Upload helpers ──────────────────────────────────────────────────────────

  const setUpload = useCallback((tempId, patch) => {
    setUploadsMap(prev => prev[tempId]
      ? { ...prev, [tempId]: { ...prev[tempId], ...patch } }
      : prev
    )
  }, [])

  const uploadFile = useCallback(async (file, tempId) => {
    const ext    = fileExt(file.name)
    const safe   = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path   = `${user.id}/${task.id}/${Date.now()}_${safe}`

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          onUploadProgress: ev => {
            setUpload(tempId, { progress: Math.round((ev.loaded / ev.total) * 100) })
          },
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path)

      // Save record in DB
      const { data: dbRow, error: dbErr } = await supabase
        .from('task_evidence')
        .insert({
          task_id: String(task.id),
          user_id: user.id,
          file_url: publicUrl,
          file_name: file.name,
          file_type: ext,
          file_size: file.size,
        })
        .select('id')
        .single()

      if (dbErr) console.warn('task_evidence insert error:', dbErr.message)

      setUpload(tempId, {
        progress: 100, status: 'done',
        url: publicUrl, path: data.path,
        evidenceId: dbRow?.id ?? null,
      })
    } catch (err) {
      setUpload(tempId, {
        status: 'error',
        error: err.message?.includes('Bucket not found')
          ? 'Bucket "evidencias" no existe aún en Supabase Storage'
          : err.message || 'Error al subir el archivo',
      })
    }
  }, [user?.id, task?.id, setUpload])

  function handleMedia(e) {
    Array.from(e.target.files).forEach(file => {
      const ext = fileExt(file.name)

      if (!ACCEPTED_EXT.includes(ext)) {
        const tempId = `err-${Date.now()}-${Math.random()}`
        setUploadsMap(prev => ({ ...prev, [tempId]: {
          tempId, nombre: file.name, size: file.size, isImage: false,
          progress: 0, status: 'error', url: null, path: null, preview: null,
          evidenceId: null, error: `Tipo no permitido (.${ext}). Acepta: ${ACCEPTED_EXT.join(', ')}`,
        }}))
        return
      }

      if (file.size > MAX_SIZE) {
        const tempId = `err-${Date.now()}-${Math.random()}`
        setUploadsMap(prev => ({ ...prev, [tempId]: {
          tempId, nombre: file.name, size: file.size, isImage: false,
          progress: 0, status: 'error', url: null, path: null, preview: null,
          evidenceId: null, error: `El archivo supera el límite de 50 MB (${formatSize(file.size)})`,
        }}))
        return
      }

      const tempId  = `${Date.now()}-${Math.random()}`
      const isImage = isImageExt(ext)

      setUploadsMap(prev => ({ ...prev, [tempId]: {
        tempId, nombre: file.name, size: file.size, isImage,
        progress: 0, status: 'uploading', url: null, path: null,
        preview: null, evidenceId: null, error: null,
      }}))

      // Image: FileReader para preview inmediato mientras sube
      if (isImage) {
        const reader = new FileReader()
        reader.onload = ev => setUpload(tempId, { preview: ev.target.result })
        reader.readAsDataURL(file)
      }

      uploadFile(file, tempId)
    })
    e.target.value = ''
  }

  async function removeUpload(tempId) {
    const item = uploadsMap[tempId]
    if (!item || item.status === 'uploading') return

    if (item.path) {
      supabase.storage.from(BUCKET).remove([item.path]).catch(console.warn)
    }
    if (item.evidenceId) {
      supabase.from('task_evidence').delete().eq('id', item.evidenceId).catch(console.warn)
    }

    setUploadsMap(prev => {
      const next = { ...prev }
      delete next[tempId]
      return next
    })
  }

  async function handleComplete() {
    if (completing || done) return
    setCompleting(true)
    await new Promise(r => setTimeout(r, 300))

    const doneUploads = Object.values(uploadsMap)
      .filter(u => u.status === 'done')
      .map(u => ({
        id:      u.tempId,
        nombre:  u.nombre,
        tipo:    u.isImage ? 'image' : 'file',
        size:    u.size,
        preview: u.url,
      }))

    // Si la tarea vino de Supabase, registrar la entrega en DB
    if (task.assignmentId && task.taskId && user?.id) {
      const evidenceIds = Object.values(uploadsMap)
        .filter(u => u.status === 'done' && u.evidenceId)
        .map(u => u.evidenceId)
      try {
        await submitCompletion({
          assignmentId: task.assignmentId,
          taskId:       task.taskId,
          userId:       user.id,
          isOnTime:     task.fechaLimite > Date.now(),
          comments:     comentario || null,
          evidenceIds,
        })
      } catch (err) {
        console.warn('[TaskDetail] submitCompletion error:', err.message)
      }
    }

    completeTask(task.id, { evidencias: doneUploads, comentario })
    setDone(true)
  }

  // ── Early returns ────────────────────────────────────────────────────────────

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

  // ── Derived state ─────────────────────────────────────────────────────────────

  const uploadsArr   = Object.values(uploadsMap)
  const hasUploading = uploadsArr.some(u => u.status === 'uploading')
  const doneImages   = uploadsArr.filter(u => u.status === 'done' && u.isImage)
  const otherItems   = uploadsArr.filter(u => !(u.status === 'done' && u.isImage))

  // Normalize evidence from DB shape { file_url, file_name, file_type } or
  // in-memory shape { preview, nombre, tipo } to a unified display shape.
  function normalizeEv(ev) {
    if (ev.file_name !== undefined) {
      const isImg = isImageExt(ev.file_type)
      return { id: ev.id, nombre: ev.file_name, url: ev.file_url,
               preview: isImg ? ev.file_url : null, isImage: isImg,
               tipo: ev.file_type, size: ev.file_size }
    }
    return { id: ev.id ?? ev.tempId, nombre: ev.nombre,
             url: ev.preview ?? ev.url,
             preview: ev.tipo === 'image' ? (ev.preview ?? ev.url) : null,
             isImage: ev.tipo === 'image', tipo: ev.tipo, size: ev.size }
  }

  // Prefer DB data (when loaded); fall back to in-memory (current-session completions)
  const rawCompleted      = dbEvidencias !== null ? dbEvidencias : (task.evidencias ?? [])
  const completedEvidence = rawCompleted.map(normalizeEv)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay de éxito */}
      {done && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
          <div className={`transition-all duration-500 ease-out flex flex-col items-center ${
            showSuccess ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}>
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

      {/* Inputs ocultos */}
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleMedia} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleMedia} />
      <input ref={fileRef}    type="file"
        accept=".jpg,.jpeg,.png,.heic,.pdf,.xlsx,.xls,.docx,.doc,.mp4,.mov"
        multiple className="hidden" onChange={handleMedia} />

      <div className="flex flex-col min-h-full">

        {/* Barra superior con botón volver */}
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

          {/* ── Cabecera de tarea ─────────────────────────────────────────── */}
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

            {/* Deadline / completada */}
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

          {/* ── Material de apoyo ─────────────────────────────────────────── */}
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

          {/* ── Evidencia ────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Evidencia</h2>
              {task.evidenciasRequeridas?.length > 0 && (
                <div className="flex gap-1">
                  {task.evidenciasRequeridas.map(tipo => {
                    const label = FILE_TYPE_LABELS[tipo] ?? tipo
                    return (
                      <span key={tipo} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">
                        {label}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">

              {/* Botones de carga (solo cuando no completada) */}
              {!isCompleted && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: 'Cámara',
                      ref: cameraRef,
                      path: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z',
                    },
                    {
                      label: 'Galería',
                      ref: galleryRef,
                      path: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
                    },
                    {
                      label: 'Archivo',
                      ref: fileRef,
                      path: 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13',
                    },
                  ].map(btn => (
                    <button key={btn.label} onClick={() => btn.ref.current?.click()}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-kof-red/5 border border-kof-red/10 hover:bg-kof-red/10 active:scale-95 transition-all">
                      <svg className="w-5 h-5 text-kof-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={btn.path} />
                      </svg>
                      <span className="text-[11px] font-semibold text-kof-red">{btn.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Vista: tarea ya completada */}
              {isCompleted && (
                loadingEvid ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 border-kof-red border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : completedEvidence.length > 0 ? (
                  <div className="space-y-2.5">
                    {/* Imágenes en grid */}
                    {completedEvidence.filter(e => e.isImage).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {completedEvidence.filter(e => e.isImage).map((e, i) => (
                          <a key={e.id ?? i} href={e.url || e.preview || '#'}
                            target={e.url ? '_blank' : '_self'} rel="noreferrer"
                            className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 block group">
                            {(e.url || e.preview) ? (
                              <img src={e.url || e.preview} alt={e.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-blue-50">
                                <svg className="w-7 h-7 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                            )}
                            {/* Hover overlay */}
                            {e.url && (
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </div>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                    {/* Archivos no-imagen */}
                    {completedEvidence.filter(e => !e.isImage).map((e, i) => {
                      const extLabel = (e.tipo ?? '').toUpperCase().slice(0, 3) || 'FILE'
                      const extColors = {
                        PDF: 'bg-red-100 text-red-700',  XLS: 'bg-emerald-100 text-emerald-700',
                        DOC: 'bg-indigo-100 text-indigo-700', VID: 'bg-purple-100 text-purple-700',
                        MP4: 'bg-purple-100 text-purple-700', MOV: 'bg-purple-100 text-purple-700',
                      }
                      const cls = extColors[extLabel] ?? 'bg-gray-100 text-gray-600'
                      return (
                        <div key={e.id ?? i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cls}`}>
                            <span className="text-[11px] font-bold">{extLabel}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700 truncate">{e.nombre}</p>
                            {e.size && <p className="text-[10px] text-gray-400 mt-0.5">{formatSize(e.size)}</p>}
                          </div>
                          {e.url && (
                            <a href={e.url} target="_blank" rel="noreferrer"
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : null
              )}

              {/* Vista: subidas activas/completadas en la sesión actual */}
              {!isCompleted && uploadsArr.length > 0 && (
                <div className="space-y-2.5">
                  {/* Grid de imágenes done */}
                  {doneImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {doneImages.map(item => (
                        <div key={item.tempId} className="relative w-20 h-20 group">
                          <a href={item.url} target="_blank" rel="noreferrer"
                            className="block w-full h-full rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                            <img src={item.preview || item.url} alt={item.nombre} className="w-full h-full object-cover" />
                          </a>
                          <button onClick={() => removeUpload(item.tempId)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-kof-red text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Lista de archivos no-imagen / uploading / error */}
                  {otherItems.length > 0 && (
                    <div className="space-y-2">
                      {otherItems.map(item => (
                        <UploadRow key={item.tempId} item={item} onRemove={removeUpload} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Estado vacío */}
              {uploadsArr.length === 0 && !loadingEvid && completedEvidence.length === 0 && (
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

          {/* ── Comentarios ───────────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 px-1">
              Comentarios{!isCompleted && (
                <span className="normal-case font-normal text-gray-400 ml-1">(opcional)</span>
              )}
            </h2>
            {isCompleted ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
                {task.comentario
                  ? <p className="text-sm text-gray-600">{task.comentario}</p>
                  : <p className="text-sm text-gray-400 italic">Sin comentarios</p>
                }
              </div>
            ) : (
              <textarea
                className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-kof-red focus:border-transparent resize-none"
                rows={3}
                placeholder="Agrega observaciones o notas…"
                value={comentario}
                onChange={e => setComentario(e.target.value)}
              />
            )}
          </div>

          {/* ── Botón completar ───────────────────────────────────────────── */}
          {!isCompleted && (
            <div className="pb-2">
              {hasUploading && (
                <p className="text-center text-xs text-amber-600 mb-2">
                  Esperando que terminen las subidas…
                </p>
              )}
              <button onClick={handleComplete}
                disabled={completing || done || hasUploading}
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
