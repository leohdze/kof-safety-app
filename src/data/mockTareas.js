// ─── Catálogos compartidos ────────────────────────────────────────────────────

export const PERIODICIDADES = [
  'Diario','Semanal','Quincenal','Cada 3 semanas',
  'Mensual','Bimensual','Trimestral','Semestral','Anual',
]
export const PERIOCIDAD_STYLE = {
  Diario:'bg-rose-100 text-rose-700',       Semanal:'bg-orange-100 text-orange-700',
  Quincenal:'bg-amber-100 text-amber-700',  'Cada 3 semanas':'bg-yellow-100 text-yellow-700',
  Mensual:'bg-blue-100 text-blue-700',      Bimensual:'bg-indigo-100 text-indigo-700',
  Trimestral:'bg-violet-100 text-violet-700',Semestral:'bg-purple-100 text-purple-700',
  Anual:'bg-gray-100 text-gray-600',
}
export const PRIORIDAD_CFG = {
  Bajo:    { dot:'bg-gray-400',   badge:'bg-gray-100 text-gray-600',    bar:'bg-gray-400'   },
  Medio:   { dot:'bg-amber-400',  badge:'bg-amber-100 text-amber-700',  bar:'bg-amber-400'  },
  Alto:    { dot:'bg-orange-500', badge:'bg-orange-100 text-orange-700',bar:'bg-orange-500' },
  Crítica: { dot:'bg-kof-red',    badge:'bg-red-100 text-kof-red',      bar:'bg-kof-red'    },
}
export const CLASIF_CFG = {
  Operativa: 'bg-blue-100 text-blue-700',
  Normativa: 'bg-purple-100 text-purple-700',
}
export const EVIDENCIAS = ['Foto','PDF','Excel','Word','Video']
export const REGIONES   = [
  'Coecillo','Tenango','Pacífico','Tlaxcala','Toluca',
  'Puebla Foránea','Puebla','Montaña','Acapulco','Cuernavaca',
]
export const UOS = [
  'Coecillo','Tenango','Ixtapan','Tejupilco','Huetamo','Valle de Bravo',
  'Pacífico','Atlihuetzía','Litos Toluca','Puebla Norte','Matamoros',
  'Mega Puebla','Ciel Puebla','Puebla Sur','Taxco','Huitzuco','Iguala',
  'Tlapa','Chilapa','Tierra Colorada','Chilpancingo','KM17','Cuauhtémoc',
  'Cayaco','Renacimiento','Tecpan','Polvorín','Puente de Ixtla','Progreso','Cuernavaca',
]
export const TIPO_ASIGNACION = {
  region:    { label:'Por región',           items:REGIONES },
  uo:        { label:'Por UO',               items:UOS },
  usuario:   { label:'Por usuario específico',items:[
    'Benjamin Torres Tapia','Daniela Nava Gomez','Jesus Fernando Juarez Hernandez',
    'Cristina Rodriguez Valdez','Gustavo Sanchez Avendaño','Jose Angel Lopez Ortega',
    'Alan Miguel Irigoyen','Carlos Enrique Herrera Cortes','Bernardo Galvez Altamirano',
    'Jose Carlos Juarez Gutierrez','Alma Jessica Vidal Peñaloza','Teresa Castro Hernandez',
    'Oscar Eduardo Brito Bustillos','Eder Luis Hernandez Alcocer','Andrea Gadiel Corona Hernandez',
    'Mayra del Carmen Ramirez Tavera','Hector Mauricio Hernandez Jaimes',
  ]},
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function initials(nombre) {
  return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const D = 86400000
const H = 3600000
const NOW = Date.now()

export function getStatusTarea(tarea) {
  const diff = tarea.fechaLimite - NOW
  if (diff < 0)          return 'vencida'
  if (diff < 48 * H)     return 'por-vencer'
  return 'en-tiempo'
}

export function STATUS_CFG(s) {
  if (s === 'vencida')    return { label:'Vencida',    cls:'bg-red-100 text-kof-red border-red-200'       }
  if (s === 'por-vencer') return { label:'Por vencer', cls:'bg-amber-100 text-amber-700 border-amber-200' }
  return                         { label:'En tiempo',  cls:'bg-emerald-100 text-emerald-700 border-emerald-200' }
}

export function timeAgo(ms) {
  if (!ms) return ''
  const diff = NOW - ms
  const d = Math.floor(diff / D)
  const h = Math.floor(diff / H)
  if (d >= 1) return `hace ${d}d`
  if (h >= 1) return `hace ${h}h`
  return 'hace unos min'
}

export function fmtDateTime(ms) {
  if (!ms) return ''
  return new Intl.DateTimeFormat('es-MX', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(ms))
}

export function countdown(ms) {
  const diff = ms - NOW
  if (diff < 0) {
    const abs = -diff
    const d = Math.floor(abs / D)
    if (d >= 1) return `Venció hace ${d}d`
    return `Venció hace ${Math.floor(abs / H)}h`
  }
  const d = Math.floor(diff / D)
  const h = Math.floor((diff % D) / H)
  const m = Math.floor((diff % H) / 60000)
  if (d >= 1) return `${d}d ${h}h`
  if (h >= 1) return `${h}h ${m}m`
  return `${m}m`
}

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_TAREAS = [
  {
    id: 1,
    nombre: 'Inspección de EPP',
    descripcion: 'Auditoría de equipos de protección personal de técnicos de campo',
    periodicidad: 'Semanal', clasificacion: 'Operativa', prioridad: 'Alto',
    requiereVobo: true, fechaLimite: NOW + 5 * D,
    evidencias: ['Foto', 'PDF'], activa: true,
    asignacion: { tipo: 'usuario', valores: ['Benjamin Torres Tapia'] },
    tsds: [
      { userId: 3, nombre: 'Benjamin Torres Tapia', iniciales: 'BT', uo: 'Coecillo', region: 'Coecillo',
        estado: 'pendiente', entregadaEn: null, enTiempo: null, comentario: '', evidencias: [],
        vobo: null, voboAprobadoPor: null, voboAprobadoEn: null, motivoRechazo: null },
    ],
  },
]
