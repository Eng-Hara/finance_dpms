import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, CreditCard, FileText, ScrollText,
  Settings, User, LogOut, X, Wallet,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLES } from '@/utils/constants'

const adminNav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/employees', label: 'Employees', icon: Users },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, superOnly: true },
  { to: '/admin/settings', label: 'Settings', icon: Settings, superOnly: true },
]

const employeeNav = [
  { to: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employee/payments', label: 'My Payments', icon: CreditCard },
  { to: '/employee/profile', label: 'My Profile', icon: User },
]

export default function Sidebar({ open, onClose }) {
  const { profile, role, signOut } = useAuth()
  const isEmployee = role === ROLES.EMPLOYEE
  const nav = isEmployee
    ? employeeNav
    : adminNav.filter((n) => !n.superOnly || role === ROLES.SUPER_ADMIN)

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white border-r border-slate-200 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-brand-600 p-1.5">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Contribution</span>
          </div>
          <button onClick={onClose} className="lg:hidden">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-3">
          <div className="mb-2 px-3">
            <p className="text-sm font-medium text-slate-900 truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {role}
            </span>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}