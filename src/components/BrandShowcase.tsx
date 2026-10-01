import { Link } from 'react-router-dom'
import type { BrandSummary } from '../models/product'
import { formatPrice, pluralize } from '../utils/format'

/**
 * Grid of brand tiles. Each tile opens the brand's page; the item-type links
 * inside jump straight to that brand's phones, power banks, etc.
 */
export function BrandShowcase({ brands }: { brands: BrandSummary[] }) {
  return (
    <ul className="brand-grid" role="list">
      {brands.map((b) => (
        <li key={b.id}>
          <article className="brand-tile">
            <Link to={`/brand/${b.id}`} className="brand-tile__main">
              <span className="brand-tile__media" aria-hidden="true">
                {b.image && <img src={b.image} alt="" loading="lazy" />}
              </span>
              <span className="brand-tile__body">
                <span className="brand-tile__name">{b.name}</span>
                <span className="brand-tile__tagline">{b.tagline}</span>
                <span className="brand-tile__meta">
                  {pluralize(b.productCount, 'product')} · from {formatPrice(b.fromPrice)}
                </span>
              </span>
            </Link>
            <ul className="brand-tile__types" aria-label={`${b.name} item types`}>
              {b.types.map(({ type, count }) => (
                <li key={type.id}>
                  <Link to={`/brand/${b.id}?type=${type.id}`} className="type-chip">
                    {type.name} <span className="type-chip__count">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        </li>
      ))}
    </ul>
  )
}

/** A compact row of brand names, used on the homepage. */
export function BrandStrip({ brands }: { brands: BrandSummary[] }) {
  return (
    <ul className="brand-strip" role="list">
      {brands.map((b) => (
        <li key={b.id}>
          <Link to={`/brand/${b.id}`} className="brand-strip__link">
            <span className="brand-strip__name">{b.name}</span>
            <span className="brand-strip__count">{pluralize(b.productCount, 'item')}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
