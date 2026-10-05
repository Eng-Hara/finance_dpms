import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLES } from '@/utils/constants'

export default function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  if (!user || !profile) return <Navigate to="/login" replace />

  if (profile.status === 'DISABLED') return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <Navigate
        to={profile.role === ROLES.EMPLOYEE ? '/employee/dashboard' : '/admin/dashboard'}
        replace
      />
    )
  }

  return <Outlet />
}