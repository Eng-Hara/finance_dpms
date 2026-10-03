import { useEffect, useState } from 'react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { getEmployee } from '@/services/employeeService'
import { formatCurrency, formatDate } from '@/utils/formatters'

export default function Profile() {
  const { profile } = useAuth()
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!profile?.employee_id) {
        setLoading(false)
        return
      }
      try {
        const data = await getEmployee(profile.employee_id)
        setEmployee(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile])

  if (loading) {
    return (
      <Card><CardBody><Skeleton className="h-32" /></CardBody></Card>
    )
  }

  if (!employee) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-600">No employee record linked to your account.</p>
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