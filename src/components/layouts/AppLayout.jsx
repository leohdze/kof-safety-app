import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FieldProvider } from '../../context/FieldContext'

const navItems = [
  {
    to: '/app',
    label: 'Inicio',
    end: true,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/app/tareas',
    label: 'Tareas',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/app/equipos',
    label: 'Equipos',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    to: '/app/perfil',
    label: 'Perfil',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <FieldProvider>
    <div className="min-h-screen-safe bg-kof-bg flex flex-col max-w-md mx-auto">

      {/*
       * Header fijo en la parte superior.
       * padding-top = safe-area-inset-top para el notch/Dynamic Island.
       * La barra de contenido visible siempre mide h-14 (56px).
       */}
      <header
        className="bg-white border-b border-gray-100 px-4 flex items-center justify-between sticky top-0 z-10 shadow-sm flex-shrink-0"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="flex items-center justify-between w-full h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-kof-red rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6
                     1.25 8.25 0 005.5 17.5a11.956 11.956 0 006.5 2c2.56 0 4.93-.8
                     6.864-2.152M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">KOF Safety</span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-gray-400 hover:text-kof-red transition-colors p-2 rounded-xl hover:bg-red-50"
            aria-label="Cerrar sesión"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/*
       * Área de contenido scrolleable.
       * pb-nav-safe = altura del bottom nav (4.5rem) + safe-area-inset-bottom
       * para que el contenido nunca quede debajo de la barra de navegación
       * ni del indicador home de iPhone.
       */}
      <main
        className="flex-1 overflow-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="pb-nav-safe">
          <Outlet />
        </div>
      </main>

      {/*
       * Bottom nav fijo.
       * padding-bottom = safe-area-inset-bottom para quedar por encima
       * del indicador home en iPhones sin botón físico.
       */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex justify-around items-center px-2 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)',
          paddingTop: '0.5rem',
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all duration-150 ${
                isActive ? 'text-kof-red' : 'text-gray-400'
              }`
            }
          >
            {item.icon}
            <span className="text-[10px] font-semibold leading-none">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
    </FieldProvider>
  )
}
