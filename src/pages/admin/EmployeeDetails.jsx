import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Phone, MapPin, Briefcase, CalendarDays } from 'lucide-react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Skeleton from '@/components/ui/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { getEmployee } from '@/services/employeeService'
import { getEmployeePaymentHistory } from '@/services/paymentService'
import { formatCurrency, formatDate, formatMonthYear } from '@/utils/formatters'

export default function EmployeeDetails() {
  const { employeeId } = useParams()
  const toast = useToast()
  const [employee, setEmployee] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [employeeData, paymentHistory] = await Promise.all([
          getEmployee(employeeId),
          getEmployeePaymentHistory(employeeId),
        ])
        if (active) {
          setEmployee(employeeData)
          setPayments(paymentHistory)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Unable to load employee details')
          toast.error(loadError.message || 'Unable to load employee details')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [employeeId, toast])

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !employee) {
    return (
      <Card>
        <CardBody className="space-y-4">
          <p role="alert" className="text-sm text-red-700">
            {error || 'Employee record not found.'}
          </p>
          <Link to="/admin/employees">
            <Button variant="secondary" icon={ArrowLeft}>Back to members</Button>
          </Link>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link to="/admin/employees" aria-label="Back to employees">
            <Button variant="secondary" size="sm" icon={ArrowLeft}>Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{employee.full_name}</h1>
            <p className="text-sm text-slate-500">Member ID: {employee.employee_code}</p>
          </div>
        </div>
        <Badge variant={employee.status}>{employee.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-900">Member Information</h2>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
            <div><p className="text-xs text-slate-500">Phone</p><p className="mt-1 text-sm font-medium text-slate-900">{employee.phone}</p></div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
            <div><p className="text-xs text-slate-500">Location</p><p className="mt-1 text-sm font-medium text-slate-900">{employee.location || '—'}</p></div>
          </div>
          <div className="flex items-start gap-3">
            <Briefcase className="mt-0.5 h-4 w-4 text-slate-400" />
            <div><p className="text-xs text-slate-500">Family</p><p className="mt-1 text-sm font-medium text-slate-900">{employee.department || '—'}</p></div>
          </div>
          <div>
            <p className="text-xs text-slate-500">Monthly contribution</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{formatCurrency(employee.monthly_amount)}</p>
          </div>
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
            <div><p className="text-xs text-slate-500">Registered</p><p className="mt-1 text-sm font-medium text-slate-900">{formatDate(employee.created_at)}</p></div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-900">Payment History</h2>
        </CardHeader>
        {payments.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            description="Payment records for this employee will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatMonthYear(payment.month, payment.year)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3"><Badge variant={payment.status}>{payment.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(payment.payment_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
