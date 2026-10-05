import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, DollarSign, Save, History } from 'lucide-react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { getCurrentSetting, listSettings, updateSetting } from '@/services/settingsService'
import { logAction } from '@/services/auditService'
import { formatCurrency, formatDate } from '@/utils/formatters'

export default function Settings() {
  const toast = useToast()
  const { profile } = useAuth()
  const [amount, setAmount] = useState('')
  const [currentSetting, setCurrentSetting] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadSettings = async () => {
    setLoading(true)
    try {
      const [current, entries] = await Promise.all([getCurrentSetting(), listSettings()])
      setCurrentSetting(current)
      setHistory(entries)
      setAmount(current?.amount ?? '')
    } catch (error) {
      toast.error('Unable to load contribution settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 2 || value > 5) {
      toast.error('Contribution amount must be between $2 and $5')
      return
    }

    setSaving(true)
    try {
      await updateSetting({
        amount: value,
        createdBy: profile?.id,
      })
      await logAction({
        action: 'SETTING_UPDATED',
        entityType: 'contribution_setting',
        description: `Contribution amount updated to ${formatCurrency(value)}`,
      })
      toast.success('Contribution setting updated')
      await loadSettings()
    } catch (error) {
      toast.error(error.message || 'Unable to update setting')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500">Manage the monthly contribution baseline.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
          <SettingsIcon className="h-4 w-4" />
          Contribution policy
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Current Contribution Amount</h2>
              <Badge variant="default">Live</Badge>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            {loading ? (
              <Skeleton className="h-12" />
            ) : (
              <>
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-brand-600 p-2 text-white">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-brand-700">Active value</p>
                      <p className="mt-1 text-3xl font-bold text-slate-900">
                        {formatCurrency(currentSetting?.amount ?? Number(amount || 0))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    label="Monthly contribution amount"
                    type="number"
                    min="2"
                    max="5"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                  <p className="text-xs text-slate-500">
                    Effective from: {currentSetting ? formatDate(currentSetting.effective_from) : '—'}
                  </p>
                </div>

                <Button icon={Save} loading={saving} onClick={handleSave} className="w-full sm:w-auto">
                  Save setting
                </Button>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Policy Overview</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Last updated</p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {currentSetting?.created_at ? formatDate(currentSetting.created_at) : 'No history yet'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Responsible</p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {currentSetting?.created_by || 'System'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
              <p className="mt-2 text-base font-semibold text-emerald-700">Active policy in use</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-600" />
            <h2 className="font-semibold text-slate-900">History</h2>
          </div>
        </CardHeader>
        <CardBody>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No setting history available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Effective from</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Created by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{formatDate(item.effective_from)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-slate-700">{item.created_by || 'System'}</td>
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
