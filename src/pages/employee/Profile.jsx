import { useEffect, useState } from 'react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { getEmployee } from '@/services/employeeService'
import { formatCurrency, formatDate } from '@/utils/formatters'

export default function Profile() {
  const { profile } = useAuth()
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!profile?.employee_id) {
        if (active) {
          setEmployee(null)
          setLoading(false)
        }
        return
      }
      setLoading(true)
      setError('')
      try {
        const data = await getEmployee(profile.employee_id)
        if (active) setEmployee(data)
      } catch (error) {
        if (active) setError(error.message || 'Unable to load your employee record.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [profile?.employee_id, retryKey])

  if (loading) {
    return (
      <Card><CardBody><Skeleton className="h-32" /></CardBody></Card>
    )
  }

  if (!employee) {
    return (
      <Card>
        <CardBody className="space-y-3">
          {error ? (
            <>
              <p role="alert" className="text-sm text-red-700">
                Could not load your Memeber record: {error}
              </p>
              <Button size="sm" variant="secondary" onClick={() => setRetryKey((key) => key + 1)}>
                Try again
              </Button>
            </>
          ) : (
            <>
              <h2 className="font-semibold text-slate-900">Member account not linked</h2>
              <p className="text-sm text-slate-600">
                Ask a Super Admin to link your login to your Member record from User Roles.
              </p>
            </>
          )}
        </CardBody>
      </Card>
    )
  }

  const rows = [
    ['Employee ID', employee.employee_code],
    ['Full Name', employee.full_name],
    ['Phone', employee.phone],
    ['Location', employee.location || '—'],
    ['Department', employee.department || '—'],
    ['Monthly Amount', formatCurrency(employee.monthly_amount)],
    ['Registered', formatDate(employee.created_at)],
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500">Your personal information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{employee.full_name}</h3>
            <Badge variant={employee.status}>{employee.status}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <dl className="divide-y divide-slate-100">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-3">
                <dt className="text-sm text-slate-500">{k}</dt>
                <dd className="text-sm font-medium text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>
    </div>
  )
}