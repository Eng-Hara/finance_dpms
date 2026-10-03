import { supabase } from '@/lib/supabase'
import { PAGE_SIZE } from '@/utils/constants'

export async function listPayments({ month, year, status, employeeId, page = 1 }) {
  let query = supabase
    .from('payments')
    .select('*, employees(full_name, employee_code, phone)', { count: 'exact' })

  if (month) query = query.eq('month', month)
  if (year) query = query.eq('year', year)
  if (status) query = query.eq('status', status)
  if (employeeId) query = query.eq('employee_id', employeeId)

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await query
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { data, count, totalPages: Math.ceil((count || 0) / PAGE_SIZE) }
}

export async function getEmployeePaymentHistory(employeeId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('employee_id', employeeId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (error) throw error
  return data
}

export async function createPayment(payload) {
  const { data, error } = await supabase
    .from('payments')
    .insert(payload)
    .select()
    .single()
  if (error) {
    if (error.code === '23505') {
      throw new Error('Payment for this employee and month already exists.')
    }
    throw error
  }
  return data
}

export async function updatePayment(id, payload) {
  const { data, error } = await supabase
    .from('payments')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePayment(id) {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw error
}

export async function getMonthlySummary(month, year) {
  const { data, error } = await supabase.rpc('get_monthly_summary', {
    p_month: month,
    p_year: year,
  })
  if (error) throw error
  return data?.[0]
}

export async function getMonthlyTrend(year) {
  const { data, error } = await supabase
    .from('payments')
    .select('month, amount, status')
    .eq('year', year)
  if (error) throw error

  const trend = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    collected: 0,
    paid: 0,
    unpaid: 0,
  }))

  data.forEach((p) => {
    const m = trend[p.month - 1]
    if (p.status === 'PAID' || p.status === 'PARTIAL') m.collected += Number(p.amount)
    if (p.status === 'PAID') m.paid += 1
    if (p.status === 'UNPAID') m.unpaid += 1
  })

  return trend
}
