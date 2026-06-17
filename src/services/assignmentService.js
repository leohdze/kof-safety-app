import { supabase } from '../lib/supabase'

// ─── Normalización DB → shape de FieldContext ─────────────────────────────────

function normalizeAssignment(row) {
  const task       = row.tasks ?? {}
  const completions = row.task_completions ?? []
  const latest      = completions.slice().sort((a, b) =>
    (b.attempt_number ?? 0) - (a.attempt_number ?? 0))[0]

  const isCompleted = !!latest
  const due = row.due_date ?? task.due_date

  return {
    id:           row.id,          // assignment UUID — usado como "id de tarea" en FieldContext
    taskId:       task.id,         // task UUID real
    assignmentId: row.id,
    nombre:       task.title ?? '',
    descripcion:  task.description ?? '',
    periodicidad: task.periodicity ?? '',
    evidenciasRequeridas: (task.evidence_types ?? []).map(t => ({
      photo: 'Foto', pdf: 'PDF', excel: 'Excel', word: 'Word', video: 'Video',
    }[t] ?? t)),
    requiereVobo:  task.requires_vobo ?? false,
    materialApoyo: task.material_url
      ? [{ nombre: 'Material de apoyo', tipo: 'PDF', url: task.material_url }]
      : [],
    fechaLimite:  due ? new Date(due).getTime() : Date.now() + 7 * 86400000,
    estado:       isCompleted ? 'completada' : row.status === 'overdue' ? 'pendiente' : 'pendiente',
    completadaEn: latest?.completed_at ? new Date(latest.completed_at).getTime() : null,
    evidencias:   latest?.task_evidence
      ? latest.task_evidence.map(e => ({
          id:      e.id,
          nombre:  e.file_name,
          tipo:    ['jpg','jpeg','png','heic'].includes(e.file_type) ? 'image' : e.file_type,
          preview: ['jpg','jpeg','png','heic'].includes(e.file_type) ? e.file_url : null,
          url:     e.file_url,
          size:    e.file_size,
        }))
      : [],
    comentario: latest?.comments ?? '',
    voboStatus: latest?.vobo_status ?? null,
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export async function getMyAssignments(userId) {
  const { data, error } = await supabase
    .from('task_assignments')
    .select(`
      id, user_id, uo, region, due_date, status, commitment_date,
      tasks (
        id, title, description, periodicity, requires_vobo,
        evidence_types, due_date, material_url
      ),
      task_completions (
        id, completed_at, is_on_time, comments, attempt_number,
        vobo_status, vobo_comment,
        task_evidence ( id, file_url, file_name, file_type, file_size )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(normalizeAssignment)
}

export async function setCommitmentDate(assignmentId, date) {
  const { data, error } = await supabase
    .from('task_assignments')
    .update({ commitment_date: new Date(date).toISOString() })
    .eq('id', assignmentId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getAssignmentStatus(assignmentId) {
  const { data, error } = await supabase
    .from('task_assignments')
    .select('id, status, due_date, commitment_date, attempt_count')
    .eq('id', assignmentId)
    .single()

  if (error) throw error
  return data
}
