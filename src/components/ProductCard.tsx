import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { getMaxQuantity, isPurchasable, type Product } from '../models/product'
import { CheckIcon } from './Icons'
import { Price } from './Price'
import { ProductImage } from './ProductImage'
import { Rating } from './Rating'
import { StockBadge } from './StockBadge'

export function ProductCard({ product, brandName }: { product: Product; brandName?: string }) {
  const { addItem, getQuantity } = useCart()
  const [justAdded, setJustAdded] = useState(false)
  const inCart = getQuantity(product.id)
  const available = isPurchasable(product)
  const atLimit = available && inCart >= getMaxQuantity(product)

  useEffect(() => {
    if (!justAdded) return
    const t = setTimeout(() => setJustAdded(false), 1800)
    return () => clearTimeout(t)
  }, [justAdded])

  const href = `/product/${product.slug}`
  let buttonLabel = 'Add to cart'
  if (!available) buttonLabel = 'Out of stock'
  else if (justAdded) buttonLabel = 'Added'
  else if (atLimit) buttonLabel = 'Max in cart'

  return (
    <article className={`product-card${available ? '' : ' product-card--unavailable'}`}>
      <Link to={href} className="product-card__media" tabIndex={-1} aria-hidden="true">
        <ProductImage src={product.image} alt="" />
        {product.discountPercent && available ? <span className="product-card__flag">Sale</span> : null}
      </Link>
      <div className="product-card__body">
        {brandName && <p className="product-card__category">{brandName}</p>}
        <h3 className="product-card__title">
          <Link to={href}>{product.name}</Link>
        </h3>
        <div className="product-card__meta">
          {product.rating !== undefined && <Rating value={product.rating} count={product.ratingCount} />}
          <StockBadge product={product} />
        </div>
        <Price product={product} />
        <button
          type="button"
          className={`btn ${justAdded ? 'btn--added' : 'btn--primary'} btn--block product-card__cta`}
          disabled={!available || atLimit}
          onClick={() => {
            addItem(product, 1)
            setJustAdded(true)
          }}
        >
          {justAdded && <CheckIcon width={16} height={16} />}
          {buttonLabel}
          <span className="visually-hidden">: {product.name}</span>
        </button>
        <span className="visually-hidden" role="status">{justAdded ? `${product.name} added to cart` : ''}</span>
      </div>
    </article>
  )
}
