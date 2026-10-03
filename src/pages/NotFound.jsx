import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">404</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-slate-600">
        The page you are looking for does not exist or may have moved.
      </p>
      <Link to="/" className="mt-6">
        <Button>Return home</Button>
      </Link>
    </main>
  )
}
