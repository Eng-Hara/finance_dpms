import { useEffect, useState } from 'react'
import {
  Users, UserCheck, UserX, DollarSign, TrendingUp, AlertCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { getMonthlySummary, getMonthlyTrend } from '@/services/paymentService'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency, formatMonthYear } from '@/utils/formatters'
import { MONTHS } from '@/utils/constants'

const COLORS = ['#16a34a', '#dc2626', '#f59e0b']

export default function Dashboard() {
  const toast = useToast()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const [s, t] = await Promise.all([
          getMonthlySummary(month, year),
          getMonthlyTrend(year),
        ])
        if (mounted) {
          setSummary(s)
          setTrend(
            t.map((x) => ({
              ...x,
              name: MONTHS[x.month - 1].label.slice(0, 3),
            }))
          )
        }
      } catch (err) {
        toast.error('Failed to load dashboard')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [month, year])

  const cards = summary
    ? [
        { label: 'Total Employees', value: summary.total_employees, icon: Users, color: 'text-blue-600 bg-blue-50' },
        { label: 'Active Employees', value: summary.active_employees, icon: UserCheck, color: 'text-green-600 bg-green-50' },
        { label: 'Paid This Month', value: summary.paid_count, icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
        { label: 'Unpaid This Month', value: summary.unpaid_count, icon: UserX, color: 'text-red-600 bg-red-50' },
        { label: 'Expected', value: formatCurrency(summary.expected_amount), icon: DollarSign, color: 'text-slate-600 bg-slate-100' },
        { label: 'Collected', value: formatCurrency(summary.collected_amount), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
        { label: 'Remaining', value: formatCurrency(summary.remaining_amount), icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
      ]
    : []

  const pieData = summary
    ? [
        { name: 'Paid', value: Number(summary.paid_count) },
        { name: 'Unpaid', value: Number(summary.unpaid_count) },
        { name: 'Partial', value: Number(summary.partial_count) },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Overview for {formatMonthYear(month, year)}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
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
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardBody><Skeleton className="h-16" /></CardBody></Card>
            ))
          : cards.map((c) => (
              <Card key={c.label}>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{c.label}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{c.value}</p>
                    </div>
                    <div className={`rounded-lg p-2 ${c.color}`}>
                      <c.icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Collection Trend ({year})</h3>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="collected" stroke="#0c8ee7" strokeWidth={2} name="Collected" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Paid vs Unpaid</h3>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">Monthly Comparison ({year})</h3>
        </CardHeader>
        <CardBody>
          {loading ? (
            <Skeleton className="h-64" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="paid" fill="#16a34a" name="Paid" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unpaid" fill="#dc2626" name="Unpaid" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>
    </div>
  )
}