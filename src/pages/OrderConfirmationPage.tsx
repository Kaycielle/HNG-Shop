/**
 * Order page — also where Paystack sends the customer back after paying.
 *
 * Paystack returns to /order/<id>?reference=…; this page then asks the server
 * to verify the payment with Paystack. The page never decides an order is paid:
 * it only shows what the server reports. If the order isn't paid yet (e.g. the
 * customer closed the payment page), it offers "Pay now".
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState, Loading } from '../components/EmptyState'
import { CheckIcon, InfoIcon, LockIcon } from '../components/Icons'
import { ProductImage } from '../components/ProductImage'
import { SummaryTotals } from '../components/SummaryTotals'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type Order } from '../models/order'
import { orderRepository } from '../services/order/orderRepository'
import { paymentProvider, startPayment, verifyPayment } from '../services/payment/paymentService'
import { formatDate, formatPrice } from '../utils/format'
import { useDocumentTitle } from '../utils/useDocumentTitle'

type Phase = 'loading' | 'verifying' | 'ready' | 'missing'

export function OrderConfirmationPage() {
  const { orderId = '' } = useParams()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const returnedReference = params.get('reference') || params.get('trxref')
  const { owner, ready } = useAuth()
  const { removeItem, loading: cartLoading } = useCart()

  const [order, setOrder] = useState<Order | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [notice, setNotice] = useState<string | undefined>((location.state as { notice?: string } | null)?.notice)
  const [paying, setPaying] = useState(false)
  const clearedFor = useRef<string | null>(null)
  useDocumentTitle(order ? `Order ${order.id}` : 'Order')

  // Load the order; if we've just come back from Paystack, verify the payment.
  useEffect(() => {
    if (!ready) return
    let active = true
    ;(async () => {
      setPhase('loading')
      const found = await orderRepository.getById(orderId, owner).catch(() => null)
      if (!active) return
      if (!found) return setPhase('missing')
      setOrder(found)
      if (returnedReference && found.paymentStatus === 'pending' && paymentProvider.isConfigured) {
        setPhase('verifying')
        const result = await verifyPayment(found, returnedReference)
        if (!active) return
        if (result.paid) {
          setOrder(result.order)
          setNotice(undefined)
        } else {
          setNotice(result.message)
        }
        // Tidy the address bar so a refresh doesn't re-check the same payment.
        setParams({}, { replace: true })
      }
      setPhase('ready')
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, ready, owner.kind, owner.id])

  // Once paid, take the bought items out of the cart (the server already did
  // this for signed-in customers; this covers guests and the open page).
  useEffect(() => {
    if (cartLoading || order?.paymentStatus !== 'paid' || clearedFor.current === order.id) return
    clearedFor.current = order.id
    for (const item of order.items) removeItem(item.productId)
  }, [order, cartLoading, removeItem])

  const onPayNow = async () => {
    if (!order) return
    setPaying(true)
    setNotice(undefined)
    const result = await startPayment(order)
    if (result.kind === 'redirect') {
      window.location.assign(result.url)
      return
    }
    if (result.kind === 'already_paid') {
      const fresh = await orderRepository.getById(order.id, owner).catch(() => null)
      if (fresh) setOrder(fresh)
    } else {
      setNotice(result.message)
    }
    setPaying(false)
  }

  if (phase === 'loading' || !ready) return <div className="container page"><Loading label="Loading your order…" /></div>
  if (phase === 'verifying') return <div className="container page"><Loading label="Confirming your payment with Paystack…" /></div>

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
  const canPay = !paid && order.paymentStatus === 'pending' && paymentProvider.isConfigured
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
            ? <>
                Your payment of <strong>{formatPrice(order.total)}</strong> was received and your order is being prepared.
                {order.confirmationEmailSentAt && <> We’ve emailed your receipt to <strong>{order.customer.email}</strong>.</>}
              </>
            : <>Your order has been saved, but it has <strong>not been paid</strong> yet. You haven’t been charged.</>}
        </p>
      </header>

      {!paid && (notice || !paymentProvider.isConfigured) && (
        <div className="notice notice--info" role="status">
          <InfoIcon width={18} height={18} />
          <span>{notice ?? 'Online payment is not connected yet, so this order is waiting for payment. You have not been charged.'}</span>
        </div>
      )}

      {canPay && (
        <div className="pay-now">
          <button type="button" className="btn btn--primary btn--lg" onClick={onPayNow} disabled={paying} aria-busy={paying}>
            <LockIcon width={18} height={18} /> {paying ? 'Taking you to Paystack…' : `Pay ${formatPrice(order.total)} with Paystack`}
          </button>
          <p className="field-hint">Card, bank transfer or USSD on Paystack’s secure page.</p>
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
