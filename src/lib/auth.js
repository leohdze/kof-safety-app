import { supabase } from './supabase'

export async function logout() {
  try {
    await supabase.auth.signOut()
  } catch {
    // ignorar errores de red — el signOut local ya ocurrió
  } finally {
    localStorage.clear()
    sessionStorage.clear()
    window.location.replace('/login')
  }
}
