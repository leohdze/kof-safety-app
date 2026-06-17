import { supabase } from '../lib/supabase'
import { MOCK_TAREAS, initials } from '../data/mockTareas'

// ─── Mapeos UI ↔ DB ───────────────────────────────────────────────────────────

const EVID_TO_LABEL = { photo:'Foto', pdf:'PDF', excel:'Excel', word:'Word', video:'Video' }
const LABEL_TO_EVID = { Foto:'photo', PDF:'pdf', Excel:'excel', Word:'word', Video:'video' }

function normalizeEvidTypes(dbTypes = []) {
  return dbTypes.map(t => EVID_TO_LABEL[t] ?? t)
}
function toDbEvidTypes(uiLabels = []) {
  return uiLabels.map(l => LABEL_TO_EVID[l] ?? l.toLowerCase())
}

// ─── Normalización DB → shape de componente ───────────────────────────────────

function normalizeTsd(assignment) {
  const profile    = assignment.user_profile ?? {}
  const completions = assignment.task_completions ?? []
  // La entrega más reciente (mayor attempt_number o created_at)
  const latest     = completions.slice().sort((a, b) =>
    (b.attempt_number ?? 0) - (a.attempt_number ?? 0))[0]

  const hasCompletion = !!latest
  const isOverdue     = assignment.status === 'overdue'

  return {
    userId:         assignment.user_id,
    assignmentId:   assignment.id,
    nombre:         profile.full_name ?? 'Usuario',
    iniciales:      initials(profile.full_name ?? 'U'),
    uo:             assignment.uo ?? profile.uo?.[0] ?? '',
    region:         assignment.region ?? profile.region ?? '',
    estado:         hasCompletion ? 'entregada' : isOverdue ? 'vencida' : 'pendiente',
    entregadaEn:    latest?.completed_at ? new Date(latest.completed_at).getTime() : null,
    enTiempo:       latest?.is_on_time ?? null,
    comentario:     latest?.comments ?? '',
    evidencias:     (latest?.task_evidence ?? []).map(e => ({
      nombre: e.file_name,
      tipo:   e.file_type === 'jpg' || e.file_type === 'jpeg' || e.file_type === 'png' || e.file_type === 'heic'
              ? 'image' : e.file_type,
      url:    e.file_url,
    })),
    completionId:    latest?.id ?? null,
    vobo:           latest?.vobo_status === 'not_required' ? null : (latest?.vobo_status ?? null),
    voboAprobadoPor: latest?.vobo_by ?? null,
    voboAprobadoEn:  latest?.vobo_at ? new Date(latest.vobo_at).getTime() : null,
    motivoRechazo:   latest?.vobo_comment ?? null,
  }
}

function normalizeTask(dbTask) {
  const assignments = dbTask.task_assignments ?? []
  return {
    id:            dbTask.id,
    nombre:        dbTask.title,
    descripcion:   dbTask.description ?? '',
    clasificacion: dbTask.classification,
    prioridad:     dbTask.priority,
    periodicidad:  dbTask.periodicity,
    requiereVobo:  dbTask.requires_vobo,
    evidencias:    normalizeEvidTypes(dbTask.evidence_types),
    fechaLimite:   dbTask.due_date ? new Date(dbTask.due_date).getTime() : Date.now() + 7 * 86400000,
    activa:        dbTask.is_active,
    asignacion:    { tipo: 'usuario', valores: assignments.map(a => a.user_id) },
    tsds:          assignments.map(normalizeTsd),
  }
}

// ─── Helpers de queries ───────────────────────────────────────────────────────

const TASK_SELECT_SUMMARY = `
  id, title, description, classification, priority, periodicity,
  due_date, requires_vobo, evidence_types, is_active, created_at,
  task_assignments (
    id, user_id, uo, region, due_date, status,
    task_completions ( id, vobo_status, completed_at, is_on_time, attempt_number )
  )
`

