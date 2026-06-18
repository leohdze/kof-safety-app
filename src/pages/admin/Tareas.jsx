import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PERIODICIDADES, PRIORIDAD_CFG, CLASIF_CFG, EVIDENCIAS,
  TIPO_ASIGNACION, REGIONES, UOS, getStatusTarea, STATUS_CFG, countdown, initials,
} from '../../data/mockTareas'
import { getTasks, createTask, updateTask } from '../../services/taskService'
import { createAssignments, getDistinctRegionsAndUOs } from '../../services/assignmentService'
import { getFieldUsers } from '../../services/userService'
import { supabase } from '../../lib/supabase'

// ─── Sub-componentes de formulario ────────────────────────────────────────────

function PrioridadSelector({ value, onChange }) {
  const opts = [
    { v: 'Bajo',    dot: 'bg-gray-400',    ring: 'ring-gray-400',    active: 'bg-gray-100 text-gray-700' },
    { v: 'Medio',   dot: 'bg-amber-400',   ring: 'ring-amber-400',   active: 'bg-amber-100 text-amber-700' },
    { v: 'Alto',    dot: 'bg-orange-500',  ring: 'ring-orange-500',  active: 'bg-orange-100 text-orange-700' },
    { v: 'Crítica', dot: 'bg-kof-red',     ring: 'ring-kof-red',     active: 'bg-red-100 text-kof-red' },
  ]
  return (
    <div className="flex gap-2">
      {opts.map(o => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
            value === o.v
              ? `${o.active} border-current ring-2 ${o.ring}`
              : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${value === o.v ? o.dot : 'bg-gray-300'}`} />
          {o.v}
        </button>
      ))}
    </div>
  )
}

function ClasifSelector({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {['Operativa', 'Normativa'].map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
            value === opt
              ? opt === 'Operativa'
                ? 'bg-blue-50 text-blue-700 border-blue-400'
                : 'bg-purple-50 text-purple-700 border-purple-400'
              : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function CheckboxChips({ items, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => {
        const sel = value.includes(item)
        return (
          <button key={item} type="button"
            onClick={() => onChange(sel ? value.filter(v => v !== item) : [...value, item])}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              sel
                ? 'bg-kof-red text-white border-kof-red'
                : 'bg-white text-gray-500 border-gray-200 hover:border-kof-red hover:text-kof-red'
            }`}>
            {item}
          </button>
        )
      })}
    </div>
  )
}

