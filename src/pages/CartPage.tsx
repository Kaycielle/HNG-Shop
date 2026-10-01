import { Link } from 'react-router-dom'
import { EmptyState, Loading } from '../components/EmptyState'
import { CartIcon, LockIcon, TrashIcon } from '../components/Icons'
import { ProductImage } from '../components/ProductImage'
import { QuantitySelector } from '../components/QuantitySelector'
import { StockBadge } from '../components/StockBadge'
import { SummaryTotals } from '../components/SummaryTotals'
import { useCart } from '../context/CartContext'
import { getMaxQuantity, isPurchasable } from '../models/product'
import { formatPrice, pluralize } from '../utils/format'
import { useDocumentTitle } from '../utils/useDocumentTitle'

export function CartPage() {
  useDocumentTitle('Your cart')
  const { lines, totals, loading, setQuantity, removeItem, clearCart, cart } = useCart()

  if (loading && cart.items.length > 0 && lines.length === 0) {
    return <div className="container page"><Loading label="Loading your cart…" /></div>
  }

  if (lines.length === 0) {
    return (
      <div className="container page">
        <h1 className="page-title">Your cart</h1>
        <EmptyState
          icon={<CartIcon width={32} height={32} />}
          title="Your cart is empty."
          message="Looks like you haven’t added anything yet. Explore our products and find something you love."
          action={<Link to="/shop" className="btn btn--primary btn--lg">Start shopping</Link>}
        />
      </div>
    )
  }

  const unavailable = lines.filter((l) => !isPurchasable(l.product))

  return (
    <div className="container page">
      <header className="page-header page-header--row">
        <h1 className="page-title">Your cart <span className="page-title__count">({pluralize(totals.itemCount, 'item')})</span></h1>
        <button type="button" className="btn-link btn-link--danger" onClick={() => { if (window.confirm('Remove all items from your cart?')) clearCart() }}>
          Empty cart
        </button>
      </header>

      <div className="cart-layout">
        <section aria-label="Items in your cart">
          {unavailable.length > 0 && (
            <div className="notice notice--warning" role="alert">
              Some items in your cart are no longer available. Please remove them to continue to checkout.
            </div>
          )}
          <ul className="cart-list" role="list">
            {lines.map((line) => {
              const { product } = line
              const available = isPurchasable(product)
              const href = `/product/${product.slug}`
              return (
                <li key={product.id} className={`cart-item${available ? '' : ' cart-item--unavailable'}`}>
                  <Link to={href} className="cart-item__media" tabIndex={-1} aria-hidden="true">
                    <ProductImage src={product.image} alt="" />
                  </Link>
                  <div className="cart-item__info">
                    <h2 className="cart-item__name"><Link to={href}>{product.name}</Link></h2>
                    <p className="cart-item__unit">
                      {formatPrice(line.unitPrice)} each
                      {line.unitPrice < product.price && <s className="price__original"> {formatPrice(product.price)}</s>}
                    </p>
                    <StockBadge product={product} />
                  </div>
                  <div className="cart-item__qty">
                    {available ? (
                      <QuantitySelector
                        size="sm"
                        value={line.quantity}
                        max={getMaxQuantity(product)}
                        onChange={(q) => setQuantity(product, q)}
                        label={`Quantity of ${product.name}`}
                      />
                    ) : (
                      <span className="cart-item__unavailable">Unavailable</span>
                    )}
                  </div>
                  <p className="cart-item__total" aria-label={`Line total ${formatPrice(line.lineTotal)}`}>{formatPrice(line.lineTotal)}</p>
                  <button type="button" className="icon-btn cart-item__remove" onClick={() => removeItem(product.id)} aria-label={`Remove ${product.name} from cart`}>
                    <TrashIcon width={18} height={18} />
                  </button>
                </li>
              )
            })}
          </ul>
          <Link to="/shop" className="link-back">← Continue shopping</Link>
        </section>

        <aside className="summary-card" aria-labelledby="cart-summary-heading">
          <h2 id="cart-summary-heading" className="summary-card__title">Order summary</h2>
          <SummaryTotals {...totals} itemCount={totals.itemCount} showFreeShippingHint />
          {unavailable.length > 0 ? (
            <button type="button" className="btn btn--primary btn--block btn--lg" disabled>
              Remove unavailable items to continue
            </button>
          ) : (
            <Link to="/checkout" className="btn btn--primary btn--block btn--lg">
              <LockIcon width={18} height={18} /> Proceed to checkout
            </Link>
          )}
          <p className="summary-card__note">Delivery cost is confirmed at checkout.</p>
        </aside>
      </div>
    </div>
  )
}
