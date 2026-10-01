/**
 * Makes "who is shopping" available everywhere in the app.
 *
 * `owner` is what carts and orders are attached to:
 *   - a guest (random ID kept in this browser) when nobody is signed in
 *   - the signed-in customer's account once they sign in
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CartOwner, User } from '../models/user'
import { authService, getGuestId, type RegisterInput } from '../services/auth/authService'

interface AuthContextValue {
  user: User | null
  owner: CartOwner
  /** False until we know whether someone is signed in. */
  ready: boolean
  mode: 'demo' | 'live'
  supportsGoogle: boolean
  register: (input: RegisterInput) => Promise<User>
  signIn: (email: string, password: string) => Promise<User>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [guestId] = useState(getGuestId)

  useEffect(() => {
    let active = true
    authService.getCurrentUser().then((u) => {
      if (!active) return
      setUser(u)
      setReady(true)
    })
    const stop = authService.onChange(setUser)
    return () => {
      active = false
      stop()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const owner: CartOwner = user ? { kind: 'user', id: user.id } : { kind: 'guest', id: guestId }
    return {
      user,
      owner,
      ready,
      mode: authService.mode,
      supportsGoogle: authService.supportsGoogle,
      register: (input) => authService.register(input),
      signIn: (email, password) => authService.signIn(email, password),
      signInWithGoogle: () => authService.signInWithGoogle(),
      signOut: () => authService.signOut(),
    }
  }, [user, guestId, ready])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
