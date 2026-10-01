import { getUnitPrice, type Product } from '../models/product'
import { formatPrice } from '../utils/format'

export function Price({ product, size = 'md' }: { product: Product; size?: 'md' | 'lg' }) {
  const unit = getUnitPrice(product)
  const discounted = unit < product.price
  return (
    <div className={`price price--${size}`}>
      <span className="price__current">
        {discounted && <span className="visually-hidden">Sale price: </span>}
        {formatPrice(unit)}
      </span>
      {discounted && (
        <>
          <s className="price__original">
            <span className="visually-hidden">Original price: </span>
            {formatPrice(product.price)}
          </s>
          <span className="price__badge">−{product.discountPercent}%</span>
        </>
      )}
    </div>
  )
}
