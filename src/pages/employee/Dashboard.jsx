import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Users, DollarSign, AlertCircle } from 'lucide-react'
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
  const [error, setError] = useState('')
  const [summaryError, setSummaryError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!profile?.employee_id) {
        if (active) {
          setHistory([])
          setSummary(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError('')
      setSummaryError('')
      const [historyResult, summaryResult] = await Promise.allSettled([
        getEmployeePaymentHistory(profile.employee_id),
        getMonthlySummary(now.getMonth() + 1, now.getFullYear()),
      ])

      if (!active) return
      if (historyResult.status === 'fulfilled') {
        setHistory(historyResult.value)
      } else {
        setError(historyResult.reason?.message || 'Unable to load your payment history.')
      }
      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value)
      } else {
        setSummaryError(summaryResult.reason?.message || 'Unable to load the monthly summary.')
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [profile?.employee_id])

  const current = history.find(
    (p) => p.month === now.getMonth() + 1 && p.year === now.getFullYear()
  )

  if (!profile?.employee_id) {
    return (
      <Card>
        <CardBody>
          <h2 className="font-semibold text-slate-900">Member account not linked</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your login needs to be linked to your Mem record before your information can appear.
            Please ask a Super Admin to link it from User Roles.
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
          {error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Could not load your payment history: {error}
            </div>
          ) : loading ? (
            <Skeleton className="h-16" />
          ) : current ? (
            <div className="flex items-center gap-4">
              <div className={`rounded-full p-3 ${
                current.status === 'PAID'
                  ? 'bg-green-50'
                  : current.status === 'PARTIAL'
                    ? 'bg-amber-50'
                    : 'bg-red-50'
              }`}>
                {current.status === 'PAID' ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : current.status === 'PARTIAL' ? (
                  <AlertCircle className="w-8 h-8 text-amber-600" />
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
          {error ? (
            <p className="text-sm text-red-700">Payment history is unavailable until the load error is resolved.</p>
          ) : loading ? (
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
          {summaryError ? (
            <p role="alert" className="text-sm text-red-700">
              Monthly summary is unavailable: {summaryError}
            </p>
          ) : loading || !summary ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-slate-500">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Active employees</span>
                </div>
                <p className="mt-1 text-xl font-bold text-slate-900">{summary.active_employees}</p>
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
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs text-amber-800">Remaining</p>
                <p className="mt-1 text-xl font-bold text-amber-900">
                  {formatCurrency(summary.remaining_amount)}
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