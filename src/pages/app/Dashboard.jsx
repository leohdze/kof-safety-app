import { useAuth } from '../../context/AuthContext'

const quickActions = [
  {
    label: 'Nueva inspección',
    description: 'Registrar revisión de equipo',
    color: 'bg-kof-red',
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    label: 'Escanear QR',
    description: 'Identificar equipo por código',
    color: 'bg-gray-800',
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
  },
]

export default function AppDashboard() {
  const { user } = useAuth()
  const firstName = user?.email?.split('@')[0] ?? 'Técnico'

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hola, {firstName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">¿Qué vas a hacer hoy?</p>
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md active:scale-98 transition-all duration-150 text-left"
          >
            <div className={`w-14 h-14 ${action.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              {action.icon}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{action.label}</p>
              <p className="text-sm text-gray-500 mt-0.5">{action.description}</p>
            </div>
            <svg className="w-5 h-5 text-gray-300 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      {/* Pending tasks */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Mis pendientes</h2>
        <div className="text-sm text-gray-400 text-center py-8">
          Sin pendientes por ahora
        </div>
      </div>
    </div>
  )
}
