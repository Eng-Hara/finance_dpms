import { useEffect, useState } from 'react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { getEmployeePaymentHistory } from '@/services/paymentService'
import { formatCurrency, formatMonthYear, formatDate } from '@/utils/formatters'

export default function MyPayments() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!profile?.employee_id) {
        if (active) {
          setPayments([])
          setLoading(false)
        }
        return
      }
      setLoading(true)
      setError('')
      try {
        const data = await getEmployeePaymentHistory(profile.employee_id)
        if (active) setPayments(data)
      } catch (error) {
        if (active) setError(error.message || 'Unable to load your payment history.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [profile?.employee_id, retryKey])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Payments</h1>
        <p className="text-sm text-slate-500">Your complete contribution history</p>
      </div>

      <Card>
        {!profile?.employee_id ? (
          <EmptyState
            title="Employee account not linked"
            description="Ask a Super Admin to link your login to your employee record from User Roles."
          />
        ) : error ? (
          <div role="alert" className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-700">Could not load your payment history: {error}</p>
            <Button size="sm" variant="secondary" onClick={() => setRetryKey((key) => key + 1)}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : payments.length === 0 ? (
          <EmptyState title="No payments yet" description="Your payment history will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatMonthYear(p.month, p.year)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3"><Badge variant={p.status}>{p.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(p.payment_date)}</td>
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