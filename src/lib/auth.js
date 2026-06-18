import { supabase } from './supabase'

export const logout = async () => {
  try {
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ])
  } catch (e) {
    console.warn('signOut error (ignorado):', e.message)
  } finally {
    localStorage.clear()
    sessionStorage.clear()
    window.location.replace('/login')
  }
}
