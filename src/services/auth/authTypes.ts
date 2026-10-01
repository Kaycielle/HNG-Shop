/** Shared account types, used by every AuthService provider. */
import type { User } from '../../models/user'

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface AuthService {
  /** 'demo' = browser-only accounts (Phase 1); 'live' = real account server. */
  readonly mode: 'demo' | 'live'
  /** True once "Continue with Google" is connected. */
  readonly supportsGoogle: boolean
  getCurrentUser(): Promise<User | null>
  register(input: RegisterInput): Promise<User>
  signIn(email: string, password: string): Promise<User>
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>
  /** Listen for sign-in / sign-out. Returns a function that stops listening. */
  onChange(callback: (user: User | null) => void): () => void
}

/** A problem the customer can fix (wrong password, email already used…). */
export class AuthError extends Error {}
