import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useField } from '../../context/FieldContext'
import { logout } from '../../lib/auth'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function initials(name = '') {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase() || '?'
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatCard({ label, value, color, sub }) {
  return (
    <div className={`flex-1 flex flex-col items-center py-4 px-2 rounded-2xl ${color}`}>
      <span className="text-2xl font-extrabold leading-none">{value}</span>
      <span className="text-[11px] font-semibold mt-1 opacity-80 text-center leading-tight">{label}</span>
      {sub && <span className="text-[10px] opacity-60 mt-0.5">{sub}</span>}
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium flex-1">{value}</span>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Perfil() {
  const { user }          = useAuth()
  const { profile }       = useField()
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Cargar estadísticas del mes en curso
  useEffect(() => {
    if (!user?.id) return
    setLoadingStats(true)
    supabase
      .from('task_completions')
      .select('id, is_on_time, vobo_status')
      .eq('user_id', user.id)
      .gte('completed_at', startOfMonth())
      .then(({ data, error }) => {
        if (error) { console.warn('[Perfil] stats error:', error.message); return }
        const rows = data ?? []
        setStats({
          total:      rows.length,
          enTiempo:   rows.filter(r => r.is_on_time).length,
          fuera:      rows.filter(r => r.is_on_time === false).length,
          voboPend:   rows.filter(r => r.vobo_status === 'pending').length,
          voboAprov:  rows.filter(r => r.vobo_status === 'approved').length,
        })
      })
      .finally(() => setLoadingStats(false))
  }, [user?.id])

  const nombre  = profile?.full_name || user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const inicial = initials(nombre)
  const uo      = Array.isArray(profile?.uo) ? profile.uo.join(', ') : (profile?.uo ?? '')
  const correo  = user?.email ?? ''

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-kof-bg px-4 py-3 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">Mi perfil</h1>
      </div>

      <div className="p-4 space-y-5">

        {/* Avatar + nombre */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-16 h-16 bg-kof-red rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-kof-red/25">
            <span className="text-xl font-extrabold text-white">{inicial}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-gray-900 leading-tight">{nombre}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{correo}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {profile?.subrole && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {profile.subrole}
                </span>
              )}
              {profile?.region && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {profile.region}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Datos de perfil */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-1">
          <InfoRow label="Región"  value={profile?.region} />
          <InfoRow label="UO"      value={uo} />
          <InfoRow label="Tipo"    value={profile?.subrole} />
          <InfoRow label="Correo"  value={correo} />
        </div>

        {/* Estadísticas del mes */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 mb-2.5">
            Este mes
          </h3>
          {loadingStats ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-kof-red border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats ? (
            <div className="space-y-3">
              {/* Fila 1: totales */}
              <div className="flex gap-2.5">
                <StatCard
                  label="Completadas"
                  value={stats.total}
                  color="bg-emerald-50 text-emerald-700"
                />
                <StatCard
                  label="En tiempo"
                  value={stats.enTiempo}
                  color="bg-blue-50 text-blue-700"
                />
                <StatCard
                  label="Fuera de tiempo"
                  value={stats.fuera}
                  color={stats.fuera > 0 ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-400'}
                />
              </div>

              {/* VoBo (solo si hay alguno) */}
              {(stats.voboPend > 0 || stats.voboAprov > 0) && (
                <div className="flex gap-2.5">
                  {stats.voboPend > 0 && (
                    <StatCard
                      label="VoBo pendiente"
                      value={stats.voboPend}
                      color="bg-violet-50 text-violet-700"
                    />
                  )}
                  {stats.voboAprov > 0 && (
                    <StatCard
                      label="VoBo aprobado"
                      value={stats.voboAprov}
                      color="bg-emerald-50 text-emerald-700"
                    />
                  )}
                  {/* Spacer si solo hay una card */}
                  {(stats.voboPend > 0) !== (stats.voboAprov > 0) && (
                    <div className="flex-1" />
                  )}
                </div>
              )}

              {stats.total === 0 && (
                <p className="text-center text-xs text-gray-400 py-4">
                  Sin tareas completadas este mes.
                </p>
              )}
            </div>
          ) : (
            <p className="text-center text-xs text-gray-400 py-4">
              No se pudieron cargar las estadísticas.
            </p>
          )}
        </div>

        {/* Cerrar sesión */}
        <div className="pt-2">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl
              border border-gray-200 text-sm font-semibold text-gray-500
              hover:bg-red-50 hover:text-kof-red hover:border-red-100 transition-all active:scale-[0.98]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>

      </div>
    </div>
  )
}
