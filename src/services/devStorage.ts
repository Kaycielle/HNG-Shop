/**
 * TEMPORARY browser storage used during Phase 1 development.
 *
 * This is NOT the permanent home of any data. localStorage only lives in one
 * browser on one device, so it cannot give a user their cart back after they
 * log in somewhere else. In Phase 2 the cart and order repositories will be
 * switched to the database and this file will only be used (if at all) for
 * small conveniences like a guest's ID.
 *
 * Every read/write is wrapped in try/catch because storage can be unavailable
 * (private browsing, blocked cookies, full storage).
 */
const PREFIX = 'kay-shop.dev.'

export const devStorage = {
  get<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(PREFIX + key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },
  set(key: string, value: unknown): void {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // Storage unavailable — the app keeps working, data just won't survive a refresh.
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(PREFIX + key)
    } catch {
      // ignore
    }
  },
}

/** Small random ID helper (not for security purposes). */
export function randomId(prefix = ''): string {
  const part = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : Math.random().toString(36).slice(2, 14)
  return prefix + part
}
