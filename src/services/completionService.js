import { supabase } from '../lib/supabase'

// ─── Helpers internos ─────────────────────────────────────────────────────────

function ext2tipo(ext = '') {
  if (['jpg','jpeg','png','heic','gif','webp'].includes(ext)) return 'image'
  if (ext === 'pdf')  return 'pdf'
  if (['xlsx','xls'].includes(ext)) return 'excel'
  if (['docx','doc'].includes(ext)) return 'word'
  if (['mp4','mov','avi'].includes(ext)) return 'video'
  return 'file'
}

function initials(name = '') {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase()
}

function normalizeVoboItem(c, tsdProfile = {}, execProfile = {}) {
  return {
    id:           c.id,
    rutina:       c.tasks?.title       ?? '',
    periodicidad: c.tasks?.periodicity ?? '',
    clasificacion: c.tasks?.classification ?? '',
    tsd: {
      id:        c.user_id,
      nombre:    tsdProfile.full_name  ?? 'Usuario',
      iniciales: initials(tsdProfile.full_name ?? ''),
      uo:        Array.isArray(tsdProfile.uo)
                   ? tsdProfile.uo.join(', ')
                   : (tsdProfile.uo ?? ''),
      region:    tsdProfile.region ?? '',
    },
    completadaEn:  c.completed_at ? new Date(c.completed_at).getTime() : Date.now(),
    evidencias:    (c.task_evidence ?? []).map(e => ({
      id:     e.id,
      nombre: e.file_name,
      tipo:   ext2tipo(e.file_type),
      url:    e.file_url,
    })),
    estado:        c.vobo_status === 'approved' ? 'aprobado'
                 : c.vobo_status === 'rejected' ? 'rechazado'
                 : 'pendiente',
    aprobadoPor:   execProfile.full_name ?? (c.vobo_by ? 'Ejecutivo' : null),
    aprobadoEn:    c.vobo_at ? new Date(c.vobo_at).getTime() : null,
    motivoRechazo: c.vobo_comment ?? null,
  }
}

// ─── Normalizadores ───────────────────────────────────────────────────────────

function normalizeEvidence(e) {
  const ext  = e.file_type ?? ''
  const isImg = ['jpg','jpeg','png','heic','gif','webp'].includes(ext)
  return {
    id:      e.id,
    nombre:  e.file_name,
    tipo:    isImg ? 'image' : ext,
    url:     e.file_url,
    preview: isImg ? e.file_url : null,
    isImage: isImg,
    size:    e.file_size,
  }
}

function normalizeCompletion(c) {
  if (!c) return null
  return {
    id:             c.id,
    assignmentId:   c.assignment_id,
    taskId:         c.task_id,
    userId:         c.user_id,
    completedAt:    c.completed_at ? new Date(c.completed_at).getTime() : null,
    isOnTime:       c.is_on_time,
    comments:       c.comments ?? '',
    voboStatus:     c.vobo_status,
    voboBy:         c.vobo_by,
    voboAt:         c.vobo_at ? new Date(c.vobo_at).getTime() : null,
    voboComment:    c.vobo_comment,
    attemptNumber:  c.attempt_number,
    evidencias:     (c.task_evidence ?? []).map(normalizeEvidence),
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export async function getCompletions(taskId) {
  try {
    const { data, error } = await supabase
      .from('task_completions')
      .select('*, task_evidence(*)')
      .eq('task_id', taskId)
      .order('completed_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(normalizeCompletion)
  } catch (err) {
    console.warn('[completionService.getCompletions] error:', err.message)
    return []
  }
}

export async function getCompletion(taskId, userId) {
  try {
    const { data, error } = await supabase
      .from('task_completions')
      .select('*, task_evidence(*)')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return normalizeCompletion(data)
  } catch (err) {
    console.warn('[completionService.getCompletion] error:', err.message)
    return null
  }
}

export async function submitCompletion({ assignmentId, taskId, userId, isOnTime, comments, evidenceIds }) {
  // 1. Crear el registro de completion
  const { data: completion, error: cErr } = await supabase
    .from('task_completions')
    .insert({
      assignment_id: assignmentId,
      task_id:       taskId,
      user_id:       userId,
      is_on_time:    isOnTime,
      comments:      comments ?? null,
      vobo_status:   'pending', // se actualiza si no requiere VoBo
    })
    .select()
    .single()

  if (cErr) throw cErr

  // 2. Vincular evidencias subidas al completion
  if (evidenceIds?.length) {
    await supabase
      .from('task_evidence')
      .update({ completion_id: completion.id })
      .in('id', evidenceIds)
  }

  // 3. Marcar el assignment como completado
  await supabase
    .from('task_assignments')
    .update({ status: 'completed' })
    .eq('id', assignmentId)

  return completion
}

export async function getPendingVobos() {
  // Carga todos los VoBos (pendientes + aprobados + rechazados) para la bandeja
  const { data, error } = await supabase
    .from('task_completions')
    .select(`
      id, completed_at, comments, vobo_status, vobo_comment, vobo_by, vobo_at,
      task_id, user_id, is_on_time,
      tasks ( id, title, periodicity, classification ),
      task_evidence ( id, file_name, file_type, file_url, file_size )
    `)
    .in('vobo_status', ['pending', 'approved', 'rejected'])
    .order('completed_at', { ascending: false })

  if (error) throw error

  // Two-step: perfiles de TSDs + ejecutivos que hicieron VoBo
  const allUserIds = [...new Set(
    [...(data ?? []).map(c => c.user_id),
     ...(data ?? []).filter(c => c.vobo_by).map(c => c.vobo_by)]
    .filter(Boolean)
  )]
  const profileMap = {}
  if (allUserIds.length) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, uo, region')
      .in('id', allUserIds)
    ;(profiles ?? []).forEach(p => { profileMap[p.id] = p })
  }

  return (data ?? []).map(c =>
    normalizeVoboItem(c, profileMap[c.user_id] ?? {}, profileMap[c.vobo_by] ?? {})
  )
}

export async function getPendingVoboCount() {
  const { count, error } = await supabase
    .from('task_completions')
    .select('id', { count: 'exact', head: true })
    .eq('vobo_status', 'pending')

  if (error) throw error
  return count ?? 0
}

export async function updateVobo(completionId, action, comment) {
  const { data: { user } } = await supabase.auth.getUser()

  const voboStatus = action === 'approved' ? 'approved' : 'rejected'

  const { data, error } = await supabase
    .from('task_completions')
    .update({
      vobo_status:  voboStatus,
      vobo_by:      user.id,
      vobo_at:      new Date().toISOString(),
      vobo_comment: comment ?? null,
    })
    .eq('id', completionId)
    .select()
    .single()

  if (error) throw error

  // Log
  if (data) {
    await supabase.from('vobo_log').insert({
      completion_id: completionId,
      task_id:       data.task_id,
      user_id:       data.user_id,
      executive_id:  user.id,
      action:        action === 'approved' ? 'approved' : 'rejected',
      comment:       comment ?? null,
    })
  }

  return data
}
