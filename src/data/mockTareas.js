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
    nombre: 'Inspección de extintores',
    descripcion: 'Verificar el estado, vigencia y señalización de todos los extintores en planta. Registrar número de serie, presión y fecha de caducidad del agente extintor.',
    periodicidad: 'Mensual', clasificacion: 'Normativa', prioridad: 'Crítica',
    requiereVobo: true, fechaLimite: NOW + 5 * D,
    evidencias: ['Foto','PDF'], activa: true,
    asignacion: { tipo: 'region', valores: ['Coecillo','Tenango'] },
    tsds: [
      { userId:3, nombre:'Benjamin Torres Tapia',   iniciales:'BT', uo:'Coecillo',              region:'Coecillo',
        estado:'entregada', entregadaEn: NOW - 2*D, enTiempo:true,
        comentario:'Todos los extintores revisados. Se detectó uno con presión baja en almacén norte, ya reportado al coordinador.',
        evidencias:[{nombre:'extintor_frente.jpg',tipo:'image',url:null},{nombre:'extintor_placa.jpg',tipo:'image',url:null},{nombre:'Formato-Extintores-Jun.pdf',tipo:'pdf',url:null}],
        vobo:'aprobado', voboAprobadoPor:'Leonardo Hernandez Esquivel', voboAprobadoEn: NOW - 1*D, motivoRechazo:null },
      { userId:4, nombre:'Daniela Nava Gomez',     iniciales:'DN', uo:'Tenango, Ixtapan, Tejupilco', region:'Tenango',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
    ],
  },
  {
    id: 2,
    nombre: 'Revisión de EPP',
    descripcion: 'Auditoría de equipos de protección personal de TSDs en turno activo. Verificar casco, botas, guantes, lentes protectores y chaleco reflectante.',
    periodicidad: 'Semanal', clasificacion: 'Operativa', prioridad: 'Medio',
    requiereVobo: false, fechaLimite: NOW + 40 * H,
    evidencias: ['Foto'], activa: true,
    asignacion: { tipo: 'usuario', valores: ['Cristina Rodriguez Valdez','Gustavo Sanchez Avendaño','Jose Angel Lopez Ortega'] },
    tsds: [
      { userId:6,  nombre:'Cristina Rodriguez Valdez', iniciales:'CR', uo:'Pacífico',      region:'Pacífico',
        estado:'entregada', entregadaEn: NOW - 8*H, enTiempo:true,
        comentario:'Todo en orden. Personal con EPP completo.',
        evidencias:[{nombre:'epp_pacífico_01.jpg',tipo:'image',url:null},{nombre:'epp_pacífico_02.jpg',tipo:'image',url:null}],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:7,  nombre:'Gustavo Sanchez Avendaño',  iniciales:'GS', uo:'Atlihuetzía',   region:'Tlaxcala',
        estado:'entregada', entregadaEn: NOW - 3*H, enTiempo:true,
        comentario:'2 operadores sin lentes protectores, se les dio equipo de almacén.',
        evidencias:[{nombre:'epp_atlihue_01.jpg',tipo:'image',url:null}],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:8,  nombre:'Jose Angel Lopez Ortega',   iniciales:'JL', uo:'Litos Toluca',   region:'Toluca',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
    ],
  },
  {
    id: 3,
    nombre: 'Evaluación de riesgos trimestral',
    descripcion: 'Identificación y documentación formal de riesgos en cada unidad operativa. Usar formato IPERC.',
    periodicidad: 'Trimestral', clasificacion: 'Normativa', prioridad: 'Alto',
    requiereVobo: true, fechaLimite: NOW - 3 * D,
    evidencias: ['PDF','Excel','Word'], activa: true,
    asignacion: { tipo: 'usuario', valores: ['Alma Jessica Vidal Peñaloza','Teresa Castro Hernandez'] },
    tsds: [
      { userId:13, nombre:'Alma Jessica Vidal Peñaloza', iniciales:'AV', uo:'Taxco, Huitzuco, Iguala', region:'Montaña',
        estado:'entregada', entregadaEn: NOW - 1*D, enTiempo:false,
        comentario:'IPERC completado con los tres UOs. Identificados 12 riesgos nuevos en Taxco.',
        evidencias:[{nombre:'IPERC-Taxco-Q2.xlsx',tipo:'excel',url:null},{nombre:'IPERC-Iguala-Q2.xlsx',tipo:'excel',url:null},{nombre:'Reporte-Riesgos-Q2.pdf',tipo:'pdf',url:null}],
        vobo:'pendiente', voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:14, nombre:'Teresa Castro Hernandez', iniciales:'TC', uo:'Tlapa, Chilapa', region:'Montaña',
        estado:'vencida', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
    ],
  },
  {
    id: 4,
    nombre: 'Check-list de vehículos de servicio',
    descripcion: 'Revisión diaria de condiciones mecánicas y de seguridad de vehículos asignados. Verificar frenos, luces, aceite y presión de neumáticos.',
    periodicidad: 'Diario', clasificacion: 'Operativa', prioridad: 'Bajo',
    requiereVobo: false, fechaLimite: NOW + 1 * D,
    evidencias: ['Foto'], activa: true,
    asignacion: { tipo: 'region', valores: ['Pacífico','Acapulco'] },
    tsds: [
      { userId:6,  nombre:'Cristina Rodriguez Valdez', iniciales:'CR', uo:'Pacífico',    region:'Pacífico',
        estado:'entregada', entregadaEn: NOW - 4*H, enTiempo:true,
        comentario:'4 vehículos revisados. Unidad 3 con neumático delantero izquierdo con presión baja.',
        evidencias:[{nombre:'checklist_vehiculos_pac.jpg',tipo:'image',url:null},{nombre:'checklist_vehiculos_pac_2.jpg',tipo:'image',url:null}],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:15, nombre:'Oscar Eduardo Brito Bustillos', iniciales:'OB', uo:'Tierra Colorada, Chilpancingo', region:'Acapulco',
        estado:'entregada', entregadaEn: NOW - 6*H, enTiempo:true,
        comentario:'Todo en condiciones óptimas.',
        evidencias:[{nombre:'checklist_veh_acapulco.jpg',tipo:'image',url:null}],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:16, nombre:'Eder Luis Hernandez Alcocer', iniciales:'EH', uo:'KM17, Cuauhtémoc', region:'Acapulco',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
    ],
  },
  {
    id: 5,
    nombre: 'Capacitación en materiales peligrosos',
    descripcion: 'Sesión de reforzamiento mensual sobre protocolos de manejo seguro de materiales peligrosos. Incluir registro de asistencia firmado.',
    periodicidad: 'Mensual', clasificacion: 'Normativa', prioridad: 'Alto',
    requiereVobo: true, fechaLimite: NOW + 8 * D,
    evidencias: ['PDF','Video'], activa: true,
    asignacion: { tipo: 'uo', valores: ['KM17','Chilpancingo'] },
    tsds: [
      { userId:9,  nombre:'Alan Miguel Irigoyen', iniciales:'AI', uo:'Puebla Norte, Matamoros', region:'Puebla',
        estado:'entregada', entregadaEn: NOW - 1*D, enTiempo:true,
        comentario:'22 asistentes. Se cubrió manejo de cloro y ácido cítrico. Video de 8 min adjunto.',
        evidencias:[{nombre:'lista-asistencia-mat-pel.jpg',tipo:'image',url:null},{nombre:'Lista-Asistencia-Jun26.docx',tipo:'word',url:null},{nombre:'evidencia-cap-matpel.mp4',tipo:'video',url:null}],
        vobo:'pendiente', voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:16, nombre:'Eder Luis Hernandez Alcocer', iniciales:'EH', uo:'KM17, Cuauhtémoc', region:'Acapulco',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:15, nombre:'Oscar Eduardo Brito Bustillos', iniciales:'OB', uo:'Tierra Colorada, Chilpancingo', region:'Acapulco',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
    ],
  },
  {
    id: 6,
    nombre: 'Inspección de andamios',
    descripcion: 'Revisión de condiciones estructurales y señalización de andamios activos en obra. Verificar anclajes, tablones y protecciones perimetrales.',
    periodicidad: 'Semanal', clasificacion: 'Normativa', prioridad: 'Crítica',
    requiereVobo: true, fechaLimite: NOW + 36 * H,
    evidencias: ['Foto','PDF'], activa: true,
    asignacion: { tipo: 'region', valores: ['Tlaxcala'] },
    tsds: [
      { userId:7, nombre:'Gustavo Sanchez Avendaño', iniciales:'GS', uo:'Atlihuetzía', region:'Tlaxcala',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
    ],
  },
  {
    id: 7,
    nombre: 'Registro de incidentes y cuasi-accidentes',
    descripcion: 'Reporte semanal de incidentes menores, cuasi-accidentes y condiciones inseguras observadas durante la semana.',
    periodicidad: 'Semanal', clasificacion: 'Operativa', prioridad: 'Medio',
    requiereVobo: false, fechaLimite: NOW + 5 * D,
    evidencias: ['PDF','Word'], activa: true,
    asignacion: { tipo: 'usuario', valores: ['Benjamin Torres Tapia','Eder Luis Hernandez Alcocer','Andrea Gadiel Corona Hernandez'] },
    tsds: [
      { userId:3,  nombre:'Benjamin Torres Tapia',       iniciales:'BT', uo:'Coecillo',              region:'Coecillo',
        estado:'entregada', entregadaEn: NOW - 12*H, enTiempo:true,
        comentario:'Sin incidentes esta semana. Se reportó una condición insegura: fuga menor en tubería de condensado.',
        evidencias:[{nombre:'Reporte-Incidentes-BT-S24.pdf',tipo:'pdf',url:null}],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:16, nombre:'Eder Luis Hernandez Alcocer', iniciales:'EH', uo:'KM17, Cuauhtémoc',      region:'Acapulco',
        estado:'entregada', entregadaEn: NOW - 20*H, enTiempo:false,
        comentario:'1 cuasi-accidente por derrame de producto en área de llenado.',
        evidencias:[{nombre:'Reporte-Incidentes-EH-S24.docx',tipo:'word',url:null},{nombre:'foto_derrame.jpg',tipo:'image',url:null}],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:17, nombre:'Andrea Gadiel Corona Hernandez', iniciales:'AC', uo:'Cayaco, Renacimiento, Tecpan', region:'Acapulco',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
    ],
  },
  {
    id: 8,
    nombre: 'Auditoría de botiquines',
    descripcion: 'Inventario y reposición de insumos médicos en botiquines de todas las áreas operativas. Verificar fechas de vencimiento.',
    periodicidad: 'Quincenal', clasificacion: 'Operativa', prioridad: 'Bajo',
    requiereVobo: false, fechaLimite: NOW + 10 * D,
    evidencias: ['Foto','Excel'], activa: true,
    asignacion: { tipo: 'usuario', valores: ['Alma Jessica Vidal Peñaloza','Teresa Castro Hernandez'] },
    tsds: [
      { userId:13, nombre:'Alma Jessica Vidal Peñaloza', iniciales:'AV', uo:'Taxco, Huitzuco, Iguala', region:'Montaña',
        estado:'entregada', entregadaEn: NOW - 2*D, enTiempo:true,
        comentario:'Botiquín de Taxco repuesto completamente. Iguala requiere gasas y vendas.',
        evidencias:[{nombre:'botiquin_taxco.jpg',tipo:'image',url:null},{nombre:'Inventario-Botiquines-Jun.xlsx',tipo:'excel',url:null}],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:14, nombre:'Teresa Castro Hernandez', iniciales:'TC', uo:'Tlapa, Chilapa', region:'Montaña',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
    ],
  },
  {
    id: 9,
    nombre: 'Prueba de sistemas contra incendio',
    descripcion: 'Verificación operacional de aspersores, alarmas y sistemas de detección de humo en todas las áreas. Registrar resultado de cada prueba por zona.',
    periodicidad: 'Trimestral', clasificacion: 'Normativa', prioridad: 'Crítica',
    requiereVobo: true, fechaLimite: NOW + 15 * D,
    evidencias: ['Video','PDF'], activa: true,
    asignacion: { tipo: 'uo', valores: ['KM17','Cuauhtémoc'] },
    tsds: [
      { userId:16, nombre:'Eder Luis Hernandez Alcocer', iniciales:'EH', uo:'KM17, Cuauhtémoc', region:'Acapulco',
        estado:'entregada', entregadaEn: NOW - 3*D, enTiempo:true,
        comentario:'Todas las zonas verificadas. Aspersor zona C2 requiere mantenimiento.',
        evidencias:[{nombre:'prueba-SCI-KM17.mp4',tipo:'video',url:null},{nombre:'Protocolo-SCI-KM17-Jun.pdf',tipo:'pdf',url:null}],
        vobo:'rechazado', voboAprobadoPor:null, voboAprobadoEn:null,
        motivoRechazo:'El video no muestra la prueba completa del aspersor C2. Resubir evidencia incluyendo esa zona.' },
    ],
  },
  {
    id: 10,
    nombre: 'Limpieza y orden de áreas de trabajo',
    descripcion: 'Verificación de estándares 5S en áreas operativas: clasificar, ordenar, limpiar, estandarizar y sostener.',
    periodicidad: 'Diario', clasificacion: 'Operativa', prioridad: 'Bajo',
    requiereVobo: false, fechaLimite: NOW + 18 * H,
    evidencias: ['Foto'], activa: true,
    asignacion: { tipo: 'region', valores: ['Coecillo','Tenango','Pacífico','Tlaxcala','Toluca'] },
    tsds: [
      { userId:3, nombre:'Benjamin Torres Tapia',   iniciales:'BT', uo:'Coecillo',              region:'Coecillo',
        estado:'entregada', entregadaEn: NOW - 1*H, enTiempo:true,
        comentario:'Área principal y almacén OK.', evidencias:[{nombre:'5S_coecillo.jpg',tipo:'image',url:null}],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:4, nombre:'Daniela Nava Gomez',      iniciales:'DN', uo:'Tenango, Ixtapan',      region:'Tenango',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:6, nombre:'Cristina Rodriguez Valdez',iniciales:'CR', uo:'Pacífico',              region:'Pacífico',
        estado:'entregada', entregadaEn: NOW - 2*H, enTiempo:true,
        comentario:'', evidencias:[{nombre:'5S_pacifico.jpg',tipo:'image',url:null}],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:7, nombre:'Gustavo Sanchez Avendaño', iniciales:'GS', uo:'Atlihuetzía',           region:'Tlaxcala',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:5, nombre:'Jesus Fernando Juarez Hernandez', iniciales:'JJ', uo:'Huetamo, Valle de Bravo', region:'Toluca',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
    ],
  },
  {
    id: 11,
    nombre: 'Permisos de trabajo en altura',
    descripcion: 'Auditoría de permisos activos para trabajos en altura y verificación de condición de arneses y equipos de sujeción.',
    periodicidad: 'Semanal', clasificacion: 'Normativa', prioridad: 'Alto',
    requiereVobo: true, fechaLimite: NOW + 2 * D,
    evidencias: ['Foto','PDF'], activa: true,
    asignacion: { tipo: 'region', valores: ['Acapulco','Cuernavaca'] },
    tsds: [
      { userId:17, nombre:'Andrea Gadiel Corona Hernandez', iniciales:'AC', uo:'Cayaco, Renacimiento, Tecpan', region:'Acapulco',
        estado:'entregada', entregadaEn: NOW - 18*H, enTiempo:true,
        comentario:'5 permisos activos revisados. Arneses en buen estado.',
        evidencias:[{nombre:'permisos-altura-ac.jpg',tipo:'image',url:null},{nombre:'Permisos-Altura-Jun.pdf',tipo:'pdf',url:null}],
        vobo:'pendiente', voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:18, nombre:'Mayra del Carmen Ramirez Tavera', iniciales:'MR', uo:'Polvorín, Puente de Ixtla', region:'Cuernavaca',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:19, nombre:'Hector Mauricio Hernandez Jaimes', iniciales:'HH', uo:'Progreso, Cuernavaca', region:'Cuernavaca',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
    ],
  },
  {
    id: 12,
    nombre: 'Capacitación en primeros auxilios',
    descripcion: 'Sesión trimestral de actualización en técnicas de primeros auxilios para brigadistas de cada UO.',
    periodicidad: 'Trimestral', clasificacion: 'Normativa', prioridad: 'Medio',
    requiereVobo: false, fechaLimite: NOW + 20 * D,
    evidencias: ['Foto','PDF'], activa: true,
    asignacion: { tipo: 'usuario', valores: ['Mayra del Carmen Ramirez Tavera','Hector Mauricio Hernandez Jaimes'] },
    tsds: [
      { userId:18, nombre:'Mayra del Carmen Ramirez Tavera',  iniciales:'MR', uo:'Polvorín, Puente de Ixtla', region:'Cuernavaca',
        estado:'entregada', entregadaEn: NOW - 5*D, enTiempo:true,
        comentario:'18 brigadistas capacitados. Se practicó RCP y uso del DEA.',
        evidencias:[{nombre:'primeros-auxilios-mr.jpg',tipo:'image',url:null},{nombre:'Lista-Asistencia-PA.pdf',tipo:'pdf',url:null}],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
      { userId:19, nombre:'Hector Mauricio Hernandez Jaimes', iniciales:'HH', uo:'Progreso, Cuernavaca',     region:'Cuernavaca',
        estado:'pendiente', entregadaEn:null, enTiempo:null, comentario:'', evidencias:[],
        vobo:null, voboAprobadoPor:null, voboAprobadoEn:null, motivoRechazo:null },
    ],
  },
]