// Chips para selección de usuarios reales (muestra nombre, almacena UUID)
function UserChips({ users, value, onChange, loading }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <div className="w-4 h-4 border-2 border-kof-red border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-400">Cargando usuarios...</span>
      </div>
    )
  }
  if (!users.length) {
    return <p className="text-xs text-gray-400 py-2">Sin usuarios de campo disponibles.</p>
  }
  return (
    <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
      {users.map(u => {
        const sel = value.includes(u.id)
        return (
          <button key={u.id} type="button"
            onClick={() => onChange(sel ? value.filter(v => v !== u.id) : [...value, u.id])}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              sel
                ? 'bg-kof-red text-white border-kof-red'
                : 'bg-white text-gray-500 border-gray-200 hover:border-kof-red hover:text-kof-red'
            }`}>
            {u.nombre}
          </button>
        )
      })}
    </div>
  )
}

const EMPTY_FORM = {
  nombre: '', descripcion: '', periodicidad: 'Mensual',
  clasificacion: 'Operativa', prioridad: 'Medio',
  requiereVobo: false, evidencias: [],
  fechaLimite: '',
  asignacion: { tipo: 'region', valores: [] },
}

function TareaModal({ tarea, onClose, onSave }) {
  const [form, setForm] = useState(tarea
    ? { ...tarea, fechaLimite: tarea.fechaLimite ? new Date(tarea.fechaLimite).toISOString().slice(0, 16) : '', asignacion: { ...tarea.asignacion } }
    : { ...EMPTY_FORM, asignacion: { ...EMPTY_FORM.asignacion } }
  )
  const [fieldUsers, setFieldUsers]     = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [regions, setRegions]           = useState(REGIONES)
  const [uos, setUos]                   = useState(UOS)
  const [pendingFiles, setPendingFiles] = useState([])
  const [uploadedUrls, setUploadedUrls] = useState(tarea?.materialUrls ?? [])
  const [saving, setSaving]             = useState(false)

  // Cargar regiones/UOs reales de la BD
  useEffect(() => {
    getDistinctRegionsAndUOs()
      .then(({ regions: r, uos: u }) => {
        if (r.length) setRegions(r)
        if (u.length) setUos(u)
      })
      .catch(() => {}) // mantiene fallback hardcoded
  }, [])

  // Cargar TSDs cuando se selecciona el tipo 'usuario'
  useEffect(() => {
    if (form.asignacion.tipo !== 'usuario') return
    if (fieldUsers.length) return
    setLoadingUsers(true)
    getFieldUsers()
      .then(setFieldUsers)
      .catch(err => console.warn('[TareaModal] no se pudieron cargar TSDs:', err.message))
      .finally(() => setLoadingUsers(false))
  }, [form.asignacion.tipo, fieldUsers.length])

  function handleTipo(tipo) {
    setForm(f => ({ ...f, asignacion: { tipo, valores: [] } }))
  }

  async function handleSave() {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      let allUrls = [...uploadedUrls]
      for (const file of pendingFiles) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${Date.now()}_${safeName}`
        const { error: upErr } = await supabase.storage
          .from('materiales')
          .upload(path, file, { cacheControl: '3600', upsert: false })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('materiales').getPublicUrl(path)
        allUrls.push(urlData.publicUrl)
      }
      onSave({ ...form, materialUrls: allUrls })
      onClose()
    } catch (err) {
      console.warn('[TareaModal] upload error:', err.message)
      onSave({ ...form, materialUrls: uploadedUrls })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-gray-900">
            {tarea ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">NOMBRE</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej. Inspección de extintores"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kof-red/30 focus:border-kof-red transition-all" />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">DESCRIPCIÓN</label>
            <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={2} placeholder="Instrucciones o contexto de la tarea..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-kof-red/30 focus:border-kof-red transition-all resize-none" />
          </div>

          {/* Clasificación */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">CLASIFICACIÓN</label>
            <ClasifSelector value={form.clasificacion} onChange={v => setForm(f => ({ ...f, clasificacion: v }))} />
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">PRIORIDAD</label>
            <PrioridadSelector value={form.prioridad} onChange={v => setForm(f => ({ ...f, prioridad: v }))} />
          </div>

          {/* Periodicidad */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">PERIODICIDAD</label>
            <select value={form.periodicidad} onChange={e => setForm(f => ({ ...f, periodicidad: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kof-red/30 focus:border-kof-red transition-all">
              {PERIODICIDADES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          {/* Fecha límite */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">FECHA LÍMITE</label>
            <input
              type="datetime-local"
              value={form.fechaLimite}
              onChange={e => setForm(f => ({ ...f, fechaLimite: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kof-red/30 focus:border-kof-red transition-all"
            />
          </div>

          {/* Asignación */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">ASIGNAR A</label>
            <div className="flex gap-2 mb-3">
              {Object.entries(TIPO_ASIGNACION).map(([k, v]) => (
                <button key={k} type="button" onClick={() => handleTipo(k)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    form.asignacion.tipo === k
                      ? 'bg-kof-red text-white border-kof-red'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}>
                  {v.label}
                </button>
              ))}
            </div>

            {form.asignacion.tipo === 'usuario' ? (
              <UserChips
                users={fieldUsers}
                value={form.asignacion.valores}
                onChange={vals => setForm(f => ({ ...f, asignacion: { ...f.asignacion, valores: vals } }))}
                loading={loadingUsers}
              />
            ) : (
              <CheckboxChips
                items={form.asignacion.tipo === 'region' ? regions : uos}
                value={form.asignacion.valores}
                onChange={vals => setForm(f => ({ ...f, asignacion: { ...f.asignacion, valores: vals } }))}
              />
            )}

            {form.asignacion.valores.length > 0 && (
              <p className="text-[10px] text-gray-400 mt-2">
                {form.asignacion.valores.length} seleccionado{form.asignacion.valores.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Evidencias */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">EVIDENCIAS REQUERIDAS</label>
            <CheckboxChips items={EVIDENCIAS} value={form.evidencias}
              onChange={vals => setForm(f => ({ ...f, evidencias: vals }))} />
          </div>

          {/* VoBo */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-700">Requiere VoBo</p>
              <p className="text-xs text-gray-400">Cada entrega necesita aprobación ejecutiva</p>
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, requiereVobo: !f.requiereVobo }))}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                form.requiereVobo ? 'bg-kof-red' : 'bg-gray-300'
              }`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                form.requiereVobo ? 'left-6' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Material de apoyo */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">MATERIAL DE APOYO</label>
            <div className="space-y-2">
              {uploadedUrls.map((url, i) => {
                const name = decodeURIComponent(url.split('/').pop().split('?')[0])
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                    <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <a href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 truncate flex-1 hover:underline">{name}</a>
                    <button type="button" onClick={() => setUploadedUrls(u => u.filter((_, j) => j !== i))}
                      className="text-blue-400 hover:text-blue-700 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
              {pendingFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                  <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-xs text-amber-700 truncate flex-1">{f.name}</span>
                  <button type="button" onClick={() => setPendingFiles(fs => fs.filter((_, j) => j !== i))}
                    className="text-amber-400 hover:text-amber-700 flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-kof-red/50 hover:bg-red-50/30 transition-colors">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs text-gray-500 font-medium">Agregar archivo</span>
                <input type="file" className="sr-only" multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.mov"
                  onChange={e => { setPendingFiles(p => [...p, ...Array.from(e.target.files)]); e.target.value = '' }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 pb-6 pt-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-kof-red hover:bg-kof-red-dark active:scale-[0.98] transition-all shadow-sm shadow-kof-red/30 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Guardando...' : (tarea ? 'Guardar cambios' : 'Crear tarea')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card de tarea ─────────────────────────────────────────────────────────────

function TareaCard({ tarea, onClick }) {
  const status   = getStatusTarea(tarea)
  const sCfg     = STATUS_CFG(status)
  const pCfg     = PRIORIDAD_CFG[tarea.prioridad]
  const total    = tarea.tsds.length
  const entregadas = tarea.tsds.filter(t => t.estado === 'entregada').length
  const pct      = total === 0 ? 0 : Math.round((entregadas / total) * 100)
  const voboPend = tarea.requiereVobo ? tarea.tsds.filter(t => t.vobo === 'pendiente').length : 0

  return (
    <button onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left active:scale-[0.98] transition-all hover:shadow-md">
      <div className="flex items-start gap-3">
        {/* Dot prioridad */}
        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${pCfg.dot}`} />

        <div className="flex-1 min-w-0">
          {/* Nombre + chevron */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="text-sm font-bold text-gray-900 leading-snug">{tarea.nombre}</h3>
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Badges: clasificación + periodicidad */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CLASIF_CFG[tarea.clasificacion]}`}>
              {tarea.clasificacion}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pCfg.badge}`}>
              {tarea.prioridad}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">{tarea.periodicidad}</span>
          </div>

          {/* Progreso */}
          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-700">{entregadas}/{total} entregadas</span>
              <span className="text-xs font-bold text-gray-500">{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                status === 'vencida' ? 'bg-kof-red' : status === 'por-vencer' ? 'bg-amber-400' : 'bg-emerald-400'
              }`} style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Status + VoBo */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sCfg.cls}`}>
              {sCfg.label} · {countdown(tarea.fechaLimite)}
            </span>
            {tarea.requiereVobo && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                voboPend > 0 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'
              }`}>
                VoBo {voboPend > 0 ? `(${voboPend} pend.)` : '✓'}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Vista principal ───────────────────────────────────────────────────────────

const CLASIF_TABS = ['Todas', 'Operativas', 'Normativas']
const STATUS_TABS = ['Todas', 'En tiempo', 'Por vencer', 'Vencidas']

export default function Tareas() {
  const navigate = useNavigate()
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(true)
  const [clasifTab, setClasifTab] = useState('Todas')
  const [statusTab, setStatusTab] = useState('Todas')
  const [filtPrioridad, setFiltPrioridad] = useState('')
  const [filtPeriodicidad, setFiltPeriodicidad] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | { tarea }
  const [toast, setToast] = useState(null) // { type: 'success'|'error', msg: string }

  useEffect(() => {
    setLoading(true)
    getTasks().then(setTareas).finally(() => setLoading(false))
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const filtered = useMemo(() => {
    return tareas.filter(t => {
      if (clasifTab !== 'Todas') {
        const mapTab = { Operativas: 'Operativa', Normativas: 'Normativa' }
        if (t.clasificacion !== mapTab[clasifTab]) return false
      }
      if (statusTab !== 'Todas') {
        const s = getStatusTarea(t)
        const mapStatus = { 'En tiempo':'en-tiempo', 'Por vencer':'por-vencer', 'Vencidas':'vencida' }
        if (s !== mapStatus[statusTab]) return false
      }
      if (filtPrioridad && t.prioridad !== filtPrioridad) return false
      if (filtPeriodicidad && t.periodicidad !== filtPeriodicidad) return false
      if (search && !t.nombre.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [tareas, clasifTab, statusTab, filtPrioridad, filtPeriodicidad, search])

  async function handleSave(form) {
    if (modal?.tarea) {
      // Editar tarea existente
      try {
        await updateTask(modal.tarea.id, form)
        setTareas(ts => ts.map(t => t.id === modal.tarea.id ? { ...t, ...form } : t))
      } catch (err) {
        console.warn('[Tareas] updateTask error:', err.message)
        setTareas(ts => ts.map(t => t.id === modal.tarea.id ? { ...t, ...form } : t))
      }
      return
    }

    // Crear nueva tarea
    let newTarea
    try {
      newTarea = await createTask(form)
      setTareas(ts => [...ts, newTarea])
    } catch (err) {
      console.warn('[Tareas] createTask error, aplicando localmente:', err.message)
      newTarea = { ...form, id: Date.now(), tsds: [], activa: true }
      setTareas(ts => [...ts, newTarea])
      setToast({ type: 'error', msg: 'Error al guardar la tarea en Supabase.' })
      return
    }

    // Crear asignaciones automáticamente
    const { tipo, valores } = form.asignacion
    if (!valores.length) {
      setToast({ type: 'success', msg: 'Tarea creada. Sin TSDs seleccionados para asignar.' })
      return
    }

    try {
      const count = await createAssignments(newTarea.id, form.fechaLimite || null, { tipo, valores })
      if (count > 0) {
        setToast({ type: 'success', msg: `Tarea creada y asignada a ${count} TSD${count !== 1 ? 's' : ''}.` })
        // Refrescar la tarea para mostrar los TSDs asignados
        getTasks().then(setTareas).catch(console.warn)
      } else {
        setToast({ type: 'error', msg: 'Tarea creada, pero no se encontraron TSDs activos para los criterios seleccionados.' })
      }
    } catch (assignErr) {
      console.warn('[Tareas] createAssignments error:', assignErr.message)
      setToast({ type: 'error', msg: `Tarea creada pero error al asignar: ${assignErr.message}` })
    }
  }

  const counts = {
    Todas: tareas.length,
    Operativas: tareas.filter(t => t.clasificacion === 'Operativa').length,
    Normativas: tareas.filter(t => t.clasificacion === 'Normativa').length,
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Tareas</h1>
          <p className="text-sm text-gray-400 mt-0.5">{tareas.filter(t => t.activa).length} tareas activas</p>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-kof-red text-white text-sm font-bold rounded-xl shadow-sm shadow-kof-red/30 hover:bg-kof-red-dark active:scale-[0.97] transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva tarea
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar tarea..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kof-red/20 focus:border-kof-red transition-all" />
      </div>

      {/* Tabs clasificación */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
        {CLASIF_TABS.map(tab => (
          <button key={tab} onClick={() => setClasifTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              clasifTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab}
            <span className={`ml-1 text-[10px] font-bold ${clasifTab === tab ? 'text-kof-red' : 'text-gray-400'}`}>
              {counts[tab] ?? filtered.length}
            </span>
          </button>
        ))}
      </div>

      {/* Chips estado */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {STATUS_TABS.map(tab => (
          <button key={tab} onClick={() => setStatusTab(tab)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              statusTab === tab
                ? 'bg-kof-red text-white border-kof-red'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Filtros secundarios */}
      <div className="flex gap-2 mb-5">
        <select value={filtPrioridad} onChange={e => setFiltPrioridad(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-kof-red/20">
          <option value="">Prioridad</option>
          {['Bajo','Medio','Alto','Crítica'].map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={filtPeriodicidad} onChange={e => setFiltPeriodicidad(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-kof-red/20">
          <option value="">Periodicidad</option>
          {PERIODICIDADES.map(p => <option key={p}>{p}</option>)}
        </select>
        {(filtPrioridad || filtPeriodicidad) && (
          <button onClick={() => { setFiltPrioridad(''); setFiltPeriodicidad('') }}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-kof-red hover:bg-red-50 transition-colors">
            Limpiar
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-kof-red border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-medium">Cargando tareas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-400">Sin tareas con estos filtros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <TareaCard key={t.id} tarea={t} onClick={() => navigate(`/admin/tareas/${t.id}`)} />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <TareaModal
          tarea={modal?.tarea ?? null}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5
          px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white
          animate-[fadeInUp_0.2s_ease-out] whitespace-nowrap ${
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-kof-red'
          }`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          )}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
