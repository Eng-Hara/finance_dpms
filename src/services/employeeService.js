import { supabase } from '@/lib/supabase'
import { PAGE_SIZE } from '@/utils/constants'

export async function listEmployees({ search = '', status = '', page = 1 }) {
  let query = supabase.from('employees').select('*', { count: 'exact' })

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,phone.ilike.%${search}%,employee_code.ilike.%${search}%`
    )
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
