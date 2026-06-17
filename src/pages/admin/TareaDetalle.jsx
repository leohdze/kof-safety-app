import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  MOCK_TAREAS, PRIORIDAD_CFG, CLASIF_CFG,
  getStatusTarea, STATUS_CFG, countdown, fmtDateTime, timeAgo,
} from '../../data/mockTareas'

const TYPE_ICON = {
  image: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'FOTO' },
  pdf:   { bg: 'bg-red-100',  text: 'text-red-600',  label: 'PDF'  },
  excel: { bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'XLS' },
  word:  { bg: 'bg-blue-100', text: 'text-blue-600', label: 'DOC'  },
  video: { bg: 'bg-violet-100',  text: 'text-violet-600',  label: 'VID'  },
}

function EvidBadge({ tipo }) {
  const cfg = TYPE_ICON[tipo] ?? { bg: 'bg-gray-100', text: 'text-gray-500', label: 'ARCH' }
  return (
    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

function TsdRow({ tsd, tareaId, requiereVobo }) {
  const navigate = useNavigate()
  const isEntregada = tsd.estado === 'entregada'
  const isVencida   = tsd.estado === 'vencida'

  return (
    <button
      onClick={() => navigate(`/admin/tareas/${tareaId}/tsd/${tsd.userId}`)}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
        isEntregada ? 'bg-emerald-100 text-emerald-700' : isVencida ? 'bg-red-100 text-kof-red' : 'bg-gray-100 text-gray-500'
      }`}>
        {tsd.iniciales}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold text-gray-800 truncate">{tsd.nombre}</p>
        </div>
        <p className="text-xs text-gray-400 truncate">{tsd.uo}</p>
        {isEntregada && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              tsd.enTiempo ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {tsd.enTiempo ? 'En tiempo' : 'Fuera de tiempo'}
            </span>
            <span className="text-[10px] text-gray-400">{timeAgo(tsd.entregadaEn)}</span>
            {tsd.evidencias.length > 0 && (
              <div className="flex gap-1">
                {[...new Set(tsd.evidencias.map(e => e.tipo))].map(t => <EvidBadge key={t} tipo={t} />)}
              </div>
            )}
          </div>
        )}
        {isVencida && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-kof-red mt-1 inline-block">
            No entregó
          </span>
        )}
      </div>

      {/* VoBo / estado right */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {isEntregada && requiereVobo && (
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
            tsd.vobo === 'aprobado'  ? 'bg-emerald-100 text-emerald-700'
            : tsd.vobo === 'rechazado' ? 'bg-red-100 text-kof-red'
            : 'bg-violet-100 text-violet-700'
          }`}>
            {tsd.vobo === 'aprobado' ? '✓ VoBo' : tsd.vobo === 'rechazado' ? '✕ Rechazado' : 'VoBo pend.'}
          </span>
        )}
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

export default function TareaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const tarea = MOCK_TAREAS.find(t => String(t.id) === String(id))

  if (!tarea) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-400 font-semibold">Tarea no encontrada</p>
        <button onClick={() => navigate('/admin/tareas')}
          className="mt-4 text-sm text-kof-red font-bold">
          ← Volver a tareas
        </button>
      </div>
    )
  }

  const status    = getStatusTarea(tarea)
  const sCfg      = STATUS_CFG(status)
  const pCfg      = PRIORIDAD_CFG[tarea.prioridad]
  const total     = tarea.tsds.length
  const entregadas = tarea.tsds.filter(t => t.estado === 'entregada')
  const pendientes = tarea.tsds.filter(t => t.estado !== 'entregada')
  const pct       = total === 0 ? 0 : Math.round((entregadas.length / total) * 100)

  const voboAprobados = tarea.tsds.filter(t => t.vobo === 'aprobado').length
  const voboPendientes = tarea.tsds.filter(t => t.vobo === 'pendiente').length
  const voboRechazados = tarea.tsds.filter(t => t.vobo === 'rechazado').length

  return (
    <div className="min-h-full bg-kof-bg">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 md:px-6">
        <button onClick={() => navigate('/admin/tareas')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-kof-red transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Tareas
        </button>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CLASIF_CFG[tarea.clasificacion]}`}>
            {tarea.clasificacion}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${pCfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} />
            {tarea.prioridad}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">{tarea.periodicidad}</span>
          {tarea.requiereVobo && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              VoBo
            </span>
          )}
        </div>

        <h1 className="text-xl font-extrabold text-gray-900 leading-tight mb-1">{tarea.nombre}</h1>
        {tarea.descripcion && (
          <p className="text-xs text-gray-500 leading-relaxed">{tarea.descripcion}</p>
        )}

        {/* Estado + countdown */}
        <div className="mt-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${sCfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              status === 'vencida' ? 'bg-kof-red' : status === 'por-vencer' ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            {sCfg.label} · {countdown(tarea.fechaLimite)}
          </span>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">

        {/* Progreso general */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Progreso general</p>
            <p className="text-2xl font-extrabold text-gray-900">{pct}%</p>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all duration-700 ${
              status === 'vencida' ? 'bg-kof-red' : status === 'por-vencer' ? 'bg-amber-400' : 'bg-emerald-400'
            }`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span><strong className="text-gray-900">{entregadas.length}</strong> entregadas</span>
            <span><strong className="text-gray-900">{pendientes.length}</strong> pendientes</span>
            <span><strong className="text-gray-900">{total}</strong> total</span>
          </div>
        </div>

        {/* VoBo stats (si aplica) */}
        {tarea.requiereVobo && entregadas.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Estado VoBo</p>
            <div className="flex gap-3">
              <div className="flex-1 bg-emerald-50 rounded-xl py-2.5 text-center">
                <p className="text-lg font-extrabold text-emerald-600">{voboAprobados}</p>
                <p className="text-[10px] font-semibold text-emerald-600">Aprobados</p>
              </div>
              <div className="flex-1 bg-violet-50 rounded-xl py-2.5 text-center">
                <p className="text-lg font-extrabold text-violet-600">{voboPendientes}</p>
                <p className="text-[10px] font-semibold text-violet-600">Pendientes</p>
              </div>
              <div className="flex-1 bg-red-50 rounded-xl py-2.5 text-center">
                <p className="text-lg font-extrabold text-kof-red">{voboRechazados}</p>
                <p className="text-[10px] font-semibold text-kof-red">Rechazados</p>
              </div>
            </div>
          </div>
        )}

        {/* Entregadas */}
        {entregadas.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Entregadas ({entregadas.length})
              </p>
            </div>
            <div className="divide-y divide-gray-50 px-1">
              {entregadas.map(tsd => (
                <TsdRow key={tsd.userId} tsd={tsd} tareaId={tarea.id} requiereVobo={tarea.requiereVobo} />
              ))}
            </div>
          </div>
        )}

        {/* Pendientes / Vencidas */}
        {pendientes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Pendientes ({pendientes.length})
              </p>
            </div>
            <div className="divide-y divide-gray-50 px-1">
              {pendientes.map(tsd => (
                <TsdRow key={tsd.userId} tsd={tsd} tareaId={tarea.id} requiereVobo={tarea.requiereVobo} />
              ))}
            </div>
          </div>
        )}

        {/* Evidencias requeridas */}
        {tarea.evidencias.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Evidencias requeridas</p>
            <div className="flex flex-wrap gap-2">
              {tarea.evidencias.map(e => (
                <span key={e} className="text-xs font-semibold px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full">
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
