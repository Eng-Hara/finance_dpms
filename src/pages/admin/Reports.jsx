import { useEffect, useState } from 'react'
import { FileText, FileSpreadsheet, FileDown } from 'lucide-react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { listPayments, getMonthlySummary } from '@/services/paymentService'
import { generateContributionPDF, downloadPDF } from '@/features/reports/pdfGenerator'
import { exportToExcel, exportToCSV } from '@/utils/exportHelpers'
import { MONTHS, PAYMENT_STATUS, COMPANY_NAME } from '@/utils/constants'
import { formatCurrency, formatMonthYear, formatDate } from '@/utils/formatters'
import { logAction } from '@/services/auditService'

const now = new Date()

export default function Reports() {
  const toast = useToast()
  const { profile } = useAuth()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([
        listPayments({ month, year, status: status || undefined, page: 1 }),
        getMonthlySummary(month, year),
      ])
      setRows(p.data || [])
      setSummary(s)
    } catch (e) {
      toast.error('Unable to generate report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [month, year, status])

  const reportTitle = status ? `${status} EMPLOYEES REPORT` : 'EMPLOYEE MONTHLY CONTRIBUTION REPORT'

  const handlePDF = async () => {
    try {
      const doc = generateContributionPDF({
        month, year, summary, payments: rows,
        generatedBy: profile?.full_name,
        reportTitle,
      })
      downloadPDF(doc, `Contribution_${year}_${String(month).padStart(2,'0')}.pdf`)
      await logAction({
        action: 'REPORT_GENERATED',
        entityType: 'report',
        description: `PDF report generated for ${formatMonthYear(month, year)}`,
      })
      toast.success('PDF downloaded')
    } catch (e) {
      toast.error('Unable to generate report')
    }
  }

  const flatRows = rows.map((p) => ({
    'Employee ID': p.employees?.employee_code || '',
    'Employee Name': p.employees?.full_name || '',
    'Month': MONTHS[p.month - 1]?.label,
    'Year': p.year,
    'Amount': p.amount,
    'Status': p.status,
    'Payment Date': p.payment_date ? formatDate(p.payment_date) : '',
    'Notes': p.notes || '',
  }))

  const handleExcel = () => {
    exportToExcel(flatRows, `Contribution_${year}_${String(month).padStart(2,'0')}.xlsx`)
    toast.success('Excel downloaded')
  }

  const handleCSV = () => {
    exportToCSV(flatRows, `Contribution_${year}_${String(month).padStart(2,'0')}.csv`)
    toast.success('CSV downloaded')
  }

  // ... render filters + summary + table + export buttons
  return (
    <div className="space-y-5">
      {/* Filters, summary cards, and preview table with export buttons */}
    </div>
  )
}