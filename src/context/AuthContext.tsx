/**
 * Makes "who is shopping" available everywhere in the app.
 *
 * `owner` is what carts and orders are attached to:
 *   - Phase 1: always a guest (random ID kept in this browser)
 *   - Phase 2: the signed-in Google user, once AuthService is connected
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CartOwner, User } from '../models/user'
import { authService, getGuestId } from '../services/auth/authService'

interface AuthContextValue {
  user: User | null
  owner: CartOwner
  /** False until we know whether someone is signed in. */
  ready: boolean
  canSignIn: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [guestId] = useState(getGuestId)

  useEffect(() => {
    authService.getCurrentUser().then((u) => {
      setUser(u)
      setReady(true)
    })
    return authService.onChange(setUser)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const owner: CartOwner = user ? { kind: 'user', id: user.id } : { kind: 'guest', id: guestId }
    return {
      user,
      owner,
      ready,
      canSignIn: authService.isAvailable,
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
