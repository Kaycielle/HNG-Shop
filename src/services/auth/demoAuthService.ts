/**
 * DEMO account provider — Phase 1 only.
 *
 * Accounts are stored in this browser's localStorage so the full sign-up /
 * sign-in / sign-out journey can be built and tested before the real account
 * server (Supabase) is connected.
 *
 * Limits, by design:
 * - Accounts exist only in this browser on this device.
 * - Passwords are never stored as typed: each is salted and hashed with
 *   PBKDF2-SHA-256 (the browser's built-in Web Crypto). Even so, the browser is
 *   not a safe place for credentials, which is why this is demo-only and the
 *   sign-in pages say so.
 */
import type { User } from '../../models/user'
import { devStorage, randomId } from '../devStorage'
import { AuthError, type AuthService } from './authTypes'

interface StoredAccount {
  id: string
  name: string
  email: string
  salt: string
  passwordHash: string
  createdAt: string
}

const ACCOUNTS_KEY = 'demo.accounts'
const SESSION_KEY = 'demo.session'
const listeners = new Set<(user: User | null) => void>()

const toUser = (a: StoredAccount): User => ({ id: a.id, name: a.name, email: a.email, createdAt: a.createdAt })
const normaliseEmail = (email: string) => email.trim().toLowerCase()
const loadAccounts = () => devStorage.get<StoredAccount[]>(ACCOUNTS_KEY) ?? []

function notify(user: User | null) {
  for (const listener of listeners) listener(user)
}

async function hashPassword(password: string, salt: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new AuthError('Accounts need a secure (https) connection. Please open the site over https.')
  }
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100_000 },
    key,
    256,
  )
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const demoAuthService: AuthService = {
  mode: 'demo',
  supportsGoogle: false,

  async getCurrentUser() {
    const id = devStorage.get<string>(SESSION_KEY)
    const account = id ? loadAccounts().find((a) => a.id === id) : undefined
    return account ? toUser(account) : null
  },

  async register({ name, email, password }) {
    const accounts = loadAccounts()
    const normalised = normaliseEmail(email)
    if (accounts.some((a) => a.email === normalised)) {
      throw new AuthError('An account with this email already exists. Try signing in instead.')
    }
    const salt = randomId()
    const account: StoredAccount = {
      id: randomId('u_'),
      name: name.trim(),
      email: normalised,
      salt,
      passwordHash: await hashPassword(password, salt),
      createdAt: new Date().toISOString(),
    }
    devStorage.set(ACCOUNTS_KEY, [...accounts, account])
    devStorage.set(SESSION_KEY, account.id)
    const user = toUser(account)
    notify(user)
    return { user, needsEmailConfirmation: false }
  },

  async signIn(email, password) {
    const account = loadAccounts().find((a) => a.email === normaliseEmail(email))
    // Same message whether the email or the password is wrong, so the form
    // doesn't reveal which emails have accounts.
    if (!account || (await hashPassword(password, account.salt)) !== account.passwordHash) {
      throw new AuthError('The email or password is incorrect.')
    }
    devStorage.set(SESSION_KEY, account.id)
    const user = toUser(account)
    notify(user)
    return user
  },

  async signInWithGoogle() {
    throw new AuthError('Google sign-in will be available once our secure account system is connected.')
  },

  async signOut() {
    devStorage.remove(SESSION_KEY)
    notify(null)
  },

  onChange(callback) {
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  },
}
