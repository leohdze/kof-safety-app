import { useState, useMemo } from 'react'
import Modal from '../../components/common/Modal'

// ─── Catálogos ────────────────────────────────────────────────────────────────

const PERIODICIDADES = [
  'Diario', 'Semanal', 'Quincenal', 'Cada 3 semanas',
  'Mensual', 'Bimensual', 'Trimestral', 'Semestral', 'Anual',
]

const FILTER_CHIPS = [
  { label: 'Todas', value: null },
  { label: 'Diarias', value: 'Diario' },
  { label: 'Semanales', value: 'Semanal' },
  { label: 'Quincenales', value: 'Quincenal' },
  { label: 'Mensuales', value: 'Mensual' },
  { label: 'Trimestrales', value: 'Trimestral' },
  { label: 'Semestrales', value: 'Semestral' },
  { label: 'Anuales', value: 'Anual' },
]

const PERIODICIDAD_STYLE = {
  Diario:          'bg-rose-100 text-rose-700',
  Semanal:         'bg-orange-100 text-orange-700',
  Quincenal:       'bg-amber-100 text-amber-700',
  'Cada 3 semanas':'bg-yellow-100 text-yellow-700',
  Mensual:         'bg-blue-100 text-blue-700',
  Bimensual:       'bg-indigo-100 text-indigo-700',
  Trimestral:      'bg-violet-100 text-violet-700',
  Semestral:       'bg-purple-100 text-purple-700',
  Anual:           'bg-gray-100 text-gray-600',
}

const EVIDENCIAS      = ['Foto', 'PDF', 'Excel', 'Word', 'Video']
const EVIDENCIA_ICONS = { Foto: '📷', PDF: '📄', Excel: '📊', Word: '📝', Video: '🎥' }

const REGIONES    = ['Norte', 'Noreste', 'Centro', 'Occidente', 'Sur', 'Sureste']
const UOS         = ['Terminal Monterrey', 'Planta Guadalajara', 'Complejo Veracruz', 'Refinería Salamanca', 'Terminal CDMX', 'Planta Mérida']
const EJECUTIVOS  = ['Carlos Mendoza', 'Laura Vega', 'Diana Flores']
const USUARIOS_FIELD = ['Ana García', 'Roberto Ríos', 'Miguel Torres', 'Patricia Luna', 'Héctor Sánchez']

