/**
 * AuthService — customer accounts: create an account, sign in, sign out.
 *
 * The rest of the app only talks to the `AuthService` interface (through
 * AuthContext), so the provider behind it can change without touching pages.
 *
 * - Supabase connected (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set):
 *   `supabaseAuthService` — real, secure accounts that work on any device,
 *   with email + password and Google sign-in.
 * - Not connected: `demoAuthService` — accounts saved in THIS BROWSER ONLY,
 *   so the flow can still be tried. Every sign-in page says so.
 */
import { devStorage, randomId } from '../devStorage'
import type { AuthService } from './authTypes'
import { supabase } from '../supabase/client'
import { demoAuthService } from './demoAuthService'
import { supabaseAuthService } from './supabaseAuthService'

export { AuthError, type AuthService, type RegisterInput, type RegisterResult } from './authTypes'

export const authService: AuthService = supabase ? supabaseAuthService : demoAuthService

/** A stable ID for this browser's guest shopper (used before signing in). */
export function getGuestId(): string {
  const existing = devStorage.get<string>('guestId')
  if (existing) return existing
  const id = randomId('g_')
  devStorage.set('guestId', id)
  return id
}
