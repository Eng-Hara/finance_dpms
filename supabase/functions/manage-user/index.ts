import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const authorization = request.headers.get('Authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(401, { error: 'Authorization or server configuration is missing' })
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: callerResult, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerResult.user) return json(401, { error: 'Invalid session' })

  const { data: actor, error: actorError } = await callerClient
    .from('profiles')
    .select('id, full_name, role, status')
    .eq('id', callerResult.user.id)
    .single()
  if (actorError || actor?.role !== 'SUPER_ADMIN' || actor?.status !== 'ACTIVE') {
    return json(403, { error: 'Only an active Super Admin can invite users' })
  }

  let body: {
    action?: string
    email?: string
    full_name?: string
    role?: string
    employee_id?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Invalid JSON request body' })
  }

  const email = body.email?.trim().toLowerCase()
  const fullName = body.full_name?.trim()
  const role = body.role
  const employeeId = body.employee_id || null
  if (
    body.action !== 'invite'
    || !email
    || !fullName
    || !['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'].includes(role || '')
    || (role === 'EMPLOYEE' && !employeeId)
    || (role !== 'EMPLOYEE' && employeeId)
  ) {
    return json(400, { error: 'Provide a valid invite action, email, name, role, and employee link' })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  if (employeeId) {
    const { data: employee, error: employeeError } = await adminClient
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .maybeSingle()
    if (employeeError) return json(500, { error: 'Unable to verify employee record' })
    if (!employee) return json(400, { error: 'Employee record does not exist' })

    const { data: linkedProfile, error: linkedError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('employee_id', employeeId)
      .maybeSingle()
    if (linkedError) return json(500, { error: 'Unable to verify employee account link' })
    if (linkedProfile) return json(409, { error: 'Employee record is already linked to an account' })
  }

  const { data: invitation, error: invitationError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    })
  if (invitationError || !invitation.user) {
    return json(400, { error: invitationError?.message || 'Unable to invite user' })
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ full_name: fullName, role, employee_id: employeeId })
    .eq('id', invitation.user.id)
  if (profileError) {
    return json(500, {
      error: `Invitation was sent, but account setup failed. The new account remains an unlinked Employee: ${profileError.message}`,
    })
  }

  const { error: auditError } = await adminClient.from('audit_logs').insert({
    user_id: actor.id,
    user_name: actor.full_name,
    action: 'USER_INVITED',
    entity_type: 'profile',
    entity_id: invitation.user.id,
    description: `Invited ${fullName} (${email}) as ${role}`,
  })
  if (auditError) {
    return json(500, {
      error: `User was invited and access assigned, but audit logging failed: ${auditError.message}`,
    })
  }

  return json(201, { id: invitation.user.id, email })
})
