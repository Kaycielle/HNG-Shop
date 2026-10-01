/**
 * AuthService — customer accounts: create an account, sign in, sign out.
 *
 * The rest of the app only talks to the `AuthService` interface (through
 * AuthContext), so the provider behind it can change without touching pages.
 *
 * Phase 1 (now): `demoAuthService` — accounts are saved in THIS BROWSER ONLY.
 *   Good for trying the flow; not a real, secure account system.
 * Phase 2: replace with Supabase Auth (email + password and Google sign-in via
 *   Google Cloud Console). Accounts then live on a secure server and work on
 *   any device. Only the last line of this file changes.
 */
import { devStorage, randomId } from '../devStorage'
import type { AuthService } from './authTypes'
import { demoAuthService } from './demoAuthService'

export { AuthError, type AuthService, type RegisterInput } from './authTypes'

// Phase 2: replace with the Supabase implementation.
export const authService: AuthService = demoAuthService

/** A stable ID for this browser's guest shopper (used before signing in). */
export function getGuestId(): string {
  const existing = devStorage.get<string>('guestId')
  if (existing) return existing
  const id = randomId('g_')
  devStorage.set('guestId', id)
  return id
}
