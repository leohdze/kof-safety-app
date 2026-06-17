import { supabase } from '../lib/supabase'
import { MOCK_USERS } from '../data/mockUsers'

// ─── Normalización DB → shape de componente ───────────────────────────────────

function normalizeUser(p) {
  return {
    id:      p.id,
    nombre:  p.full_name,
    correo:  p.email,
    rol:     p.role,
    subrole: p.subrole ?? 'TSD',
    region:  p.region ?? '',
    uo:      Array.isArray(p.uo) ? p.uo.join(', ') : (p.uo ?? ''),
    activo:  p.is_active,
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export async function getUsers(filters = {}) {
  try {
    let q = supabase
      .from('user_profiles')
      .select('id, full_name, email, role, subrole, region, uo, is_active')
      .order('full_name')

    if (filters.rol)  q = q.eq('role', filters.rol)
    if (filters.activo !== undefined) q = q.eq('is_active', filters.activo)

    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(normalizeUser)
  } catch (err) {
    console.warn('[userService.getUsers] fallback mock:', err.message)
    return MOCK_USERS
  }
}

export async function getUserProfile(id) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role, subrole, region, uo, is_active, last_seen, created_at')
      .eq('id', id)
      .single()

    if (error) throw error
    return normalizeUser(data)
  } catch (err) {
    console.warn('[userService.getUserProfile] fallback mock:', err.message)
    return MOCK_USERS.find(u => String(u.id) === String(id)) ?? null
  }
}

export async function createUserProfile(formData) {
  // Crear usuario en auth via admin API (requiere service role key en servidor)
  // En el cliente usamos la API pública de signUp y luego insertamos el perfil.
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email:    formData.correo,
    password: formData.password,
    email_confirm: true,
    app_metadata: { role: formData.rol },
    user_metadata: { nombre: formData.nombre },
  })
  if (authErr) throw authErr

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id:        authData.user.id,
      email:     formData.correo,
      full_name: formData.nombre,
      role:      formData.rol,
      subrole:   formData.subrole,
      region:    formData.region,
      uo:        formData.uo ? formData.uo.split(',').map(s => s.trim()) : [],
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return normalizeUser(data)
}

export async function updateUserProfile(id, formData) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      full_name: formData.nombre,
      email:     formData.correo,
      role:      formData.rol,
      subrole:   formData.subrole,
      region:    formData.region,
      uo:        formData.uo ? formData.uo.split(',').map(s => s.trim()) : [],
      is_active: formData.activo,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return normalizeUser(data)
}
