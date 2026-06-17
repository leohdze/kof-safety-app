import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  {
    to: '/admin',
    label: 'Inicio',
    end: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/admin/usuarios',
    label: 'Usuarios',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/admin/rutinas',
    label: 'Rutinas',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/admin/reportes',
    label: 'Reportes',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

const ShieldIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6
         1.25 8.25 0 005.5 17.5a11.956 11.956 0 006.5 2c2.56 0 4.93-.8
         6.864-2.152M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25" />
  </svg>
)

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const nombre = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Ejecutivo'
  const inicial = nombre[0]?.toUpperCase() ?? 'E'

  async function handleSignOut() {
    try {
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  function closeSidebar() {
    setSidebarOpen(false)
  }

  return (
    <div className="h-screen-safe bg-kof-bg flex overflow-hidden">

      {/* ── Backdrop móvil ─────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className={[
          // Estructura
          'flex flex-col w-60 flex-shrink-0 bg-white border-r border-gray-100',
          // Móvil: fixed + animación slide
          'fixed inset-y-0 left-0 z-50 shadow-xl',
          'transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: posición relativa normal, sin animación slide
          'md:relative md:inset-auto md:z-auto md:translate-x-0 md:shadow-sm',
        ].join(' ')}
      >
        {/* Brand — pt-safe para el notch/isla dinámica en móvil */}
        <div
          className="flex items-center gap-3 px-5 pb-5 border-b border-gray-100 flex-shrink-0"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1.25rem)' }}
        >
          <div className="w-9 h-9 bg-kof-red rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-kof-red/30">
            <ShieldIcon />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">KOF Safety</p>
            <p className="text-xs text-gray-400 mt-0.5">Panel Ejecutivo</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-kof-red text-white shadow-sm shadow-kof-red/25'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Usuario — pb-safe para el home indicator en móvil */}
        <div className="px-3 pt-4 border-t border-gray-100 flex-shrink-0 pb-safe" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}>
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-8 h-8 bg-kof-red/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-kof-red">{inicial}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{nombre}</p>
              <p className="text-[11px] text-gray-400">Ejecutivo</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-kof-red transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header móvil — altura = 56px + safe-area-inset-top para el notch */}
        <header
          className="md:hidden flex items-center flex-shrink-0 bg-white border-b border-gray-100 shadow-sm z-10 px-4"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
          }}
        >
          <div className="flex items-center justify-between w-full h-14">
          {/* Hamburguesa */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Abrir menú"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo centrado */}
          <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <div className="w-7 h-7 bg-kof-red rounded-lg flex items-center justify-center">
              <ShieldIcon />
            </div>
            <span className="text-sm font-bold text-gray-900 tracking-tight">KOF Safety</span>
          </div>

          {/* Avatar */}
          <div className="w-8 h-8 bg-kof-red/10 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-kof-red">{inicial}</span>
          </div>
          </div>{/* fin del div interno h-14 */}
        </header>

        {/* Página */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
