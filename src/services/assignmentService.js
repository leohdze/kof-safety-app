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
    materialApoyo: (() => {
      const u = task.material_url
      if (!u) return []
      try {
        const parsed = JSON.parse(u)
        if (Array.isArray(parsed)) return parsed.map((url, i) => {
          const ext = url.split('.').pop().toLowerCase().split('?')[0]
          const tipo = ['jpg','jpeg','png','heic','webp'].includes(ext) ? 'image'
            : ext === 'pdf' ? 'pdf'
            : ['xls','xlsx'].includes(ext) ? 'excel'
            : ['doc','docx'].includes(ext) ? 'word'
            : ['mp4','mov','avi'].includes(ext) ? 'video' : 'pdf'
          return { nombre: `Material ${i + 1}`, tipo, url }
        })
      } catch {}
      return [{ nombre: 'Material de apoyo', tipo: 'pdf', url: u }]
    })(),
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

// ─── Creación masiva de asignaciones al publicar una tarea ────────────────────
// assignmentConfig: { tipo: 'region'|'uo'|'usuario', valores: string[]|uuid[] }
// Devuelve el número de asignaciones creadas.

export async function createAssignments(taskId, dueDate, { tipo, valores }) {
  if (!taskId || !valores?.length) return 0

  // 1. Resolver perfiles de TSDs según el tipo de asignación
  let profiles = []

  if (tipo === 'region') {
    const orFilters = valores.map(v => `region.ilike.%${v}%`).join(',')
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, region, uo')
      .or(orFilters)
      .eq('role', 'field')
      .neq('is_active', false)
    if (error) throw new Error(`Consulta de región: ${error.message}`)
    profiles = data ?? []
  } else if (tipo === 'uo') {
    // user_profiles.uo es text[] — buscamos overlap con los valores seleccionados
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, region, uo')
      .overlaps('uo', valores)
      .eq('role', 'field')
      .neq('is_active', false)
    if (error) throw new Error(`Consulta de UO: ${error.message}`)
    profiles = data ?? []
  } else if (tipo === 'usuario') {
    // valores son UUIDs de los TSDs seleccionados
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, region, uo')
      .in('id', valores)
      .neq('is_active', false)
    if (error) throw new Error(`Consulta de usuario: ${error.message}`)
    profiles = data ?? []
  }

  if (!profiles.length) return 0

  // 2. Deduplicar por user_id (un TSD puede aparecer en varios filtros)
  const seen = new Set()
  const unique = profiles.filter(p => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  // 3. Insertar asignaciones
  const rows = unique.map(p => ({
    task_id:  taskId,
    user_id:  p.id,
    region:   p.region ?? null,
    uo:       Array.isArray(p.uo) ? (p.uo[0] ?? null) : (p.uo ?? null),
    due_date: dueDate ? new Date(dueDate).toISOString() : null,
    status:   'pending',
  }))

  const { data, error } = await supabase
    .from('task_assignments')
    .insert(rows)
    .select('id')

  if (error) throw new Error(`Insertar asignaciones: ${error.message}`)
  return (data ?? []).length
}

export async function getDistinctRegionsAndUOs() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('region, uo')
    .eq('role', 'field')
    .neq('is_active', false)
  if (error) throw error
  const regions = [...new Set((data ?? []).map(p => p.region).filter(Boolean))].sort()
  const uos = [...new Set((data ?? []).flatMap(p =>
    Array.isArray(p.uo) ? p.uo : (p.uo ? [p.uo] : [])
  ).filter(Boolean))].sort()
  return { regions, uos }
}
