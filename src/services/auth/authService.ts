/**
 * AuthService — who is shopping?
 *
 * Phase 1: Google sign-in is NOT connected. Everyone is a "guest" with a
 *          random ID stored in this browser, so carts already belong to an
 *          owner rather than one global shopper.
 * Phase 2: implement getCurrentUser / signInWithGoogle / signOut using
 *          Supabase Auth (Google provider configured in Google Cloud Console).
 *          The rest of the app reads the user through AuthContext and will
 *          pick it up automatically.
 */
import type { User } from '../../models/user'
import { devStorage, randomId } from '../devStorage'

export interface AuthService {
  /** True once a real sign-in provider is connected. */
  readonly isAvailable: boolean
  getCurrentUser(): Promise<User | null>
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>
  /** Listen for sign-in / sign-out. Returns a function that stops listening. */
  onChange(callback: (user: User | null) => void): () => void
}

const notConnectedAuthService: AuthService = {
  isAvailable: false,
  async getCurrentUser() {
    return null
  },
  async signInWithGoogle() {
    throw new Error('Google sign-in will be added in Phase 2.')
  },
  async signOut() {
    // Nothing to do — no one can be signed in yet.
  },
  onChange() {
    return () => {}
  },
}

// Phase 2: replace with the Supabase/Google implementation.
export const authService: AuthService = notConnectedAuthService

/** A stable ID for this browser's guest shopper. */
export function getGuestId(): string {
  const existing = devStorage.get<string>('guestId')
  if (existing) return existing
  const id = randomId('g_')
  devStorage.set('guestId', id)
  return id
}
