import { useEffect, useMemo, useState } from 'react'
import { Search, ShieldCheck, Filter } from 'lucide-react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { listAuditLogs } from '@/services/auditService'
import { formatDateTime } from '@/utils/formatters'
import { useToast } from '@/contexts/ToastContext'

const ACTIONS = [
  'ALL',
  'LOGIN',
  'REPORT_GENERATED',
  'SETTING_UPDATED',
  'USER_ROLE_UPDATED',
  'PAYMENT_ADDED',
  'PAYMENT_CREATED',
  'PAYMENT_UPDATED',
  'PAYMENT_DELETED',
  'EMPLOYEE_CREATED',
  'EMPLOYEE_UPDATED',
  'EMPLOYEE_DEACTIVATED',
]

export default function AuditLogs() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [count, setCount] = useState(0)
  const toast = useToast()

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await listAuditLogs({
          page,
          action: action === 'ALL' ? '' : action,
          search,
        })
        setData(res.data || [])
        setTotalPages(res.totalPages || 1)
        setCount(res.count || 0)
      } catch (error) {
        if (active) {
          setData([])
          setCount(0)
          setTotalPages(1)
          toast.error(error.message || 'Unable to load audit logs')
        }
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [page, action, search, toast])

  const summary = useMemo(() => ({ total: count }), [count])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-sm text-slate-500">Review system activity and user actions.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
          <ShieldCheck className="h-4 w-4" />
          {summary.total} entries
        </div>
      </div>

      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={action}
              onChange={(e) => {
                setPage(1)
                setAction(e.target.value)
              }}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {ACTIONS.map((item) => (
                <option key={item} value={item}>{item === 'ALL' ? 'All actions' : item}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            title="No audit events found"
            description="Try adjusting your search or action filter."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{formatDateTime(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={log.action === 'LOGIN' ? 'default' : 'default'} className="bg-slate-100 text-slate-700">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{log.entity_type || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{log.description || 'No description provided.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
