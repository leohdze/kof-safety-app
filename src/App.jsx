import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminLayout from './components/layouts/AdminLayout'
import AppLayout from './components/layouts/AppLayout'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/Dashboard'
import Users from './pages/admin/Users'
import Routines from './pages/admin/Routines'
import AppDashboard from './pages/app/Dashboard'
import Tareas       from './pages/app/Tareas'
import TaskDetail   from './pages/app/TaskDetail'

function RootRedirect() {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-kof-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-kof-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (role === 'executive') return <Navigate to="/admin" replace />
  if (role === 'field') return <Navigate to="/app" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* Executive routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="executive">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="usuarios" element={<Users />} />
            <Route path="rutinas" element={<Routines />} />
            <Route path="reportes" element={<div className="p-8 text-gray-400 text-sm">Reportes — próximamente</div>} />
          </Route>

          {/* Field routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute allowedRole="field">
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AppDashboard />} />
            <Route path="tareas"    element={<Tareas />} />
            <Route path="tareas/:id" element={<TaskDetail />} />
            <Route path="equipos"   element={<div className="p-4 text-gray-400">Equipos — próximamente</div>} />
            <Route path="perfil"    element={<div className="p-4 text-gray-400">Perfil — próximamente</div>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
