/**
 * The Supabase connection.
 *
 * It switches on only when both public values are present at build time:
 *   VITE_SUPABASE_URL      (or SUPABASE_URL)
 *   VITE_SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY)
 * See vite.config.ts for how those names are read.
 *
 * Both values are PUBLIC by design — Supabase's Row Level Security rules
 * (supabase/migrations) decide what each visitor can see or change. Never use
 * the "service_role" / secret key: that key bypasses every rule.
 *
 * Without valid values, `supabase` is null and the shop falls back to its
 * built-in sample data and demo accounts, so it always works.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

/** Why the site is (or isn't) connected — shown to help with setup. Contains no secrets. */
export type SupabaseSetup =
  | { connected: true }
  | { connected: false; problems: string[] }

function connect(): { client: SupabaseClient | null; setup: SupabaseSetup } {
  const problems: string[] = []
  if (!url) problems.push('the Supabase URL is missing')
  else if (!/^https:\/\/[^\s/]+$/.test(url.replace(/\/+$/, ''))) problems.push('the Supabase URL should look like https://xxxx.supabase.co')
  if (!anonKey) problems.push('the Supabase public (anon / publishable) key is missing')
  if (problems.length > 0) return { client: null, setup: { connected: false, problems } }
  try {
    return { client: createClient(url.replace(/\/+$/, ''), anonKey), setup: { connected: true } }
  } catch (err) {
    // A bad value must never take the whole shop down.
    console.error('Could not start Supabase:', err)
    return { client: null, setup: { connected: false, problems: ['the Supabase settings were rejected — check both values'] } }
  }
}

const { client, setup } = connect()

export const supabase: SupabaseClient | null = client
export const supabaseSetup: SupabaseSetup = setup
export const isSupabaseConnected = supabase !== null

/** A short code for this build (the GitHub commit on Vercel), to check which version is live. */
export const buildId: string = import.meta.env.VITE_BUILD_ID || 'local'

console.info(
  `[Confam NG] build ${buildId} · Supabase: ${setup.connected ? 'connected' : `not connected (${setup.problems.join('; ')})`}`,
)

/** Supabase's error codes for a missing table/function — usually "the SQL setup hasn't been run yet". */
export function describeSupabaseError(error: { message?: string; code?: string } | null): string {
  if (!error) return 'Unknown error'
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST202') {
    return 'The database tables are missing. Run supabase/migrations/0001_confam_schema.sql and supabase/seed.sql in the Supabase SQL Editor.'
  }
  return error.message ?? 'Unknown error'
}
