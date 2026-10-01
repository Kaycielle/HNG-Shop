// Lets Node load the Deno Edge Function for testing: maps "npm:pkg@version" to the installed package.
import { register } from 'node:module'
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
      if (s.startsWith('npm:')) return next(s.slice(4).replace(/@[^/@]+$/, ''), { ...c, parentURL: ${JSON.stringify(new URL('../../package.json', import.meta.url).href)} })
      return next(s, c)
    }`),
)
