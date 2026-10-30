import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, apiGet, apiPost } from '../api/client'
import type { AuthResponse } from '../api/types'
import type { AuthUser } from '../types/domain'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface RegisterInput {
  name: string
  company?: string
  email: string
  password: string
}

interface AuthValue {
  user: AuthUser | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser>
  logout: () => Promise<void>
  clearSession: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let cancelled = false
    apiGet<AuthResponse>('/auth/me')
      .then((response) => {
        if (cancelled) return
        setUser(response.user)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const clearSession = useCallback(() => {
    setUser(null)
    setStatus('anonymous')
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiPost<AuthResponse>('/auth/login', { email, password })
    setUser(response.user)
    setStatus('authenticated')
    return response.user
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const response = await apiPost<AuthResponse>('/auth/register', input)
    setUser(response.user)
    setStatus('authenticated')
    return response.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout', {})
    } catch (error) {
      if (!(error instanceof ApiError)) throw error
    } finally {
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ user, status, login, register, logout, clearSession }),
    [user, status, login, register, logout, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
