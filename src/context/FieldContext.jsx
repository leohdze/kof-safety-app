import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { getMyAssignments } from '../services/assignmentService'

// ─── Helpers exportados (usados en Home, Tareas y TaskDetail) ─────────────────

const H = 3600000
const D = 86400000

export function getStatus(task) {
  if (task.estado === 'completada') return 'completada'
  if (task.fechaLimite < Date.now()) return 'vencida'
  return 'pendiente'
}

export function getUrgencyLevel(task) {
  const s = getStatus(task)
  if (s === 'completada') return 'done'
  if (s === 'vencida')    return 'overdue'
  const diff = task.fechaLimite - Date.now()
  if (diff < 6  * H) return 'urgent'
  if (diff < 24 * H) return 'warning'
  return 'normal'
}

export function formatDeadline(fechaLimite) {
  const now  = Date.now()
  const diff = fechaLimite - now

  if (diff < 0) {
    const abs = -diff
    const d = Math.floor(abs / D)
    const h = Math.floor(abs / H)
    if (d >= 2) return `Vencida hace ${d} días`
    if (d === 1) return 'Vencida hace 1 día'
    if (h >= 1) return `Vencida hace ${h}h`
    return 'Vencida recientemente'
  }

  const dt    = new Date(fechaLimite)
  const today = new Date()
  const hh    = dt.getHours().toString().padStart(2, '0')
  const mm    = dt.getMinutes().toString().padStart(2, '0')
  const time  = `${hh}:${mm}`

  if (dt.toDateString() === today.toDateString()) return `Hoy ${time}`

  const tmr = new Date(today)
  tmr.setDate(today.getDate() + 1)
  if (dt.toDateString() === tmr.toDateString()) return `Mañana ${time}`

  const days = Math.ceil(diff / D)
  if (days < 7) {
    const wd = ['dom','lun','mar','mié','jue','vie','sáb'][dt.getDay()]
    return `${wd} ${time}`
  }
  return `${dt.getDate()}/${dt.getMonth() + 1} ${time}`
}

export function urgencyLabel(task) {
  const level = getUrgencyLevel(task)
  if (level === 'done') return 'Completada'
  if (level === 'overdue') {
    const abs = Date.now() - task.fechaLimite
    const d = Math.floor(abs / D)
    const h = Math.floor(abs / H)
    return d >= 1 ? `+${d}d` : `+${h}h`
  }
  const diff = task.fechaLimite - Date.now()
  const h = Math.floor(diff / H)
  const m = Math.floor((diff % H) / 60000)
  if (h >= 24) return `${Math.floor(h / 24)}d`
  if (h >= 1) return `${h}h ${m}m`
  return `${m}m`
}

