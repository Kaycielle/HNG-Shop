/**
 * The Supabase connection.
 *
 * It switches on only when both values are set in `.env.local`:
 *   VITE_SUPABASE_URL=https://<your-project>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<your anon / publishable key>
 *
 * Both values are PUBLIC by design — Supabase's Row Level Security rules
 * (supabase/migrations) decide what each visitor can see or change. Never put
 * the "service_role" / secret key here: that key bypasses every rule.
 *
 * Without the values, `supabase` is null and the shop falls back to its
 * built-in sample data and demo accounts, so it always works.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseConnected = supabase !== null

/** Supabase's error codes for a missing table/function — usually "the SQL setup hasn't been run yet". */
export function describeSupabaseError(error: { message?: string; code?: string } | null): string {
  if (!error) return 'Unknown error'
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST202') {
    return 'The database tables are missing. Run supabase/migrations/0001_confam_schema.sql and supabase/seed.sql in the Supabase SQL Editor.'
  }
  return error.message ?? 'Unknown error'
}
