import { useEffect, useState } from 'react'
import { Search, Shield, UserCog, Users, Save, UserPlus, UserX, UserCheck } from 'lucide-react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useDebounce } from '@/hooks/useDebounce'
import { logAction } from '@/services/auditService'
import {
  listActiveEmployeeOptions,
  getProfileRoleCounts,
  isEmployeeLinked,
  listProfiles,
  updateProfileAccess,
  updateProfileStatus,
  inviteUserAccount,
} from '@/services/profileService'
import { ROLES } from '@/utils/constants'

const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.EMPLOYEE]: 'Employee',
}

export default function UserRoles() {
  const toast = useToast()
  const { profile: currentProfile } = useAuth()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [profiles, setProfiles] = useState([])
  const [employees, setEmployees] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [counts, setCounts] = useState({ total: 0, admins: 0, employees: 0, superAdmins: 0 })
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [role, setRole] = useState(ROLES.EMPLOYEE)
  const [employeeId, setEmployeeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusConfirm, setStatusConfirm] = useState(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    role: ROLES.EMPLOYEE,
    employeeId: '',
  })
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, roleFilter, statusFilter])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const [result, employeeOptions, roleCounts] = await Promise.all([
          listProfiles({
            page,
            search: debouncedSearch,
            role: roleFilter,
            status: statusFilter,
          }),
          listActiveEmployeeOptions(),
          getProfileRoleCounts(),
        ])
        if (!active) return
        setProfiles(result.data || [])
        setTotalPages(result.totalPages || 1)
        setEmployees(employeeOptions || [])
        setCounts({
          total: Object.values(roleCounts).reduce((total, value) => total + value, 0),
          admins: roleCounts[ROLES.ADMIN] + roleCounts[ROLES.SUPER_ADMIN],
          employees: roleCounts[ROLES.EMPLOYEE],
          superAdmins: roleCounts[ROLES.SUPER_ADMIN],
        })
      } catch (error) {
        if (active) toast.error('Unable to load user access details')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [page, debouncedSearch, roleFilter, statusFilter, refreshKey, toast])

  const openEdit = (userProfile) => {
    setEditing(userProfile)
    setRole(userProfile.role)
    setEmployeeId(userProfile.employee_id || '')
  }

  const handleSave = async () => {
    if (role === ROLES.EMPLOYEE && !employeeId) {
      toast.error('Select an employee record to link this account')
      return
    }

    if (editing.id === currentProfile?.id && role !== editing.role) {
      toast.error('You cannot change your own role')
      return
    }
    if (editing.id === currentProfile?.id && role !== ROLES.SUPER_ADMIN) {
      toast.error('You cannot remove your own Super Admin access')
      return
    }

    setSaving(true)
    try {
      if (role === ROLES.EMPLOYEE && await isEmployeeLinked(employeeId, editing.id)) {
        toast.error('That employee record is already linked to another account')
        return
      }
      if (
        editing.role === ROLES.SUPER_ADMIN &&
        role !== ROLES.SUPER_ADMIN &&
        counts.superAdmins <= 1
      ) {
        toast.error('At least one Super Admin account must remain')
        return
      }

      await updateProfileAccess(editing.id, { role, employeeId })
      await logAction({
        action: 'USER_ROLE_UPDATED',
        entityType: 'profile',
        entityId: editing.id,
        description: `Access for ${editing.full_name} changed to ${ROLE_LABELS[role]}`,
      })
      toast.success('User access updated')
      setEditing(null)
      setPage(1)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      toast.error(error.message || 'Unable to update user access')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async () => {
    if (!statusConfirm) return
    const currentStatus = statusConfirm.status || 'ACTIVE'
    const nextStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    if (statusConfirm.id === currentProfile?.id) {
      toast.error('You cannot disable your own account')
      setStatusConfirm(null)
      return
    }
    if (
      statusConfirm.role === ROLES.SUPER_ADMIN &&
      currentStatus === 'ACTIVE' &&
      counts.superAdmins <= 1
    ) {
      toast.error('At least one active Super Admin account must remain')
      setStatusConfirm(null)
      return
    }

    setStatusSaving(true)
    try {
      await updateProfileStatus(statusConfirm.id, nextStatus)
      await logAction({
        action: nextStatus === 'DISABLED' ? 'USER_DISABLED' : 'USER_ENABLED',
        entityType: 'profile',
        entityId: statusConfirm.id,
        description: `${statusConfirm.full_name} account ${nextStatus === 'DISABLED' ? 'disabled' : 'enabled'}`,
      })
      toast.success(nextStatus === 'DISABLED' ? 'User account disabled' : 'User account enabled')
      setStatusConfirm(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      toast.error(error.message || 'Unable to update account status')
    } finally {
      setStatusSaving(false)
    }
  }

  const handleInvite = async () => {
    const email = inviteForm.email.trim()
    const fullName = inviteForm.fullName.trim()
    if (!email || !fullName) {
      toast.error('Email and full name are required')
      return
    }
    if (inviteForm.role === ROLES.EMPLOYEE && !inviteForm.employeeId) {
      toast.error('Select an employee record for Employee accounts')
      return
    }
    if (inviteForm.role === ROLES.EMPLOYEE && await isEmployeeLinked(inviteForm.employeeId, '')) {
      toast.error('That employee record is already linked to another account')
      return
    }

    setInviting(true)
    try {
      await inviteUserAccount({
        email,
        fullName,
        role: inviteForm.role,
        employeeId: inviteForm.role === ROLES.EMPLOYEE ? inviteForm.employeeId : null,
      })
      toast.success('Invitation sent successfully')
      setInviteOpen(false)
      setInviteForm({ email: '', fullName: '', role: ROLES.EMPLOYEE, employeeId: '' })
      setRefreshKey((value) => value + 1)
    } catch (error) {
      toast.error(error.message || 'Unable to invite user')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Roles</h1>
          <p className="text-sm text-slate-500">
            Manage Super Admin, Admin, and Employee access for existing accounts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button icon={UserPlus} onClick={() => setInviteOpen(true)}>Invite user</Button>
          <div className="flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
            <Shield className="h-4 w-4" />
            Super Admin only
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Super Admins', value: counts.superAdmins, icon: Shield },
          { label: 'Admins', value: counts.admins - counts.superAdmins, icon: UserCog },
          { label: 'Employees', value: counts.employees, icon: Users },
          { label: 'All accounts', value: counts.total, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
              </div>
              <div className="rounded-xl bg-brand-50 p-3 text-brand-700">
                <Icon className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Input
                icon={Search}
                placeholder="Search by name or email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              aria-label="Filter by role"
            >
              <option value="">All roles</option>
              {Object.values(ROLES).map((item) => (
                <option key={item} value={item}>{ROLE_LABELS[item]}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
        </CardHeader>

        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <EmptyState
            title="No user accounts found"
            description="Accounts are created through Supabase Authentication and appear here when registered."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Linked employee</th>
                    <th className="px-4 py-3 text-right font-medium">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.map((item) => {
                    const linkedEmployee = employees.find((employee) => employee.id === item.employee_id)
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.full_name}</p>
                          <p className="text-xs text-slate-500">{item.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item.role}>{ROLE_LABELS[item.role] || item.role}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item.status === 'DISABLED' ? 'INACTIVE' : 'ACTIVE'}>
                            {item.status || 'ACTIVE'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {linkedEmployee
                            ? `${linkedEmployee.full_name} (${linkedEmployee.employee_code})`
                            : item.role === ROLES.EMPLOYEE
                              ? 'Not linked'
                              : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEdit(item)}
                            >
                              Manage role
                            </Button>
                            {(item.status || 'ACTIVE') === 'DISABLED' ? (
                              <button
                                type="button"
                                title="Enable account"
                                className="rounded p-2 hover:bg-green-50"
                                onClick={() => setStatusConfirm(item)}
                              >
                                <UserCheck className="h-4 w-4 text-green-600" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Disable account"
                                className="rounded p-2 hover:bg-red-50"
                                onClick={() => setStatusConfirm(item)}
                              >
                                <UserX className="h-4 w-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => !saving && setEditing(null)}
        title="Manage user access"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button icon={Save} loading={saving} onClick={handleSave}>
              Save access
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{editing.full_name}</p>
              <p className="mt-1 text-sm text-slate-500">{editing.email}</p>
            </div>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Account role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {Object.values(ROLES).map((item) => (
                  <option key={item} value={item}>{ROLE_LABELS[item]}</option>
                ))}
              </select>
            </label>
            {role === ROLES.EMPLOYEE && (
              <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                Employee record
                <select
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name} ({employee.employee_code})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="text-xs leading-5 text-slate-500">
              Employees can access only their own employee record and payment history. Admins manage
              operational records; Super Admins also manage system settings, audit logs, and roles.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={inviteOpen}
        onClose={() => !inviting && setInviteOpen(false)}
        title="Invite user"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)} disabled={inviting}>
              Cancel
            </Button>
            <Button icon={UserPlus} loading={inviting} onClick={handleInvite}>
              Send invitation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={inviteForm.email}
            onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })}
            placeholder="user@company.com"
          />
          <Input
            label="Full name"
            value={inviteForm.fullName}
            onChange={(event) => setInviteForm({ ...inviteForm, fullName: event.target.value })}
            placeholder="Full name"
          />
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Role
            <select
              value={inviteForm.role}
              onChange={(event) => setInviteForm({
                ...inviteForm,
                role: event.target.value,
                employeeId: '',
              })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {Object.values(ROLES).map((item) => (
                <option key={item} value={item}>{ROLE_LABELS[item]}</option>
              ))}
            </select>
          </label>
          {inviteForm.role === ROLES.EMPLOYEE && (
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Employee record
              <select
                value={inviteForm.employeeId}
                onChange={(event) => setInviteForm({ ...inviteForm, employeeId: event.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.employee_code})
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="text-xs text-slate-500">
            Supabase sends a secure invitation email so the user can set their password.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!statusConfirm}
        onClose={() => !statusSaving && setStatusConfirm(null)}
        onConfirm={handleStatusChange}
        title={(statusConfirm?.status || 'ACTIVE') === 'DISABLED' ? 'Enable account' : 'Disable account'}
        message={
          (statusConfirm?.status || 'ACTIVE') === 'DISABLED'
            ? `Enable ${statusConfirm?.full_name}? They will be able to sign in again.`
            : `Disable ${statusConfirm?.full_name}? They will be signed out and cannot access the system.`
        }
        confirmText={(statusConfirm?.status || 'ACTIVE') === 'DISABLED' ? 'Enable' : 'Disable'}
        loading={statusSaving}
      />
    </div>
  )
}
