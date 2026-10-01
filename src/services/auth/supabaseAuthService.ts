/**
 * Real customer accounts with Supabase Auth.
 *
 * - Email + password sign-up and sign-in. Supabase stores passwords securely
 *   on its servers and (by default) emails a confirmation link to new customers.
 * - "Continue with Google" — works once the Google provider is switched on in
 *   Supabase (Authentication → Providers → Google) with a Client ID/secret from
 *   Google Cloud Console. See README "Connecting Supabase".
 * - Sessions are remembered by Supabase, so customers stay signed in.
 */
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '../../models/user'
import { supabase } from '../supabase/client'
import { AuthError, type AuthService } from './authTypes'

function toUser(u: SupabaseUser): User {
  const meta = u.user_metadata ?? {}
  return {
    id: u.id,
    email: u.email ?? '',
    name: String(meta.full_name || meta.name || (u.email ?? '').split('@')[0] || 'Customer'),
    avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined,
    createdAt: u.created_at,
  }
}

/** Supabase's English error messages → messages for our customers. */
function friendly(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'The email or password is incorrect.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first — we sent you a link when you signed up.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Try signing in instead.'
  if (m.includes('provider is not enabled')) return 'Google sign-in isn’t switched on yet. Please use your email for now.'
  if (m.includes('password')) return message
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.'
  if (m.includes('fetch') || m.includes('network')) return 'We couldn’t reach our account service. Check your connection and try again.'
  return message
}

export const supabaseAuthService: AuthService = {
  mode: 'live',
  supportsGoogle: true,

  async getCurrentUser() {
    const { data } = await supabase!.auth.getSession()
    return data.session?.user ? toUser(data.session.user) : null
  },

  async register({ name, email, password }) {
    const { data, error } = await supabase!.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/account`,
      },
    })
    if (error) throw new AuthError(friendly(error.message))
    // Supabase hides whether an email is taken: an existing address comes back
    // with no identities. Treat that as "already registered".
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      throw new AuthError('An account with this email already exists. Try signing in instead.')
    }
    return {
      user: data.session?.user ? toUser(data.session.user) : null,
      needsEmailConfirmation: !data.session,
    }
  },

  async signIn(email, password) {
    const { data, error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new AuthError(friendly(error.message))
    return toUser(data.user)
  },

  async signInWithGoogle() {
    const { error } = await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/account` },
    })
    if (error) throw new AuthError(friendly(error.message))
    // The browser now goes to Google and comes back to /account signed in.
  },

  async signOut() {
    const { error } = await supabase!.auth.signOut()
    if (error) throw new AuthError(friendly(error.message))
  },

  onChange(callback) {
    const { data } = supabase!.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? toUser(session.user) : null)
    })
    return () => data.subscription.unsubscribe()
  },
}
