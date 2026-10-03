import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Users, DollarSign } from 'lucide-react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { getEmployeePaymentHistory, getMonthlySummary } from '@/services/paymentService'
import { formatCurrency, formatMonthYear } from '@/utils/formatters'

export default function EmployeeDashboard() {
  const { profile } = useAuth()
  const now = new Date()
  const [history, setHistory] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!profile?.employee_id) {
        setLoading(false)
        return
      }
      try {
        const [h, s] = await Promise.all([
          getEmployeePaymentHistory(profile.employee_id),
          getMonthlySummary(now.getMonth() + 1, now.getFullYear()),
        ])
        setHistory(h)
        setSummary(s)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile])

  const current = history.find(
    (p) => p.month === now.getMonth() + 1 && p.year === now.getFullYear()
  )

  if (!profile?.employee_id) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-600">
            Your account is not yet linked to an employee record. Please contact an administrator.
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
        <p className="text-sm text-slate-500">Welcome, {profile.full_name}</p>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">
            Current Status — {formatMonthYear(now.getMonth() + 1, now.getFullYear())}
          </h3>
        </CardHeader>
        <CardBody>
          {loading ? (
            <Skeleton className="h-16" />
          ) : current ? (
            <div className="flex items-center gap-4">
              <div className={`rounded-full p-3 ${current.status === 'PAID' ? 'bg-green-50' : 'bg-red-50'}`}>
                {current.status === 'PAID' ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{current.status}</p>
                <p className="text-sm text-slate-500">
                  Amount: {formatCurrency(current.amount)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No payment record yet for this month.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">My Payment History</h3>
        </CardHeader>
        <CardBody>
          {loading ? (
            <Skeleton className="h-32" />
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">No payment history yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.slice(0, 12).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {formatMonthYear(p.month, p.year)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(p.amount)}
                    </span>
                    <Badge variant={p.status}>{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">General Monthly Summary</h3>
        </CardHeader>
        <CardBody>
          {loading || !summary ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-slate-500">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Employees</span>
                </div>
                <p className="mt-1 text-xl font-bold text-slate-900">{summary.total_employees}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs text-green-700">Paid</p>
                <p className="mt-1 text-xl font-bold text-green-800">{summary.paid_count}</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-xs text-red-700">Unpaid</p>
                <p className="mt-1 text-xl font-bold text-red-800">{summary.unpaid_count}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs">Collected</span>
                </div>
                <p className="mt-1 text-xl font-bold text-blue-800">
                  {formatCurrency(summary.collected_amount)}
                </p>
              </div>
            </div>
          )}
          <p className="mt-4 text-xs text-slate-400">
            For transparency only. Individual employee information is private.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}