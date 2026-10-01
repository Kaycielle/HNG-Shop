import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Supabase settings can be named either way:
 *   VITE_SUPABASE_URL      or SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY
 * (the second set is what Vercel's Supabase integration creates).
 *
 * Only these two PUBLIC values are copied into the website. Other variables —
 * including secret ones like SUPABASE_SERVICE_ROLE_KEY — are never exposed.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '') // '.' = the project folder; '' = read every name (we pick only two below)
  const supabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim()
  const supabaseKey = (
    env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || ''
  ).trim()

  assertPublicKey(supabaseKey)

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      // Short commit code on Vercel (e.g. c14412d), shown in the footer to check which version is live.
      'import.meta.env.VITE_BUILD_ID': JSON.stringify((env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7)),
    },
  }
})

/** Stops the build if a SECRET Supabase key was put where the public one belongs. */
function assertPublicKey(key: string) {
  if (!key) return
  let secret = key.startsWith('sb_secret_')
  if (!secret && key.split('.').length === 3) {
    try {
      const part = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      const payload = JSON.parse(atob(part))
      secret = payload.role === 'service_role'
    } catch {
      // not a JWT — fine
    }
  }
  if (secret) {
    throw new Error(
      'The Supabase key in your settings is a SECRET (service_role) key. It must never be used in the website. ' +
        'Use the "anon public" or "publishable" key from Supabase → Project Settings → API instead.',
    )
  }
}
