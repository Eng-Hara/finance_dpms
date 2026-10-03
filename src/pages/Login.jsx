import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Mail, Lock, Wallet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ROLES, COMPANY_NAME } from '@/utils/constants'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function Login() {
  const { signIn, user, profile, loading } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  if (!loading && user && profile) {
    return (
      <Navigate
        to={profile.role === ROLES.EMPLOYEE ? '/employee/dashboard' : '/admin/dashboard'}
        replace
      />
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!email) errs.email = 'Email is required'
    if (!password) errs.password = 'Password is required'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSubmitting(true)
    try {
      await signIn(email, password)
      toast.success('Signed in successfully')
    } catch (err) {
      toast.error(err.message || 'Invalid credentials')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{COMPANY_NAME}</h1>
          <p className="mt-1 text-sm text-slate-500">Contribution Management System</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Sign In</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter your credentials to access your account
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              error={errors.password}
              autoComplete="current-password"
            />
            <Button type="submit" loading={submitting} className="w-full" size="lg">
              Sign In
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Contact your administrator if you need an account.
        </p>
      </div>
    </div>
  )
}