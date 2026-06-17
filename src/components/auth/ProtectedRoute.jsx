import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-kof-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-kof-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRole && role !== allowedRole) {
    const redirect = role === 'executive' ? '/admin' : '/app'
    return <Navigate to={redirect} replace />
  }

  return children
}
