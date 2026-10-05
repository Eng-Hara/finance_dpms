import { supabase } from '@/lib/supabase'
import { PAGE_SIZE } from '@/utils/constants'

async function findEmployeeIds(search) {
  const columns = ['full_name', 'phone', 'employee_code']
  const results = await Promise.all(
    columns.map((column) =>
      supabase
        .from('employees')
        .select('id')
        .ilike(column, `%${search}%`)
    )
  )

  const failed = results.find(({ error }) => error)
  if (failed) throw failed.error
  return [...new Set(results.flatMap(({ data }) => (data || []).map(({ id }) => id)))]
}

export async function listEmployees({ search = '', status = '', page = 1 }) {
  let query = supabase.from('employees').select('*', { count: 'exact' })

  if (search) {
    const employeeIds = await findEmployeeIds(search)
    if (!employeeIds.length) return { data: [], count: 0, totalPages: 0 }
    query = query.in('id', employeeIds)
  }
  if (status) query = query.eq('status', status)

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { data, count, totalPages: Math.ceil((count || 0) / PAGE_SIZE) }
}

export async function listPaymentEmployeeOptions() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_code, full_name, monthly_amount')
    .eq('status', 'ACTIVE')
    .order('full_name', { ascending: true })

  if (error) throw error
  return data
}

export async function getEmployee(id) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createEmployee(payload) {
  const { data, error } = await supabase.from('employees').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateEmployee(id, payload) {
  const { data, error } = await supabase
    .from('employees')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deactivateEmployee(id) {
  return updateEmployee(id, { status: 'INACTIVE' })
}

export async function deleteEmployee(id) {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw error
}

export async function findEmployeeByPhone(phone) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('phone', phone)
    .maybeSingle()
  if (error) throw error
  return data
}
