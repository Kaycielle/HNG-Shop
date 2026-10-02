import { config } from '../config'

/**
 * Splits the store name into a wordmark and a short country tag, e.g.
 * "Fit Heiress NG" → "Fit Heiress" + "NG". The tag is the last word when it's
 * 2–3 capital letters; otherwise the whole name is the wordmark.
 */
function splitName(name: string): { word: string; tag: string } {
  const parts = name.trim().split(/\s+/)
  const last = parts[parts.length - 1]
  return parts.length > 1 && /^[A-Z]{2,3}$/.test(last)
    ? { word: parts.slice(0, -1).join(' '), tag: last }
    : { word: name.trim(), tag: '' }
}

/** Initials for the small square logo, e.g. "FH". */
export function logoInitials(): string {
  return splitName(config.storeName)
    .word.split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/** The store name as a wordmark; screen readers hear the plain name. */
export function BrandName() {
  const { word, tag } = splitName(config.storeName)
  return (
    <span className="logo__text" aria-label={config.storeName}>
      <span aria-hidden="true">{word}</span>
      {tag && <span className="logo__tag" aria-hidden="true">{tag}</span>}
    </span>
  )
}
