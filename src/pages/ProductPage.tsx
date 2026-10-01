import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState, Loading } from '../components/EmptyState'
import { CheckIcon, ReturnIcon, ShieldIcon, TruckIcon } from '../components/Icons'
import { Price } from '../components/Price'
import { ProductGrid } from '../components/ProductGrid'
import { ProductImage } from '../components/ProductImage'
import { QuantitySelector } from '../components/QuantitySelector'
import { Rating } from '../components/Rating'
import { StockBadge } from '../components/StockBadge'
import { config } from '../config'
import { useCart } from '../context/CartContext'
import { getMaxQuantity, getUnitPrice, isPurchasable } from '../models/product'
import { getCategories, getProductBySlug, getRelatedProducts } from '../services/product/productService'
import { formatPrice, pluralize } from '../utils/format'
import { useAsync } from '../utils/useAsync'
import { useDocumentTitle } from '../utils/useDocumentTitle'

export function ProductPage() {
  const { slug = '' } = useParams()
  const productState = useAsync(() => getProductBySlug(slug), [slug])
  const categories = useAsync(getCategories, [])
  const product = productState.data
  const related = useAsync(async () => (product ? getRelatedProducts(product) : []), [product?.id])
  const { addItem, getQuantity } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [addedMessage, setAddedMessage] = useState('')

  useDocumentTitle(product?.name ?? (productState.loading ? undefined : 'Product not found'))
  useEffect(() => {
    setQuantity(1)
    setAddedMessage('')
  }, [slug])

  if (productState.loading) return <div className="container page"><Loading label="Loading product…" /></div>

  if (!product) {
    return (
      <div className="container page">
        <EmptyState
          title="This product is currently unavailable."
          message="It may have been removed or the link may be incorrect."
          action={<Link to="/shop" className="btn btn--primary">Continue shopping</Link>}
        />
      </div>
    )
  }

  const category = categories.data?.find((c) => c.id === product.categoryId)
  const available = isPurchasable(product)
  const inCart = getQuantity(product.id)
  const maxAddable = Math.max(0, getMaxQuantity(product) - inCart)
  const canAdd = available && maxAddable > 0
  const qty = Math.min(quantity, Math.max(maxAddable, 1))

  const onAdd = () => {
    addItem(product, qty)
    setAddedMessage(`${pluralize(qty, 'item')} added to your cart.`)
    setQuantity(1)
  }

  return (
    <div className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/shop">Shop</Link></li>
          {category && <li><Link to={`/shop?category=${category.id}`}>{category.name}</Link></li>}
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className="pdp">
        <div className="pdp__media">
          <ProductImage src={product.image} alt={product.name} eager />
          {product.discountPercent && available ? <span className="product-card__flag">Sale</span> : null}
        </div>

        <div className="pdp__info">
          {category && <Link to={`/shop?category=${category.id}`} className="pdp__category">{category.name}</Link>}
          <h1 className="pdp__title">{product.name}</h1>
          <div className="pdp__meta">
            {product.rating !== undefined && <Rating value={product.rating} count={product.ratingCount} />}
            <StockBadge product={product} />
          </div>
          <Price product={product} size="lg" />
          {product.discountPercent && available ? (
            <p className="pdp__saving">You save {formatPrice(product.price - getUnitPrice(product))}</p>
          ) : null}
          <p className="pdp__description">{product.description}</p>

          {available ? (
            <div className="pdp__buy">
              {canAdd ? (
                <>
                  <div className="pdp__qty">
                    <span className="field-label" aria-hidden="true">Quantity</span>
                    <QuantitySelector value={qty} max={maxAddable} onChange={setQuantity} label={`Quantity of ${product.name}`} />
                  </div>
                  <button type="button" className="btn btn--primary btn--lg pdp__add" onClick={onAdd}>
                    Add to cart — {formatPrice(qty * getUnitPrice(product))}
                  </button>
                </>
              ) : (
                <p className="notice notice--info">
                  You already have the maximum of {inCart} in your cart. <Link to="/cart">View cart</Link>
                </p>
              )}
              <div role="status" aria-live="polite">
                {addedMessage && (
                  <p className="notice notice--success">
                    <CheckIcon width={18} height={18} /> {addedMessage} <Link to="/cart">View cart</Link>
                  </p>
                )}
              </div>
              {inCart > 0 && !addedMessage && canAdd && (
                <p className="pdp__in-cart">{pluralize(inCart, 'item')} already in your cart.</p>
              )}
            </div>
          ) : (
            <div className="notice notice--warning" role="note">
              <strong>This product is currently unavailable.</strong> It’s out of stock right now — please check back soon.
            </div>
          )}

          <ul className="pdp__perks">
            <li><TruckIcon /> Free delivery on orders over {formatPrice(config.freeShippingThreshold)}</li>
            <li><ReturnIcon /> 14-day returns</li>
            <li><ShieldIcon /> Secure checkout</li>
          </ul>

          {product.specs && product.specs.length > 0 && (
            <section className="pdp__specs" aria-labelledby="specs-heading">
              <h2 id="specs-heading" className="pdp__specs-title">Product details</h2>
              <dl>
                {category && (
                  <div><dt>Category</dt><dd>{category.name}</dd></div>
                )}
                {product.specs.map((s) => (
                  <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>
                ))}
                <div><dt>Product code</dt><dd>{product.id.toUpperCase()}</dd></div>
              </dl>
            </section>
          )}
        </div>
      </div>

      {related.data && related.data.length > 0 && (
        <section className="section" aria-labelledby="related-heading">
          <div className="section__head">
            <h2 id="related-heading" className="section__title">You may also like</h2>
          </div>
          <ProductGrid products={related.data} categories={categories.data ?? []} />
        </section>
      )}
    </div>
  )
}
