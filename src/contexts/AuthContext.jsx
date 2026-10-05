import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { isAccountDisabled } from '@/utils/errorMessages'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const clearSession = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('Profile load error:', error)
      return { profile: null, blocked: true }
    }
    if (isAccountDisabled(data)) {
      return { profile: data, blocked: true }
    }
    return { profile: data, blocked: false }
  }, [])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      setAuthError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (session?.user) {
        const { profile: p, blocked } = await loadProfile(session.user.id)
        if (!mounted) return
        if (blocked) {
          await clearSession()
          if (mounted) {
            setAuthError(
              p && isAccountDisabled(p)
                ? 'This account has been disabled. Contact a Super Admin.'
                : 'Unable to load your account profile. Please sign in again.'
            )
          }
        } else {
          setUser(session.user)
          setProfile(p)
        }
      }
      if (mounted) setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        if (session?.user) {
          const { profile: p, blocked } = await loadProfile(session.user.id)
          if (!mounted) return
          if (blocked) {
            await clearSession()
            if (mounted) {
              setAuthError(
                p && isAccountDisabled(p)
                  ? 'This account has been disabled. Contact a Super Admin.'
                  : 'Unable to load your account profile. Please sign in again.'
              )
            }
          } else {
            setUser(session.user)
            setProfile(p)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
        if (mounted) setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile, clearSession])

  const signIn = async (email, password) => {
    setAuthError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const { profile: p, blocked } = await loadProfile(data.user.id)
    if (blocked) {
      await clearSession()
      const message =
        p && isAccountDisabled(p)
          ? 'This account has been disabled. Contact a Super Admin.'
          : 'Unable to load your account profile. Please contact support.'
      setAuthError(message)
      throw new Error(message)
    }
    setUser(data.user)
    setProfile(p)
    return data
  }

  const signOut = async () => {
    setAuthError(null)
    await clearSession()
  }

  const value = {
    user,
    profile,
    role: profile?.role,
    loading,
    authError,
    clearAuthError: () => setAuthError(null),
    signIn,
    signOut,
    isAuthenticated: !!user && !!profile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}