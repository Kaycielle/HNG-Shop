/**
 * Builds a URL for a file in /public that works wherever the site is hosted
 * (at the domain root or inside a sub-folder).
 */
export function assetUrl(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
