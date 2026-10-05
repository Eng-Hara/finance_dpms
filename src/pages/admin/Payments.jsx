import { useEffect, useState } from 'react'
import { Plus, Search, Edit3, Trash2 } from 'lucide-react'
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
  listPayments, createPayment, updatePayment, deletePayment,
} from '@/services/paymentService'
import { listPaymentEmployeeOptions } from '@/services/employeeService'
import { MONTHS, PAYMENT_STATUS } from '@/utils/constants'
import { formatCurrency, formatMonthYear, formatDate } from '@/utils/formatters'
import { validatePayment } from '@/utils/validators'

const now = new Date()

export default function Payments() {
  const toast = useToast()
  const { profile, role } = useAuth()
  const [month, setMonth] = useState('')
  const [year, setYear] = useState(now.getFullYear())
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const [page, setPage] = useState(1)
  const [data, setData] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({
    employee_id: '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    amount: 5,
    status: 'PAID',
    payment_date: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [formErrors, setFormErrors] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await listPayments({
        month: month || undefined,
        year: year || undefined,
        status: status || undefined,
        search: debouncedSearch,
        page,
      })
      setData(res.data || [])
      setTotalPages(res.totalPages || 1)
    } catch (err) {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setPage(1) }, [month, year, status, debouncedSearch])
  useEffect(() => { load() }, [month, year, status, debouncedSearch, page])

  useEffect(() => {
    let active = true
    const loadEmp = async () => {
      try {
        const results = await listPaymentEmployeeOptions()
        if (active) setEmployees(results || [])
      } catch (err) {
        if (active) toast.error('Failed to load employees for payment entry')
      }
    }
    loadEmp()
    return () => { active = false }
  }, [toast])

  const openCreate = () => {
    setEditing(null)
    setForm({
      employee_id: '',
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      amount: 5,
      status: 'PAID',
      payment_date: new Date().toISOString().slice(0, 10),
      notes: '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      employee_id: p.employee_id,
      month: p.month,
      year: p.year,
      amount: p.amount,
      status: p.status,
      payment_date: p.payment_date || '',
      notes: p.notes || '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const handleSave = async () => {
    const errs = validatePayment(form)
    setFormErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const payload = {
        ...form,
        month: Number(form.month),
        year: Number(form.year),
        amount: Number(form.amount),
        payment_date: form.payment_date || null,
        recorded_by: profile?.id,
      }
      if (editing) {
        const { employee_id: _e, month: _m, year: _y, ...updatePayload } = payload
        await updatePayment(editing.id, updatePayload)
        toast.success('Payment updated successfully')
      } else {
        await createPayment(payload)
        toast.success('Payment recorded successfully')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm) return
    try {
      await deletePayment(confirm.id)
      toast.success('Payment deleted')
      setConfirm(null)
      load()
    } catch (err) {
      toast.error('Failed to delete payment')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500">Record and manage monthly contributions</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Record Payment</Button>
      </div>

      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Months</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {Object.values(PAYMENT_STATUS).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : data.length === 0 ? (
          <EmptyState title="No payments found" description="Try adjusting filters or record a new payment." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{p.employees?.full_name}</p>
                          <p className="text-xs text-slate-500">{p.employees?.employee_code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatMonthYear(p.month, p.year)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3"><Badge variant={p.status}>{p.status}</Badge></td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(p.payment_date)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(p)} className="rounded p-1.5 hover:bg-slate-100">
                            <Edit3 className="w-4 h-4 text-slate-500" />
                          </button>
                          {role === 'SUPER_ADMIN' && (
                            <button onClick={() => setConfirm(p)} className="rounded p-1.5 hover:bg-red-50">
                              <Trash2 className="w-4 h-4 text-red-500" />
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
        title={editing ? 'Edit Payment' : 'Record Payment'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Save Changes' : 'Record Payment'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Employee</label>
              <select
                value={form.employee_id}
                onChange={(e) => {
                  const emp = employees.find((x) => x.id === e.target.value)
                  setForm({
                    ...form,
                    employee_id: e.target.value,
                    amount: emp?.monthly_amount || form.amount,
                  })
                }}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm ${formErrors.employee_id ? 'border-red-400' : 'border-slate-300'}`}
              >
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} ({e.employee_code})
                  </option>
                ))}
              </select>
              {formErrors.employee_id && <p className="mt-1 text-xs text-red-600">{formErrors.employee_id}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Month</label>
              <select
                value={form.month}
                onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Year</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={formErrors.amount}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {Object.values(PAYMENT_STATUS).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <Input
            label="Payment Date"
            type="date"
            value={form.payment_date}
            onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Payment"
        message={`Delete payment for ${confirm?.employees?.full_name} (${formatMonthYear(confirm?.month, confirm?.year)})? This cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  )
}