export const URGENCY_STYLE = {
  done:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-50 text-kof-red border-red-200',
  urgent:  'bg-red-50 text-kof-red border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  normal:  'bg-blue-50 text-blue-600 border-blue-200',
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const BASE = Date.now()

const INITIAL_TASKS = [
  {
    id: 1, nombre: 'Check-list de vehículos de servicio',
    descripcion: 'Revisión diaria de condiciones mecánicas y de seguridad de vehículos asignados al campo. Verificar frenos, luces, nivel de aceite, presión de neumáticos y cinturones de seguridad.',
    periodicidad: 'Diario', evidenciasRequeridas: ['Foto'],
    requiereVobo: false,
    materialApoyo: [{ nombre: 'Formato-Checklist-Vehiculos.xlsx', tipo: 'Excel' }],
    fechaLimite: BASE + 2 * H, estado: 'pendiente', completadaEn: null, evidencias: [], comentario: '',
  },
  {
    id: 2, nombre: 'Inspección de extintores',
    descripcion: 'Verificar el estado, vigencia y señalización de todos los extintores en planta. Registrar número de serie, presión y fecha de caducidad del agente extintor.',
    periodicidad: 'Mensual', evidenciasRequeridas: ['Foto', 'PDF'],
    requiereVobo: true,
    materialApoyo: [
      { nombre: 'Procedimiento-Extintores.pdf', tipo: 'PDF' },
      { nombre: 'Formato-Inspeccion-ExtintoresV3.xlsx', tipo: 'Excel' },
    ],
    fechaLimite: BASE + 4.5 * H, estado: 'pendiente', completadaEn: null, evidencias: [], comentario: '',
  },
  {
    id: 3, nombre: 'Revisión de señalética de emergencia',
    descripcion: 'Verificación del estado y visibilidad de señalética, rutas de evacuación y puntos de reunión. Reportar cualquier señal dañada o faltante.',
    periodicidad: 'Mensual', evidenciasRequeridas: ['Foto'],
    requiereVobo: false, materialApoyo: [],
    fechaLimite: BASE - 1.5 * H, estado: 'pendiente', completadaEn: null, evidencias: [], comentario: '',
  },
  {
    id: 4, nombre: 'Auditoría de botiquines',
    descripcion: 'Inventario y reposición de insumos médicos en botiquines de todas las áreas operativas. Verificar fechas de vencimiento de medicamentos y reponer faltantes.',
    periodicidad: 'Quincenal', evidenciasRequeridas: ['Foto', 'Excel'],
    requiereVobo: false,
    materialApoyo: [{ nombre: 'Formato-Inventario-Botiquin.xlsx', tipo: 'Excel' }],
    fechaLimite: BASE + 1.2 * D, estado: 'pendiente', completadaEn: null, evidencias: [], comentario: '',
  },
  {
    id: 5, nombre: 'Revisión de EPP',
    descripcion: 'Auditoría de equipos de protección personal del personal en turno activo. Verificar casco, botas, guantes, lentes protectores y chaleco reflectante.',
    periodicidad: 'Semanal', evidenciasRequeridas: ['Foto'],
    requiereVobo: false, materialApoyo: [],
    fechaLimite: BASE + 2.2 * D, estado: 'pendiente', completadaEn: null, evidencias: [], comentario: '',
  },
  {
    id: 6, nombre: 'Inspección de andamios',
    descripcion: 'Revisión de condiciones estructurales y señalización de andamios activos en obra. Verificar anclajes, tablones y protecciones perimetrales.',
    periodicidad: 'Semanal', evidenciasRequeridas: ['Foto', 'PDF'],
    requiereVobo: true,
    materialApoyo: [{ nombre: 'Estandar-Andamios-Seguros.pdf', tipo: 'PDF' }],
    fechaLimite: BASE + 4 * D, estado: 'pendiente', completadaEn: null, evidencias: [], comentario: '',
  },
  {
    id: 7, nombre: 'Registro de incidentes y cuasi-accidentes',
    descripcion: 'Reporte semanal de incidentes menores, cuasi-accidentes y condiciones inseguras observadas durante la semana en la unidad operativa.',
    periodicidad: 'Semanal', evidenciasRequeridas: ['PDF', 'Word'],
    requiereVobo: false,
    materialApoyo: [{ nombre: 'Formato-Reporte-Incidentes.docx', tipo: 'Word' }],
    fechaLimite: BASE + 5 * D, estado: 'pendiente', completadaEn: null, evidencias: [], comentario: '',
  },
  {
    id: 8, nombre: 'Capacitación en materiales peligrosos',
    descripcion: 'Sesión de reforzamiento mensual sobre protocolos de manejo seguro de materiales peligrosos. Incluir registro de asistencia firmado.',
    periodicidad: 'Mensual', evidenciasRequeridas: ['PDF', 'Video'],
    requiereVobo: true,
    materialApoyo: [
      { nombre: 'Presentacion-MatPeligrosos.pdf', tipo: 'PDF' },
      { nombre: 'Lista-Asistencia.docx', tipo: 'Word' },
    ],
    fechaLimite: BASE + 12 * D, estado: 'pendiente', completadaEn: null, evidencias: [], comentario: '',
  },
  {
    id: 9, nombre: 'Prueba de sistemas contra incendio',
    descripcion: 'Verificación operacional de aspersores, alarmas y sistemas de detección de humo en todas las áreas. Registrar resultado de cada prueba por zona.',
    periodicidad: 'Trimestral', evidenciasRequeridas: ['Video', 'PDF'],
    requiereVobo: true,
    materialApoyo: [{ nombre: 'Protocolo-Prueba-SCI.pdf', tipo: 'PDF' }],
    fechaLimite: BASE + 22 * D, estado: 'pendiente', completadaEn: null, evidencias: [], comentario: '',
  },
  {
    id: 10, nombre: 'Evaluación de riesgos trimestral',
    descripcion: 'Identificación y documentación formal de riesgos en la unidad operativa. Usar formato IPERC (Identificación de Peligros y Evaluación de Riesgos y Controles).',
    periodicidad: 'Trimestral', evidenciasRequeridas: ['PDF', 'Excel', 'Word'],
    requiereVobo: true,
    materialApoyo: [{ nombre: 'Formato-IPERC.xlsx', tipo: 'Excel' }],
    fechaLimite: BASE - 5 * D, estado: 'pendiente', completadaEn: null, evidencias: [], comentario: '',
  },
  {
    id: 11, nombre: 'Limpieza y orden de áreas de trabajo',
    descripcion: 'Verificación de estándares 5S en áreas operativas: clasificar, ordenar, limpiar, estandarizar y sostener.',
    periodicidad: 'Diario', evidenciasRequeridas: ['Foto'],
    requiereVobo: false, materialApoyo: [],
    fechaLimite: BASE - 1 * D, estado: 'completada', completadaEn: BASE - 4 * H,
    evidencias: [], comentario: 'Área principal y almacén revisados. Todo en orden.',
  },
  {
    id: 12, nombre: 'Control de acceso a zonas restringidas',
    descripcion: 'Verificación de registros de acceso y vigencia de permisos para zonas de acceso controlado.',
    periodicidad: 'Quincenal', evidenciasRequeridas: ['PDF', 'Excel'],
    requiereVobo: false, materialApoyo: [],
    fechaLimite: BASE - 3 * D, estado: 'completada', completadaEn: BASE - 3 * D + 2 * H,
    evidencias: [], comentario: '',
  },
]

// ─── Context ──────────────────────────────────────────────────────────────────

const FieldContext = createContext(null)

export function FieldProvider({ children }) {
  const { user } = useAuth()
  const [tasks, setTasks]       = useState(INITIAL_TASKS)
  const [loading, setLoading]   = useState(false)
  const [fromDB, setFromDB]     = useState(false)
  const [usingMock, setUsingMock] = useState(false)
  const [profile, setProfile]   = useState(null)

  async function loadTasksFromDB(uid) {
    setLoading(true)
    try {
      const dbTasks = await getMyAssignments(uid)
      if (dbTasks.length > 0) {
        setTasks(dbTasks)
        setFromDB(true)
        setUsingMock(false)
      } else {
        setUsingMock(true)
      }
    } catch (err) {
      console.warn('[FieldContext] Supabase unavailable, using mock tasks:', err.message)
      setUsingMock(true)
    } finally {
      setLoading(false)
    }
  }

  // Cargar asignaciones activas
  useEffect(() => {
    if (!user?.id) return
    loadTasksFromDB(user.id)
  }, [user?.id])

  async function refreshTasks() {
    if (!user?.id) return
    await loadTasksFromDB(user.id)
  }

  // Cargar perfil del TSD
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('user_profiles')
      .select('id, full_name, region, uo, subrole, is_active')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data) })
      .catch(err => {
        console.warn('[FieldContext] profile fetch error:', err.message)
      })
  }, [user?.id])

  function completeTask(id, { evidencias, comentario }) {
    setTasks(ts => ts.map(t =>
      String(t.id) === String(id)
        ? { ...t, estado: 'completada', completadaEn: Date.now(), evidencias, comentario }
        : t
    ))
  }

  return (
    <FieldContext.Provider value={{ tasks, completeTask, loading, fromDB, usingMock, profile, refreshTasks }}>
      {children}
    </FieldContext.Provider>
  )
}

export function useField() {
  const ctx = useContext(FieldContext)
  if (!ctx) throw new Error('useField debe usarse dentro de FieldProvider')
  return ctx
}
