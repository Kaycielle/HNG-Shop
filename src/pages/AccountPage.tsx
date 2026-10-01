import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { EmptyState, Loading } from '../components/EmptyState'
import { CartIcon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../models/order'
import { orderRepository } from '../services/order/orderRepository'
import { formatDate, formatPrice, pluralize } from '../utils/format'
import { useAsync } from '../utils/useAsync'
import { useDocumentTitle } from '../utils/useDocumentTitle'

/** The signed-in customer's details, saved cart and order history. */
export function AccountPage() {
  useDocumentTitle('My account')
  const { user, owner, ready, signOut, mode } = useAuth()
  const { totals, cart } = useCart()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const orders = useAsync(async () => (user ? orderRepository.listForOwner(owner) : []), [user?.id])

  if (!ready) return <div className="container page"><Loading /></div>
  // While signing out we're about to leave for the homepage, so don't bounce to sign-in.
  if (!user) return signingOut ? <Navigate to="/" replace /> : <Navigate to="/account/sign-in" state={{ from: '/account' }} replace />

  const itemsInCart = cart.items.reduce((sum, i) => sum + i.quantity, 0)
  const onSignOut = async () => {
    setSigningOut(true)
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="container page">
      <header className="page-header page-header--row">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="page-title">Hello, {user.name.split(' ')[0]}</h1>
        </div>
        <button type="button" className="btn btn--secondary" onClick={onSignOut} disabled={signingOut}>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </header>

      <div className="account-grid">
        <section className="confirm-card" aria-labelledby="details-heading">
          <h2 id="details-heading" className="confirm-card__title">Your details</h2>
          <dl className="account-details">
            <div><dt>Name</dt><dd>{user.name}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            {user.createdAt && <div><dt>Member since</dt><dd>{formatDate(user.createdAt)}</dd></div>}
          </dl>
          {mode === 'demo' && <p className="field-hint">Demo account: saved in this browser only.</p>}
        </section>

        <section className="confirm-card" aria-labelledby="cart-heading">
          <h2 id="cart-heading" className="confirm-card__title">Saved cart</h2>
          {itemsInCart > 0 ? (
            <>
              <p className="account-cart">
                <CartIcon width={20} height={20} /> {pluralize(itemsInCart, 'item')}
                {totals.total > 0 && <> · {formatPrice(totals.total)}</>}
              </p>
              <p className="field-hint">Your cart is saved to your account, so it’s here when you come back.</p>
              <Link to="/cart" className="btn btn--primary">View cart</Link>
            </>
          ) : (
            <>
              <p className="field-hint">Your cart is empty. Items you add are saved to your account.</p>
              <Link to="/shop" className="btn btn--secondary">Start shopping</Link>
            </>
          )}
        </section>
      </div>

      <section className="section" aria-labelledby="orders-heading">
        <div className="section__head">
          <h2 id="orders-heading" className="section__title">Your orders</h2>
        </div>
        {orders.loading ? (
          <Loading label="Loading your orders…" />
        ) : orders.data && orders.data.length > 0 ? (
          <ul className="order-list" role="list">
            {orders.data.map((o) => (
              <li key={o.id}>
                <Link to={`/order/${encodeURIComponent(o.id)}`} className="order-row">
                  <span className="order-row__id mono">{o.id}</span>
                  <span className="order-row__date">{formatDate(o.createdAt)}</span>
                  <span className="order-row__items">{pluralize(o.items.reduce((s, i) => s + i.quantity, 0), 'item')}</span>
                  <span className="order-row__status">
                    <span className={`status status--${o.orderStatus}`}>{ORDER_STATUS_LABELS[o.orderStatus]}</span>
                    <span className={`status status--pay-${o.paymentStatus}`}>{PAYMENT_STATUS_LABELS[o.paymentStatus]}</span>
                  </span>
                  <span className="order-row__total">{formatPrice(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No orders yet." message="When you place an order while signed in, it will appear here." action={<Link to="/shop" className="btn btn--primary">Browse products</Link>} />
        )}
      </section>
    </div>
  )
}
