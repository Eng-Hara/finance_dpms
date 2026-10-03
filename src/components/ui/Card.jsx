export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return <div className={`border-b border-slate-200 px-5 py-4 ${className}`}>{children}</div>
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>
}