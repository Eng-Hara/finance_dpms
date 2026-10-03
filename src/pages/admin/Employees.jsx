import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Edit3, UserX, UserCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useDebounce } from '@/hooks/useDebounce'
import {
  listEmployees, createEmployee, updateEmployee, deactivateEmployee,
} from '@/services/employeeService'
import { validateEmployee } from '@/utils/validators'
import { formatCurrency, formatDate } from '@/utils/formatters'

const emptyForm = {
  employee_code: '',
  full_name: '',
  phone: '',
  location: '',
  department: '',
  monthly_amount: 5,
  status: 'ACTIVE',
  notes: '',
}

export default function Employees() {
  const toast = useToast()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await listEmployees({ search: debouncedSearch, status: statusFilter, page })
      setData(res.data || [])
      setTotalPages(res.totalPages || 1)
    } catch (err) {
      toast.error('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])
  useEffect(() => { load() }, [debouncedSearch, statusFilter, page])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (emp) => {
    setEditing(emp)
    setForm({
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      phone: emp.phone,
      location: emp.location || '',
      department: emp.department || '',
      monthly_amount: emp.monthly_amount,
      status: emp.status,
      notes: emp.notes || '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const handleSave = async () => {
    const errs = validateEmployee(form)
    setFormErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const payload = {
        ...form,
        monthly_amount: Number(form.monthly_amount),
      }
      if (editing) {
        await updateEmployee(editing.id, payload)
        toast.success('Employee updated successfully')
      } else {
        await createEmployee(payload)
        toast.success('Employee created successfully')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      if (err.code === '23505') {
        toast.error('Phone number or Employee ID already exists')
      } else {
        toast.error(err.message || 'Operation failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!confirm) return
    try {
      await deactivateEmployee(confirm.id)
      toast.success('Employee deactivated')
      setConfirm(null)
      load()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500">Manage employee records</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Add Employee</Button>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Search by name, phone or employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            title="No employees found"
            description="Try adjusting your search or add a new employee."
            action={<Button icon={Plus} onClick={openCreate}>Add Employee</Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Employee ID</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Monthly</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {emp.employee_code}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {emp.full_name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{emp.phone}</td>
                      <td className="px-4 py-3 text-slate-600">{emp.department || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatCurrency(emp.monthly_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={emp.status}>{emp.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Link to={`/admin/employees/${emp.id}`}>
                            <button className="rounded p-1.5 hover:bg-slate-100" title="View">
                              <Eye className="w-4 h-4 text-slate-500" />
                            </button>
                          </Link>
                          <button
                            onClick={() => openEdit(emp)}
                            className="rounded p-1.5 hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4 text-slate-500" />
                          </button>
                          {emp.status === 'ACTIVE' && (
                            <button
                              onClick={() => setConfirm(emp)}
                              className="rounded p-1.5 hover:bg-red-50"
                              title="Deactivate"
                            >
                              <UserX className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Employee' : 'Add Employee'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Save Changes' : 'Create Employee'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Employee ID"
            value={form.employee_code}
            onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
            error={formErrors.employee_code}
            placeholder="EMP001"
          />
          <Input
            label="Full Name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            error={formErrors.full_name}
            placeholder="Ahmed Hassan"
          />
          <Input
            label="Phone Number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={formErrors.phone}
            placeholder="0612345678"
          />
          <Input
            label="Location / Residence"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Mogadishu"
          />
          <Input
            label="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            placeholder="Finance"
          />
          <Input
            label="Monthly Amount ($2 - $5)"
            type="number"
            step="0.01"
            min="2"
            max="5"
            value={form.monthly_amount}
            onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })}
            error={formErrors.monthly_amount}
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Optional notes..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleToggleStatus}
        title="Deactivate Employee"
        message={`Are you sure you want to deactivate ${confirm?.full_name}? They will no longer appear in active lists.`}
        confirmText="Deactivate"
      />
    </div>
  )
}