import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLES } from '@/utils/constants'
import ProtectedRoute from './ProtectedRoute'
import Layout from '@/components/layout/Layout'

import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'

import AdminDashboard from '@/pages/admin/Dashboard'
import AdminEmployees from '@/pages/admin/Employees'
import AdminPayments from '@/pages/admin/Payments'
import AdminReports from '@/pages/admin/Reports'

import EmployeeDashboard from '@/pages/employee/Dashboard'
import EmployeePayments from '@/pages/employee/Payments'
import EmployeeProfile from '@/pages/employee/Profile'

function RootRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return (
    <Navigate
      to={profile?.role === ROLES.EMPLOYEE ? '/employee/dashboard' : '/admin/dashboard'}
      replace
    />
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Admin / Super Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]} />}>
        <Route element={<Layout><></></Layout>}>
          {/* We render children via Outlet pattern */}
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]} />}>
        <Route path="/admin" element={<Layout><Outlet /></Layout>}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="employees" element={<AdminEmployees />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>
      </Route>

      {/* Employee routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]} />}>
        <Route path="/employee" element={<Layout><Outlet /></Layout>}>
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="payments" element={<EmployeePayments />} />
          <Route path="profile" element={<EmployeeProfile />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}