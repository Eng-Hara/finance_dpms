export const validatePhone = (phone) => {
  if (!phone) return 'Phone number is required'
  const cleaned = phone.replace(/\s+/g, '')
  if (!/^[0-9+\-()]{7,20}$/.test(cleaned)) {
    return 'Invalid phone number format'
  }
  return null
}

export const validateEmployee = (data) => {
  const errors = {}
  if (!data.full_name?.trim()) errors.full_name = 'Full name is required'
  if (!data.employee_code?.trim()) errors.employee_code = 'Employee ID is required'
  const phoneErr = validatePhone(data.phone)
  if (phoneErr) errors.phone = phoneErr
  if (data.monthly_amount != null) {
    const amt = Number(data.monthly_amount)
    if (isNaN(amt) || amt < 0) errors.monthly_amount = 'Invalid amount'
  }
  return errors
}

export const validatePayment = (data) => {
  const errors = {}
  if (!data.employee_id) errors.employee_id = 'Employee is required'
  if (!data.month) errors.month = 'Month is required'
  if (!data.year) errors.year = 'Year is required'
  const amt = Number(data.amount)
  if (isNaN(amt) || amt < 0) errors.amount = 'Amount must be positive'
  if (!['PAID', 'UNPAID', 'PARTIAL'].includes(data.status)) {
    errors.status = 'Invalid status'
  }
  return errors
}