/**
 * Order confirmation page.
 *
 * Phase 1: reads the order saved in this browser by OrderRepository. Because
 * no payment gateway is connected, the order is shown honestly as
 * "Awaiting payment".
 * Phase 2: the customer lands here after the payment gateway redirects back.
 * The page will load the order from the database, where the server has
 * already verified the payment and set paymentStatus to 'paid'.
 */
import { Link, useLocation, useParams } from 'react-router-dom'
import { EmptyState, Loading } from '../components/EmptyState'
import { CheckIcon, InfoIcon } from '../components/Icons'
import { ProductImage } from '../components/ProductImage'
import { SummaryTotals } from '../components/SummaryTotals'
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../models/order'
import { orderRepository } from '../services/order/orderRepository'
import { formatDate, formatPrice } from '../utils/format'
import { useAsync } from '../utils/useAsync'
import { useDocumentTitle } from '../utils/useDocumentTitle'

export function OrderConfirmationPage() {
  const { orderId = '' } = useParams()
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  const { data: order, loading } = useAsync(() => orderRepository.getById(orderId), [orderId])
  useDocumentTitle(order ? `Order ${order.id}` : 'Order')

  if (loading) return <div className="container page"><Loading label="Loading your order…" /></div>

  if (!order) {
    return (
      <div className="container page">
        <EmptyState
          title="We couldn’t find that order."
          message="Please check the order number, or contact us if you need help."
          action={<Link to="/shop" className="btn btn--primary">Continue shopping</Link>}
        />
      </div>
    )
  }

  const paid = order.paymentStatus === 'paid'
  const d = order.delivery

  return (
    <div className="container page page--narrow">
      <header className="confirm-head">
        <div className={`confirm-head__icon${paid ? '' : ' confirm-head__icon--pending'}`} aria-hidden="true">
          {paid ? <CheckIcon width={32} height={32} /> : <InfoIcon width={32} height={32} />}
        </div>
        <h1 className="page-title">{paid ? `Thank you, ${order.customer.firstName}!` : 'Order received — awaiting payment'}</h1>
        <p className="page-subtitle">
          {paid
            ? <>Your order is confirmed. A confirmation email has been sent to <strong>{order.customer.email}</strong>.</>
            : <>Your order has been saved, but it has <strong>not been paid</strong>. No confirmation email has been sent.</>}
        </p>
      </header>

      {!paid && (
        <div className="notice notice--info" role="note">
          <InfoIcon width={18} height={18} />
          <span>{notice ?? 'Online payment is not connected yet, so this order is waiting for payment. You have not been charged.'}</span>
        </div>
      )}

      <section className="confirm-card" aria-labelledby="order-details-heading">
        <h2 id="order-details-heading" className="visually-hidden">Order details</h2>
        <dl className="confirm-meta">
          <div><dt>Order number</dt><dd className="mono">{order.id}</dd></div>
          <div><dt>Date</dt><dd>{formatDate(order.createdAt)}</dd></div>
          <div><dt>Order status</dt><dd><span className={`status status--${order.orderStatus}`}>{ORDER_STATUS_LABELS[order.orderStatus]}</span></dd></div>
          <div><dt>Payment status</dt><dd><span className={`status status--pay-${order.paymentStatus}`}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</span></dd></div>
        </dl>
      </section>

      <div className="confirm-grid">
        <section className="confirm-card" aria-labelledby="items-heading">
          <h2 id="items-heading" className="confirm-card__title">Items</h2>
          <ul className="summary-items summary-items--open" role="list">
            {order.items.map((i) => (
              <li key={i.productId} className="summary-item">
                <div className="summary-item__media">
                  <ProductImage src={i.image} alt="" />
                  <span className="summary-item__qty" aria-hidden="true">{i.quantity}</span>
                </div>
                <div className="summary-item__info">
                  <p className="summary-item__name">{i.productName}</p>
                  <p className="summary-item__meta">{i.quantity} × {formatPrice(i.unitPrice)}</p>
                </div>
                <p className="summary-item__total">{formatPrice(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <SummaryTotals subtotal={order.subtotal} shipping={order.shipping} total={order.total} />
        </section>

        <section className="confirm-card" aria-labelledby="delivery-heading">
          <h2 id="delivery-heading" className="confirm-card__title">Delivery details</h2>
          <address className="confirm-address">
            <strong>{order.customer.firstName} {order.customer.lastName}</strong><br />
            {d.address}<br />
            {d.city}, {d.state}{d.postalCode && ` ${d.postalCode}`}<br />
            {d.country}
          </address>
          <h3 className="confirm-card__subtitle">Contact</h3>
          <p className="confirm-contact">{order.customer.email}<br />{order.customer.phone}</p>
        </section>
      </div>

      <div className="confirm-actions">
        <Link to="/shop" className="btn btn--primary btn--lg">Continue shopping</Link>
        {!paid && <Link to="/cart" className="btn btn--secondary btn--lg">Back to cart</Link>}
      </div>
    </div>
  )
}