const TASK_SELECT_DETAIL = `
  id, title, description, classification, priority, periodicity,
  date_type, due_date, tsd_date_deadline, requires_vobo, evidence_types,
  is_active, material_url, created_at,
  task_assignments (
    id, user_id, uo, region, due_date, status, attempt_count,
    task_completions (
      id, completed_at, is_on_time, comments, attempt_number,
      vobo_status, vobo_by, vobo_at, vobo_comment,
      task_evidence ( id, file_url, file_name, file_type, file_size )
    )
  )
`

async function fetchProfiles(userIds) {
  if (!userIds.length) return {}
  const { data } = await supabase
    .from('user_profiles')
    .select('id, full_name, subrole, region, uo')
    .in('id', userIds)
  return Object.fromEntries((data ?? []).map(p => [p.id, p]))
}

function mergeProfiles(tasks, profileMap) {
  return tasks.map(t => ({
    ...t,
    task_assignments: (t.task_assignments ?? []).map(a => ({
      ...a,
      user_profile: profileMap[a.user_id] ?? null,
    })),
  }))
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export async function getTasks(filters = {}) {
  try {
    let q = supabase
      .from('tasks')
      .select(TASK_SELECT_SUMMARY)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (filters.clasificacion) q = q.eq('classification', filters.clasificacion)
    if (filters.prioridad)     q = q.eq('priority', filters.prioridad)
    if (filters.periodicidad)  q = q.eq('periodicity', filters.periodicidad)

    const { data, error } = await q
    if (error) throw error

    const userIds   = [...new Set((data ?? []).flatMap(t => (t.task_assignments ?? []).map(a => a.user_id)))]
    const profileMap = await fetchProfiles(userIds)

    return mergeProfiles(data ?? [], profileMap).map(normalizeTask)
  } catch (err) {
    console.warn('[taskService.getTasks] fallback mock:', err.message)
    return MOCK_TAREAS
  }
}

export async function getTaskById(id) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(TASK_SELECT_DETAIL)
      .eq('id', id)
      .single()

    if (error) throw error

    const userIds    = (data.task_assignments ?? []).map(a => a.user_id)
    const profileMap = await fetchProfiles(userIds)
    const taskWithProfiles = {
      ...data,
      task_assignments: (data.task_assignments ?? []).map(a => ({
        ...a,
        user_profile: profileMap[a.user_id] ?? null,
      })),
    }
    return normalizeTask(taskWithProfiles)
  } catch (err) {
    console.warn('[taskService.getTaskById] fallback mock:', err.message)
    return MOCK_TAREAS.find(t => String(t.id) === String(id)) ?? null
  }
}

export async function createTask(formData) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title:          formData.nombre,
      description:    formData.descripcion,
      classification: formData.clasificacion,
      priority:       formData.prioridad,
      periodicity:    formData.periodicidad,
      date_type:      'fixed',
      due_date:       formData.fechaLimite ? new Date(formData.fechaLimite).toISOString() : null,
      requires_vobo:  formData.requiereVobo,
      evidence_types: toDbEvidTypes(formData.evidencias),
      is_active:      true,
      created_by:     user.id,
    })
    .select()
    .single()

  if (error) throw error
  return normalizeTask({ ...data, task_assignments: [] })
}

export async function updateTask(id, formData) {
  const { error } = await supabase
    .from('tasks')
    .update({
      title:          formData.nombre,
      description:    formData.descripcion,
      classification: formData.clasificacion,
      priority:       formData.prioridad,
      periodicity:    formData.periodicidad,
      requires_vobo:  formData.requiereVobo,
      evidence_types: toDbEvidTypes(formData.evidencias),
    })
    .eq('id', id)

  if (error) throw error
}

export async function assignTask(taskId, userId, { uo, region, dueDate } = {}) {
  const { data, error } = await supabase
    .from('task_assignments')
    .upsert({ task_id: taskId, user_id: userId, uo, region, due_date: dueDate, status: 'pending' })
    .select()
    .single()

  if (error) throw error
  return data
}
