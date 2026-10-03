import { supabase } from '@/lib/supabase'

export async function getCurrentSetting() {
  const { data, error } = await supabase
    .from('contribution_settings')
    .select('*')
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateSetting({ amount, createdBy }) {
  const { data, error } = await supabase
    .from('contribution_settings')
    .insert({
      amount,
      effective_from: new Date().toISOString().slice(0, 10),
      created_by: createdBy,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listSettings() {
  const { data, error } = await supabase
    .from('contribution_settings')
    .select('*')
    .order('effective_from', { ascending: false })
  if (error) throw error
  return data
}