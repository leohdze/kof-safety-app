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
  // signUp funciona desde el browser; el rol va en user_metadata como fallback
  // (AuthContext lee app_metadata.role || user_metadata.role)
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email:    formData.correo,
    password: formData.password,
    options: {
      data: { nombre: formData.nombre, role: formData.rol },
    },
  })
  if (authErr) throw authErr
  if (!authData.user?.id) throw new Error('No se pudo crear el usuario — verifica que el correo no esté en uso.')

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

// Sin fallback mock — devuelve error si Supabase falla.
// Usar en selectores que necesitan UUIDs reales (ej: TareaModal tipo 'usuario').
export async function getFieldUsers() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, region, uo')
    .eq('role', 'field')
    .neq('is_active', false)
    .order('full_name')

  if (error) throw error
  return (data ?? []).map(p => ({
    id:     p.id,
    nombre: p.full_name,
    region: p.region ?? '',
    uo:     Array.isArray(p.uo) ? p.uo.join(', ') : (p.uo ?? ''),
  }))
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