const TIPO_ASIGNACION = {
  region:    { label: 'Por región',           items: REGIONES },
  ejecutivo: { label: 'Por ejecutivo',         items: EJECUTIVOS },
  uo:        { label: 'Por UO',                items: UOS },
  usuario:   { label: 'Por usuario específico',items: USUARIOS_FIELD },
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_ROUTINES = [
  { id: 1,  nombre: 'Inspección de extintores',            descripcion: 'Verificar el estado, vigencia y señalización de todos los extintores en planta.',          periodicidad: 'Mensual',    vobo: true,  asignacion: { tipo: 'region',    valores: ['Norte', 'Noreste'] },              evidencias: ['Foto', 'PDF'],           activa: true  },
  { id: 2,  nombre: 'Revisión de EPP',                     descripcion: 'Auditoría de equipos de protección personal de técnicos de campo en turno activo.',         periodicidad: 'Semanal',    vobo: false, asignacion: { tipo: 'usuario',   valores: ['Ana García', 'Héctor Sánchez'] },   evidencias: ['Foto'],                 activa: true  },
  { id: 3,  nombre: 'Evaluación de riesgos trimestral',    descripcion: 'Identificación y documentación formal de riesgos en cada unidad operativa.',               periodicidad: 'Trimestral', vobo: true,  asignacion: { tipo: 'uo',        valores: ['Terminal Monterrey', 'Planta Guadalajara'] }, evidencias: ['PDF', 'Excel', 'Word'], activa: true  },
  { id: 4,  nombre: 'Simulacro de evacuación',             descripcion: 'Ejercicio de evacuación y conteo de personal en todas las instalaciones del complejo.',     periodicidad: 'Semestral',  vobo: true,  asignacion: { tipo: 'ejecutivo', valores: ['Carlos Mendoza'] },               evidencias: ['Foto', 'Video', 'PDF'], activa: false },
  { id: 5,  nombre: 'Check-list de vehículos de servicio', descripcion: 'Revisión diaria de condiciones mecánicas y de seguridad de vehículos asignados al campo.',  periodicidad: 'Diario',     vobo: false, asignacion: { tipo: 'region',    valores: ['Centro', 'Sur'] },                 evidencias: ['Foto'],                 activa: true  },
  { id: 6,  nombre: 'Capacitación en manejo de materiales peligrosos', descripcion: 'Sesión de reforzamiento mensual sobre protocolos de manejo seguro de materiales peligrosos.', periodicidad: 'Mensual', vobo: true, asignacion: { tipo: 'uo', valores: ['Refinería Salamanca', 'Complejo Veracruz'] }, evidencias: ['PDF', 'Video'], activa: true },
  { id: 7,  nombre: 'Inspección de andamios',              descripcion: 'Revisión de condiciones estructurales y señalización de andamios activos en obra.',         periodicidad: 'Semanal',    vobo: true,  asignacion: { tipo: 'region',    valores: ['Occidente'] },                     evidencias: ['Foto', 'PDF'],           activa: true  },
  { id: 8,  nombre: 'Control de acceso a zonas restringidas', descripcion: 'Verificación de registros de acceso y vigencia de permisos para zonas de acceso controlado.', periodicidad: 'Quincenal', vobo: false, asignacion: { tipo: 'uo', valores: ['Terminal CDMX', 'Planta Mérida'] }, evidencias: ['PDF', 'Excel'], activa: true },
  { id: 9,  nombre: 'Revisión de señalética de emergencia', descripcion: 'Verificación del estado y visibilidad de señalética, rutas de evacuación y puntos de reunión.', periodicidad: 'Mensual', vobo: false, asignacion: { tipo: 'region', valores: ['Norte', 'Noreste', 'Centro'] }, evidencias: ['Foto'], activa: true },
  { id: 10, nombre: 'Auditoría de botiquines',              descripcion: 'Inventario y reposición de insumos médicos en botiquines de todas las áreas operativas.',   periodicidad: 'Quincenal',  vobo: false, asignacion: { tipo: 'usuario',   valores: ['Patricia Luna', 'Roberto Ríos'] }, evidencias: ['Foto', 'Excel'],         activa: true  },
  { id: 11, nombre: 'Prueba de sistemas contra incendio',   descripcion: 'Verificación operacional de aspersores, alarmas y sistemas de detección de humo.',          periodicidad: 'Trimestral', vobo: true,  asignacion: { tipo: 'uo',        valores: ['Planta Guadalajara', 'Planta Mérida'] }, evidencias: ['Video', 'PDF'],        activa: true  },
  { id: 12, nombre: 'Revisión de montacargas y grúas',     descripcion: 'Inspección de condiciones operativas y certificaciones de equipos de carga y elevación.',   periodicidad: 'Mensual',    vobo: true,  asignacion: { tipo: 'region',    valores: ['Sur', 'Sureste'] },                evidencias: ['Foto', 'PDF'],           activa: true  },
  { id: 13, nombre: 'Registro de incidentes y cuasi-accidentes', descripcion: 'Reporte semanal de incidentes menores, cuasi-accidentes y condiciones inseguras observadas.', periodicidad: 'Semanal', vobo: false, asignacion: { tipo: 'usuario', valores: ['Ana García', 'Héctor Sánchez', 'Roberto Ríos'] }, evidencias: ['PDF', 'Word'], activa: true },
  { id: 14, nombre: 'Evaluación anual de cultura de seguridad', descripcion: 'Encuesta y evaluación anual del nivel de cultura de seguridad en todas las UOs.',       periodicidad: 'Anual',      vobo: true,  asignacion: { tipo: 'ejecutivo', valores: ['Laura Vega', 'Diana Flores'] },    evidencias: ['Excel', 'PDF', 'Word'], activa: true  },
  { id: 15, nombre: 'Inspección de instalaciones eléctricas', descripcion: 'Revisión de tableros, cableado expuesto, conexiones y puesta a tierra de instalaciones.', periodicidad: 'Trimestral', vobo: true,  asignacion: { tipo: 'uo',        valores: ['Terminal Monterrey', 'Terminal CDMX'] }, evidencias: ['Foto', 'PDF'],         activa: false },
  { id: 16, nombre: 'Limpieza y orden de áreas de trabajo', descripcion: 'Verificación de estándares 5S en áreas operativas: clasificar, ordenar, limpiar, estandarizar, sostener.', periodicidad: 'Diario', vobo: false, asignacion: { tipo: 'region', valores: ['Norte', 'Noreste', 'Centro', 'Occidente', 'Sur', 'Sureste'] }, evidencias: ['Foto'], activa: true },
  { id: 17, nombre: 'Revisión de permisos de trabajo en altura', descripcion: 'Auditoría de permisos activos para trabajos en altura y verificación de arneses.',    periodicidad: 'Semanal',    vobo: true,  asignacion: { tipo: 'region',    valores: ['Norte', 'Sur'] },                  evidencias: ['Foto', 'PDF'],           activa: true  },
  { id: 18, nombre: 'Control de inventario de EPP',         descripcion: 'Levantamiento bimensual de inventario de equipos de protección personal en almacén.',       periodicidad: 'Bimensual',  vobo: false, asignacion: { tipo: 'uo',        valores: ['Refinería Salamanca'] },           evidencias: ['Excel'],                activa: true  },
  { id: 19, nombre: 'Revisión de procedimientos operativos', descripcion: 'Verificación de vigencia y cumplimiento de procedimientos operativos estándar de seguridad.', periodicidad: 'Semestral', vobo: true, asignacion: { tipo: 'ejecutivo', valores: ['Carlos Mendoza', 'Laura Vega', 'Diana Flores'] }, evidencias: ['PDF', 'Word'], activa: true },
  { id: 20, nombre: 'Inspección de tuberías y válvulas',    descripcion: 'Revisión visual y de presión de tuberías críticas y válvulas de seguridad en planta.',     periodicidad: 'Mensual',    vobo: true,  asignacion: { tipo: 'uo',        valores: ['Complejo Veracruz', 'Refinería Salamanca'] }, evidencias: ['Foto', 'PDF'],        activa: true  },
  { id: 21, nombre: 'Capacitación en primeros auxilios',    descripcion: 'Sesión trimestral de actualización en técnicas de primeros auxilios para brigadistas.',     periodicidad: 'Trimestral', vobo: false, asignacion: { tipo: 'usuario',   valores: ['Miguel Torres', 'Patricia Luna'] }, evidencias: ['Foto', 'PDF'],         activa: true  },
  { id: 22, nombre: 'Check-list de laboratorio',            descripcion: 'Revisión diaria de condiciones de seguridad en laboratorios de análisis y control de calidad.', periodicidad: 'Diario', vobo: false, asignacion: { tipo: 'uo', valores: ['Planta Guadalajara'] }, evidencias: ['Foto', 'Excel'], activa: false },
]

const BLANK_FORM = {
  nombre: '', descripcion: '', periodicidad: 'Mensual',
  vobo: false, asignacion: { tipo: 'region', valores: [] },
  evidencias: [], activa: true,
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function CheckboxChips({ options, selected, onChange }) {
  function toggle(item) {
    onChange(selected.includes(item) ? selected.filter(x => x !== item) : [...selected, item])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(item => (
        <button key={item} type="button" onClick={() => toggle(item)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${selected.includes(item) ? 'bg-kof-red text-white border-kof-red' : 'bg-white text-gray-600 border-gray-200 hover:border-kof-red/40'}`}>
          {item}
        </button>
      ))}
    </div>
  )
}

function RoutineForm({ form, setForm, isEdit, onSubmit, onCancel }) {
  const tipoOpts = TIPO_ASIGNACION[form.asignacion.tipo]
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la rutina</label>
        <input className="input-field" required value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción breve</label>
        <textarea className="input-field resize-none" rows={2} value={form.descripcion}
          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Periodicidad</label>
        <select className="input-field" value={form.periodicidad}
          onChange={e => setForm(f => ({ ...f, periodicidad: e.target.value }))}>
          {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-700">Requiere VoBo del ejecutivo</p>
          <p className="text-xs text-gray-400 mt-0.5">El ejecutivo debe aprobar la evidencia enviada</p>
        </div>
        <button type="button" onClick={() => setForm(f => ({ ...f, vobo: !f.vobo }))}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-kof-red focus:ring-offset-2 ${form.vobo ? 'bg-kof-red' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.vobo ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Asignar a</label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {Object.entries(TIPO_ASIGNACION).map(([tipo, { label }]) => (
            <button key={tipo} type="button"
              onClick={() => setForm(f => ({ ...f, asignacion: { tipo, valores: [] } }))}
              className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all ${form.asignacion.tipo === tipo ? 'bg-kof-red/5 border-kof-red text-kof-red' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">{tipoOpts.label}</p>
          <CheckboxChips options={tipoOpts.items} selected={form.asignacion.valores}
            onChange={valores => setForm(f => ({ ...f, asignacion: { ...f.asignacion, valores } }))} />
          {form.asignacion.valores.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">Selecciona al menos una opción</p>
          )}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipos de evidencia aceptados</label>
        <CheckboxChips options={EVIDENCIAS} selected={form.evidencias}
          onChange={evidencias => setForm(f => ({ ...f, evidencias }))} />
        {form.evidencias.length === 0 && (
          <p className="text-xs text-red-400 mt-1.5">Selecciona al menos un tipo</p>
        )}
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit"
          disabled={form.evidencias.length === 0 || form.asignacion.valores.length === 0}
          className="flex-1 py-2.5 rounded-xl bg-kof-red text-white text-sm font-semibold hover:bg-kof-red-dark active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {isEdit ? 'Guardar cambios' : 'Crear rutina'}
        </button>
      </div>
    </form>
  )
}

// Fila de la lista (panel izquierdo)
function RoutineRow({ routine, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-gray-50 transition-all group ${isSelected ? 'bg-kof-red/5 border-l-2 border-l-kof-red' : 'hover:bg-gray-50 border-l-2 border-l-transparent'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={`text-sm font-semibold leading-snug line-clamp-1 ${isSelected ? 'text-kof-red' : 'text-gray-800'}`}>
          {routine.nombre}
        </p>
        {!routine.activa && (
          <span className="text-[10px] font-semibold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
            Inactiva
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 line-clamp-1 mb-2">{routine.descripcion}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PERIODICIDAD_STYLE[routine.periodicidad] ?? 'bg-gray-100 text-gray-600'}`}>
          {routine.periodicidad}
        </span>
        {routine.vobo && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            VoBo
          </span>
        )}
        <span className="text-[11px] text-gray-400 ml-auto">
          {routine.evidencias.map(e => EVIDENCIA_ICONS[e]).join(' ')}
        </span>
      </div>
    </button>
  )
}

// Panel derecho — detalle
function DetailPanel({ routine, onEdit, onToggle }) {
  if (!routine) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-400">Selecciona una rutina para ver el detalle</p>
      </div>
    )
  }

  const { label: assignLabel } = TIPO_ASIGNACION[routine.asignacion.tipo]

  return (
    <div className="h-full overflow-y-auto">
      {/* Detail header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-8 py-5 z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PERIODICIDAD_STYLE[routine.periodicidad] ?? 'bg-gray-100 text-gray-600'}`}>
                {routine.periodicidad}
              </span>
              {!routine.activa && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">
                  Inactiva
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{routine.nombre}</h2>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => onEdit(routine)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button onClick={() => onToggle(routine)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${routine.activa ? 'text-kof-red border-red-100 hover:bg-red-50' : 'text-emerald-600 border-emerald-100 hover:bg-emerald-50'}`}>
              {routine.activa ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pausar
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Activar
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Detail body */}
      <div className="px-8 py-6 space-y-6">

        {/* Descripción */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Descripción</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{routine.descripcion || 'Sin descripción.'}</p>
        </section>

        {/* Configuración */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Configuración</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Periodicidad</p>
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${PERIODICIDAD_STYLE[routine.periodicidad]}`}>
                {routine.periodicidad}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">VoBo ejecutivo</p>
              <div className="flex items-center gap-1.5">
                {routine.vobo ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-emerald-700">Requerido</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-500">No requerido</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Asignación */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Asignación — {assignLabel}</h3>
          <div className="flex flex-wrap gap-2">
            {routine.asignacion.valores.map(v => (
              <span key={v} className="bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full border border-blue-100">
                {v}
              </span>
            ))}
          </div>
        </section>

        {/* Evidencias */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tipos de evidencia aceptados</h3>
          <div className="flex flex-wrap gap-2">
            {routine.evidencias.map(e => (
              <span key={e} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-xl">
                <span>{EVIDENCIA_ICONS[e]}</span>
                {e}
              </span>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function Routines() {
  const [routines, setRoutines]       = useState(MOCK_ROUTINES)
  const [selected, setSelected]       = useState(null)
  const [search, setSearch]           = useState('')
  const [filterPeriod, setFilterPeriod] = useState(null)
  const [modal, setModal]             = useState(null)
  const [editRoutine, setEditRoutine] = useState(null)
  const [form, setForm]               = useState(BLANK_FORM)

  const filtered = useMemo(() => {
    return routines.filter(r => {
      const q = search.toLowerCase()
      const matchSearch = !q || r.nombre.toLowerCase().includes(q) || r.descripcion.toLowerCase().includes(q)
      const matchPeriod = !filterPeriod || r.periodicidad === filterPeriod
      return matchSearch && matchPeriod
    })
  }, [routines, search, filterPeriod])

  // Si la rutina seleccionada desaparece por filtro, la mantenemos en detalle
  const detailRoutine = selected ? routines.find(r => r.id === selected) ?? null : null

  function openCreate() {
    setForm(BLANK_FORM)
    setModal('create')
  }

  function openEdit(routine) {
    setEditRoutine(routine)
    setForm({ ...routine })
    setModal('edit')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (modal === 'create') {
      const nuevo = { ...form, id: Date.now() }
      setRoutines(r => [nuevo, ...r])
      setSelected(nuevo.id)
    } else {
      setRoutines(r => r.map(x => x.id === editRoutine.id ? { ...x, ...form } : x))
    }
    setModal(null)
  }

  function toggleActiva(routine) {
    setRoutines(r => r.map(x => x.id === routine.id ? { ...x, activa: !x.activa } : x))
  }

  return (
    <div className="h-full flex flex-col bg-white">

      {/* ── Barra superior ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-white">
        {/* Título + búsqueda + botón */}
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <h1 className="text-xl font-bold text-gray-900">Rutinas</h1>
            <span className="text-sm font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {routines.length}
            </span>
          </div>
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input
              className="input-field pl-9 py-2 text-sm"
              placeholder="Buscar por nombre o descripción…"
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
          <button onClick={openCreate}
            className="flex-shrink-0 flex items-center gap-1.5 bg-kof-red text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-kof-red-dark active:scale-95 transition-all shadow-sm shadow-kof-red/30">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva rutina
          </button>
        </div>

        {/* Chips de periodicidad */}
        <div className="flex items-center gap-1.5 px-6 pb-3 overflow-x-auto scrollbar-hide">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.label}
              onClick={() => setFilterPeriod(chip.value)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterPeriod === chip.value
                  ? 'bg-kof-red text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dos paneles ────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Panel izquierdo — lista */}
        <div className="w-[40%] flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-white">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300 text-sm">
              <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              Sin resultados
            </div>
          ) : (
            filtered.map(routine => (
              <RoutineRow
                key={routine.id}
                routine={routine}
                isSelected={selected === routine.id}
                onClick={() => setSelected(routine.id === selected ? null : routine.id)}
              />
            ))
          )}
        </div>

        {/* Panel derecho — detalle */}
        <div className="flex-1 min-w-0 bg-kof-bg">
          <DetailPanel
            routine={detailRoutine}
            onEdit={openEdit}
            onToggle={toggleActiva}
          />
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Nueva rutina' : 'Editar rutina'}
        size="lg"
      >
        <RoutineForm
          form={form}
          setForm={setForm}
          isEdit={modal === 'edit'}
          onSubmit={handleSubmit}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  )
}
