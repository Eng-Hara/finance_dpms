const VARIANTS = {
  PAID: 'bg-green-50 text-green-700 border-green-200',
  UNPAID: 'bg-red-50 text-red-700 border-red-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
  SUPER_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  ADMIN: 'bg-blue-50 text-blue-700 border-blue-200',
  EMPLOYEE: 'bg-slate-100 text-slate-700 border-slate-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${VARIANTS[variant] || VARIANTS.default} ${className}`}>
      {children}
    </span>
  )
}