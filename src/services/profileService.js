import { supabase } from '@/lib/supabase'
import { PAGE_SIZE } from '@/utils/constants'

export async function listProfiles({ page = 1, search = '', role = '', status = '' }) {
  let query = supabase.from('profiles').select('*', { count: 'exact' })

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (role) query = query.eq('role', role)
  if (status) query = query.eq('status', status)

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data, error, count } = await query
    .order('full_name', { ascending: true })
    .range(from, to)

  if (error) throw error
  return { data, count, totalPages: Math.ceil((count || 0) / PAGE_SIZE) }
}

export async function listActiveEmployeeOptions() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_code, full_name')
    .order('full_name', { ascending: true })

  if (error) throw error
  return data
}

export async function getProfileRoleCounts(status = 'ACTIVE') {
  const roles = ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE']
  const counts = await Promise.all(
    roles.map(async (role) => {
      let query = supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', role)
      if (status) query = query.eq('status', status)
      const { count, error } = await query
      if (error) throw error
      return [role, count || 0]
    })
  )

  return Object.fromEntries(counts)
}

export async function getProfileStatusCounts() {
  const statuses = ['ACTIVE', 'DISABLED']
  const counts = await Promise.all(
    statuses.map(async (status) => {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
      if (error) throw error
      return [status, count || 0]
    })
  )

  return Object.fromEntries(counts)
}

export async function isEmployeeLinked(employeeId, exceptProfileId) {
  let query = supabase
    .from('profiles')
    .select('id')
    .eq('employee_id', employeeId)
  if (exceptProfileId) query = query.neq('id', exceptProfileId)
  const { data, error } = await query.limit(1).maybeSingle()

  if (error) throw error
  return !!data
}

export async function updateProfileAccess(profileId, { role, employeeId, status }) {
  const updates = {
    role,
    employee_id: role === 'EMPLOYEE' ? employeeId || null : null,
  }
  if (status) updates.status = status

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProfileStatus(profileId, status) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', profileId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function inviteUserAccount({ email, fullName, role, employeeId }) {
  const { data, error } = await supabase.functions.invoke('manage-user', {
    body: { action: 'invite', email, full_name: fullName, role, employee_id: employeeId || null },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
