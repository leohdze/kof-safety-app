import { supabase } from '../lib/supabase'

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
