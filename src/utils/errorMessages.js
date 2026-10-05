const CODE_MESSAGES = {
  '42501': 'You do not have permission to perform this action.',
  '23505': 'This record already exists.',
  '23514': 'This change is not allowed.',
  'PGRST116': 'Record not found.',
}

export function toUserMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error.message && !error.code && !error.details) return error.message
  if (error.code && CODE_MESSAGES[error.code]) return CODE_MESSAGES[error.code]
  const msg = error.message || ''
  if (/JWT expired|Invalid Refresh Token|refresh_token/i.test(msg)) {
    return 'Session expired. Please sign in again.'
  }
  if (/permission|not allowed|42501/i.test(msg)) {
    return 'You do not have permission to perform this action.'
  }
  return msg || fallback
}

export function isAccountDisabled(profile) {
  return profile?.status === 'DISABLED'
}
