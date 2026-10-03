import { MONTHS } from './constants'

export const formatCurrency = (amount) => {
  const n = Number(amount) || 0
  return `$${n.toFixed(2)}`
}

export const formatMonthYear = (month, year) => {
  const m = MONTHS.find((x) => x.value === Number(month))
  return `${m?.label || ''} ${year}`
}

export const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB')
}

export const formatDateTime = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-GB')
}