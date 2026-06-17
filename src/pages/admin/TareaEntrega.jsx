import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MOCK_TAREAS, fmtDateTime, timeAgo } from '../../data/mockTareas'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CFG = {
  image: { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'FOTO', border: 'border-blue-200'    },
  pdf:   { bg: 'bg-red-100',     text: 'text-red-700',     label: 'PDF',  border: 'border-red-200'     },
  excel: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'XLS',  border: 'border-emerald-200' },
  word:  { bg: 'bg-indigo-100',  text: 'text-indigo-700',  label: 'DOC',  border: 'border-indigo-200'  },
  video: { bg: 'bg-violet-100',  text: 'text-violet-700',  label: 'VID',  border: 'border-violet-200'  },
}

function typeCfg(tipo) {
  return TYPE_CFG[tipo] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: 'ARCH', border: 'border-gray-200' }
}

// ─── Galería de evidencias ─────────────────────────────────────────────────────

function EvidenciaGallery({ evidencias }) {
  const [tab, setTab] = useState('Todas')
  const images = evidencias.filter(e => e.tipo === 'image')
  const docs   = evidencias.filter(e => e.tipo !== 'image')
  const tabs   = [
    { label: 'Todas',       count: evidencias.length, items: evidencias },
    { label: 'Imágenes',    count: images.length,      items: images    },
    { label: 'Documentos',  count: docs.length,        items: docs      },
  ].filter(t => t.count > 0 || t.label === 'Todas')

  const currentItems = tabs.find(t => t.label === tab)?.items ?? evidencias

  if (evidencias.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        <svg className="w-8 h-8 mx-auto mb-2 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm font-semibold">Sin evidencias adjuntas</p>
      </div>
    )
  }

  return (
    <div>
      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex gap-1 mb-4">
          {tabs.map(t => (
            <button key={t.label} onClick={() => setTab(t.label)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                tab === t.label
                  ? 'bg-kof-red text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {t.label} {t.count > 0 && <span className="ml-0.5 opacity-70">({t.count})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Grid imágenes */}
      {currentItems.some(e => e.tipo === 'image') && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {currentItems.filter(e => e.tipo === 'image').map((ev, i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative group">
              {ev.url ? (
                <img src={ev.url} alt={ev.nombre} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-blue-50">
                  <svg className="w-7 h-7 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-xl" />
              <div className="absolute bottom-1 left-1 right-1">
                <p className="text-[9px] text-white font-semibold truncate bg-black/40 rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {ev.nombre}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista documentos / videos */}
      {currentItems.filter(e => e.tipo !== 'image').map((ev, i) => {
        const cfg = typeCfg(ev.tipo)
        return (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border mb-2 ${cfg.border} ${cfg.bg}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white shadow-sm`}>
              {ev.tipo === 'video' ? (
                <svg className={`w-5 h-5 ${cfg.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>
              ) : (
                <svg className={`w-5 h-5 ${cfg.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{ev.nombre}</p>
              <span className={`text-[9px] font-extrabold ${cfg.text}`}>{cfg.label}</span>
            </div>
            {ev.url && (
              <a href={ev.url} download target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Modal rechazo ─────────────────────────────────────────────────────────────

function RechazarModal({ onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-kof-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900">Rechazar entrega</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">Indica el motivo del rechazo para que el TSD pueda corregir.</p>
        <textarea
          value={motivo} onChange={e => setMotivo(e.target.value)}
          rows={3} placeholder="Ej. Las fotos no muestran claramente el estado de los extintores..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-kof-red resize-none transition-all mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={() => motivo.trim() && onConfirm(motivo.trim())} disabled={!motivo.trim()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-kof-red hover:bg-kof-red-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            Rechazar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Vista principal ───────────────────────────────────────────────────────────

export default function TareaEntrega() {
  const { id, tsdId } = useParams()
  const navigate = useNavigate()

  const tarea = MOCK_TAREAS.find(t => String(t.id) === String(id))
  const [voboEstado, setVoboEstado] = useState(null)  // override local
  const [motivoLocal, setMotivoLocal] = useState(null)
  const [showRechazar, setShowRechazar] = useState(false)
  const [confirmAprobado, setConfirmAprobado] = useState(false)

  if (!tarea) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-400 font-semibold">Tarea no encontrada</p>
        <button onClick={() => navigate('/admin/tareas')} className="mt-4 text-sm text-kof-red font-bold">
          ← Volver a tareas
        </button>
      </div>
    )
  }

  const tsd = tarea.tsds.find(t => String(t.userId) === String(tsdId))
  if (!tsd) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-400 font-semibold">Entrega no encontrada</p>
        <button onClick={() => navigate(`/admin/tareas/${id}`)} className="mt-4 text-sm text-kof-red font-bold">
          ← Volver al detalle
        </button>
      </div>
    )
  }

  const voboActual    = voboEstado ?? tsd.vobo
  const motivoActual  = motivoLocal ?? tsd.motivoRechazo
  const isEntregada   = tsd.estado === 'entregada'
  const isPendiente   = !isEntregada

  function handleAprobar() {
    setVoboEstado('aprobado')
    setMotivoLocal(null)
    setConfirmAprobado(true)
    setTimeout(() => setConfirmAprobado(false), 3000)
  }

  function handleRechazar(motivo) {
    setVoboEstado('rechazado')
    setMotivoLocal(motivo)
    setShowRechazar(false)
  }

  return (
    <div className="min-h-full bg-kof-bg">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 md:px-6">
        <button onClick={() => navigate(`/admin/tareas/${id}`)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-kof-red transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {tarea.nombre}
        </button>

        <div className="flex items-start gap-3">
          {/* Avatar TSD */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-extrabold ${
            isEntregada ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {tsd.iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-extrabold text-gray-900 leading-tight">{tsd.nombre}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{tsd.uo}</p>
            {isEntregada && (
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  tsd.enTiempo ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {tsd.enTiempo ? '✓ En tiempo' : '⚠ Fuera de tiempo'}
                </span>
                <span className="text-[10px] text-gray-400">
                  Entregado el {fmtDateTime(tsd.entregadaEn)}
                </span>
              </div>
            )}
            {isPendiente && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 mt-1.5 inline-block">
                {tsd.estado === 'vencida' ? 'No entregó' : 'Pendiente'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

        {/* Comentario del TSD */}
        {isEntregada && tsd.comentario && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Comentario del TSD</p>
            <p className="text-sm text-gray-700 leading-relaxed">{tsd.comentario}</p>
          </div>
        )}

        {/* Evidencias */}
        {isEntregada && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              Evidencias ({tsd.evidencias.length})
            </p>
            <EvidenciaGallery evidencias={tsd.evidencias} />
          </div>
        )}

        {/* Sin entrega */}
        {isPendiente && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-500">Aún sin entrega</p>
            <p className="text-xs text-gray-400 mt-1">Este TSD no ha subido evidencias todavía.</p>
          </div>
        )}

        {/* Sección VoBo */}
        {isEntregada && tarea.requiereVobo && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Visto Bueno (VoBo)</p>

            {/* Estado actual */}
            {voboActual === 'aprobado' && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl mb-4 border border-emerald-200">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-700">Entrega aprobada</p>
                  {tsd.voboAprobadoPor && (
                    <p className="text-xs text-emerald-600">Por: {tsd.voboAprobadoPor}</p>
                  )}
                </div>
              </div>
            )}

            {voboActual === 'rechazado' && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl mb-4 border border-red-200">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-kof-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-kof-red">Entrega rechazada</p>
                  {motivoActual && (
                    <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{motivoActual}</p>
                  )}
                </div>
              </div>
            )}

            {voboActual === 'pendiente' && (
              <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl mb-4 border border-violet-200">
                <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-violet-700">Pendiente de revisión</p>
                  <p className="text-xs text-violet-600">Revisa la evidencia y toma una decisión.</p>
                </div>
              </div>
            )}

            {/* Acciones */}
            {(voboActual === 'pendiente' || voboActual === null) && (
              <div className="flex gap-3">
                <button onClick={() => setShowRechazar(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-kof-red border-2 border-kof-red/30 hover:bg-red-50 active:scale-[0.98] transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Rechazar
                </button>
                <button onClick={handleAprobar}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-sm shadow-emerald-300">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Aprobar
                </button>
              </div>
            )}

            {/* Cambiar decisión si ya fue tomada */}
            {(voboActual === 'aprobado' || voboActual === 'rechazado') && (
              <div className="flex gap-3">
                {voboActual === 'aprobado' && (
                  <button onClick={() => setShowRechazar(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all">
                    Cambiar a rechazado
                  </button>
                )}
                {voboActual === 'rechazado' && (
                  <button onClick={handleAprobar}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all">
                    Cambiar a aprobado
                  </button>
                )}
              </div>
            )}

            {/* Confirmación */}
            {confirmAprobado && (
              <p className="text-xs font-semibold text-emerald-600 text-center mt-3 animate-pulse">
                ✓ VoBo aprobado correctamente
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal rechazo */}
      {showRechazar && (
        <RechazarModal
          onClose={() => setShowRechazar(false)}
          onConfirm={handleRechazar}
        />
      )}
    </div>
  )
}
