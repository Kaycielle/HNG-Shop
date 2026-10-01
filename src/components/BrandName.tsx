import { config } from '../config'

/**
 * The store name as a wordmark. A trailing country code ("Confam NG") is
 * shown as a small red tag; screen readers still hear the plain name.
 */
export function BrandName() {
  const [word, ...rest] = config.storeName.split(' ')
  const tag = rest.join(' ')
  return (
    <span className="logo__text" aria-label={config.storeName}>
      <span aria-hidden="true">{word}</span>
      {tag && <span className="logo__tag" aria-hidden="true">{tag}</span>}
    </span>
  )
}
