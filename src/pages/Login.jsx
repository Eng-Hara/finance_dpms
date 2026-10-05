import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Mail, Lock, Wallet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ROLES, COMPANY_NAME } from '@/utils/constants'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function Login() {
  const { signIn, user, profile, loading, authError, clearAuthError } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (authError) toast.error(authError)
  }, [authError, toast])

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
    clearAuthError?.()
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#eff6ff_0%,_#f8fafc_35%,_#e2e8f0_100%)] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <Wallet className="h-4 w-4" />
              <span className="text-sm font-medium">Kinship-based contribution</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight">{COMPANY_NAME}</h1>
            <p className="mt-3 max-w-sm text-sm text-brand-100">
              Contribution Management System for secure tracking, reporting, and operational oversight.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-sm text-brand-100">Trusted workflow</p>
            <div className="grid gap-3 text-sm text-white/90 sm:grid-cols-3">
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-xl font-semibold">24/7</div>
                <div className="text-brand-100">Access</div>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-xl font-semibold">100%</div>
                <div className="text-brand-100">Secure</div>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-xl font-semibold">Live</div>
                <div className="text-brand-100">Reports</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-200 lg:mx-0">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500">Fadlan gali Email ka iyo Passworka laguso diri</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-4">
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
              Laxiriir Xoghayaha hadaa ubaahan tahi account cusub.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}