import { supabase } from '@/lib/supabase'
import { PAGE_SIZE } from '@/utils/constants'

export async function listAuditLogs({ page = 1, action = '', search = '' }) {
  let query = supabase.from('audit_logs').select('*', { count: 'exact' })
  if (action) query = query.eq('action', action)
  if (search) query = query.ilike('description', `%${search}%`)

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  return { data, count, totalPages: Math.ceil((count || 0) / PAGE_SIZE) }
}

export async function logAction({ action, entityType, entityId, description }) {
  const { error } = await supabase.from('audit_logs').insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    description,
  })
  if (error) console.error('Audit log failed:', error)
}