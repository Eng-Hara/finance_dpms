import { useEffect, useState } from 'react'
import { FileText, FileSpreadsheet, FileDown, TrendingUp } from 'lucide-react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { listAllPayments, getMonthlySummary } from '@/services/paymentService'
import { generateContributionPDF, downloadPDF } from '@/features/reports/pdfGenerator'
import { exportToExcel, exportToCSV } from '@/utils/exportHelpers'
import { MONTHS, PAYMENT_STATUS } from '@/utils/constants'
import { formatCurrency, formatMonthYear, formatDate } from '@/utils/formatters'
import { logAction } from '@/services/auditService'

const now = new Date()

export default function Reports() {
  const toast = useToast()
  const { profile } = useAuth()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let active = true
    const fetchData = async () => {
      setLoading(true)
      try {
        const [payments, monthlySummary] = await Promise.all([
          listAllPayments({ month, year, status: status || undefined }),
          getMonthlySummary(month, year),
        ])
        if (active) {
          setRows(payments || [])
          setSummary(monthlySummary)
        }
      } catch (error) {
        if (active) {
          setRows([])
          setSummary(null)
          toast.error(error.message || 'Unable to generate report')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()
    return () => { active = false }
  }, [month, year, status, toast])

  const reportTitle = status ? `${status} EMPLOYEES REPORT` : 'EMPLOYEE MONTHLY CONTRIBUTION REPORT'

  const handlePDF = async () => {
    if (!summary) {
      toast.error('Wait for the report data to finish loading')
      return
    }
    try {
      const doc = generateContributionPDF({
        month,
        year,
        summary,
        payments: rows,
        generatedBy: profile?.full_name,
        reportTitle,
      })
      downloadPDF(doc, `Contribution_${year}_${String(month).padStart(2, '0')}.pdf`)
      await logAction({
        action: 'REPORT_GENERATED',
        entityType: 'report',
        description: `PDF report generated for ${formatMonthYear(month, year)}`,
      })
      toast.success('PDF downloaded successfully')
    } catch (error) {
      toast.error('Unable to generate report')
    }
  }

  const flatRows = rows.map((p) => ({
    'Employee ID': p.employees?.employee_code || '',
    'Employee Name': p.employees?.full_name || '',
    'Month': MONTHS[p.month - 1]?.label || p.month,
    'Year': p.year,
    'Amount': p.amount,
    'Status': p.status,
    'Payment Date': p.payment_date ? formatDate(p.payment_date) : '',
    'Notes': p.notes || '',
  }))

  const handleExcel = () => {
    exportToExcel(flatRows, `Contribution_${year}_${String(month).padStart(2, '0')}.xlsx`)
    toast.success('Excel report downloaded')
  }

  const handleCSV = () => {
    exportToCSV(flatRows, `Contribution_${year}_${String(month).padStart(2, '0')}.csv`)
    toast.success('CSV report downloaded')
  }

  const summaryCards = summary
    ? [
        { label: 'Expected', value: formatCurrency(summary.expected_amount), tone: 'slate' },
        { label: 'Collected', value: formatCurrency(summary.collected_amount), tone: 'emerald' },
        { label: 'Remaining', value: formatCurrency(summary.remaining_amount), tone: 'amber' },
        { label: 'Paid', value: String(summary.paid_count ?? 0), tone: 'green' },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Contribution analytics and export-ready reports.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={FileSpreadsheet} onClick={handleExcel} disabled={loading || !rows.length}>
            Excel
          </Button>
          <Button variant="secondary" icon={FileDown} onClick={handleCSV} disabled={loading || !rows.length}>
            CSV
          </Button>
          <Button icon={FileText} onClick={handlePDF} disabled={loading || !summary}>
            PDF
          </Button>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">All statuses</option>
            {Object.values(PAYMENT_STATUS).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <CardBody className="space-y-6">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-50 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-700">Report period</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">{formatMonthYear(month, year)}</h2>
            </div>
            <div className="flex items-center gap-2 text-brand-700">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">{reportTitle}</span>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{card.label}</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <Skeleton className="h-72" />
          ) : rows.length === 0 ? (
            <EmptyState title="No data for this report" description="Adjust the filters to view another period or status." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Month</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{payment.employees?.full_name || '—'}</p>
                          <p className="text-xs text-slate-500">{payment.employees?.phone || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{payment.employees?.employee_code || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{MONTHS[payment.month - 1]?.label || payment.month}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={payment.status}>{payment.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {payment.payment_date ? formatDate(payment.payment_date) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}