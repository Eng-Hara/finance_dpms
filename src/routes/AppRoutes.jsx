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
import AdminSettings from '@/pages/admin/Settings'
import AdminAuditLogs from '@/pages/admin/AuditLogs'
import AdminUserRoles from '@/pages/admin/UserRoles'
import AdminEmployeeDetails from '@/pages/admin/EmployeeDetails'

import EmployeeDashboard from '@/pages/employee/Dashboard'
import EmployeePayments from '@/pages/employee/Payments'
import EmployeeProfile from '@/pages/employee/Profile'

function RootRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user || !profile || profile.status === 'DISABLED') return <Navigate to="/login" replace />
  return (
    <Navigate
      to={profile.role === ROLES.EMPLOYEE ? '/employee/dashboard' : '/admin/dashboard'}
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
        <Route path="/admin" element={<Layout><Outlet /></Layout>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="employees" element={<AdminEmployees />} />
          <Route path="employees/:employeeId" element={<AdminEmployeeDetails />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="reports" element={<AdminReports />} />
          <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="users" element={<AdminUserRoles />} />
          </Route>
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