import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, Loading } from '../components/EmptyState'
import { CartIcon, InfoIcon, LockIcon } from '../components/Icons'
import { ProductImage } from '../components/ProductImage'
import { SummaryTotals } from '../components/SummaryTotals'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { isPurchasable } from '../models/product'
import { CheckoutError, placeOrder } from '../services/checkout/checkoutService'
import { paymentProvider } from '../services/payment/paymentService'
import { formatPrice } from '../utils/format'
import { useDocumentTitle } from '../utils/useDocumentTitle'
import {
  COUNTRIES,
  validateCheckout,
  validateField,
  type CheckoutErrors,
  type CheckoutField,
  type CheckoutForm,
} from '../utils/validation'

const FIELD_LABELS: Record<CheckoutField, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email address',
  phone: 'Phone number',
  address: 'Street address',
  city: 'City',
  state: 'State / Region',
  country: 'Country',
  postalCode: 'Postal code',
}

export function CheckoutPage() {
  useDocumentTitle('Checkout')
  const navigate = useNavigate()
  const { user, owner } = useAuth()
  const { lines, totals, loading, cart } = useCart()

  const [form, setForm] = useState<CheckoutForm>(() => ({
    firstName: user?.name.split(' ')[0] ?? '',
    lastName: user?.name.split(' ').slice(1).join(' ') ?? '',
    email: user?.email ?? '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    postalCode: '',
  }))
  const [errors, setErrors] = useState<CheckoutErrors>({})
  const [touched, setTouched] = useState<Partial<Record<CheckoutField, boolean>>>({})
  const [showSummary, setShowSummary] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  // Fill in name and email from the signed-in account. This runs again once
  // the account finishes loading, but never overwrites what the customer typed.
  useEffect(() => {
    if (!user) return
    const [first, ...rest] = user.name.split(' ')
    setForm((f) => ({
      ...f,
      firstName: f.firstName || first,
      lastName: f.lastName || rest.join(' '),
      email: f.email || user.email,
    }))
  }, [user])

  if (loading && cart.items.length > 0 && lines.length === 0) {
    return <div className="container page"><Loading label="Loading checkout…" /></div>
  }

  if (lines.length === 0) {
    return (
      <div className="container page">
        <h1 className="page-title">Checkout</h1>
      {!user && (
        <p className="checkout-signin">
          Have an account? <Link to="/account/sign-in" state={{ from: '/checkout' }}>Sign in</Link> to save this order to your
          order history, or <Link to="/account/register" state={{ from: '/checkout' }}>create one</Link>. You can also check out as a guest.
        </p>
      )}
        <EmptyState
          icon={<CartIcon width={32} height={32} />}
          title="Your cart is empty."
          message="Add some products to your cart before checking out."
          action={<Link to="/shop" className="btn btn--primary btn--lg">Browse products</Link>}
        />
      </div>
    )
  }

  const unavailable = lines.filter((l) => !isPurchasable(l.product))

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const field = e.target.name as CheckoutField
    const value = e.target.value
    setForm((f) => ({ ...f, [field]: value }))
    // Once a field has been visited, re-check it as the customer types.
    if (touched[field]) setErrors((errs) => ({ ...errs, [field]: validateField(field, value) }))
  }

  const onBlur = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const field = e.target.name as CheckoutField
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors((errs) => ({ ...errs, [field]: validateField(field, e.target.value) }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    const found = validateCheckout(form)
    setErrors(found)
    setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true])))
    if (Object.keys(found).length > 0) {
      // Move focus to the list of problems so keyboard and screen-reader users hear them.
      requestAnimationFrame(() => errorSummaryRef.current?.focus())
      return
    }
    if (unavailable.length > 0) {
      setSubmitError('Some items in your cart are no longer available. Please return to your cart and remove them.')
      return
    }

    setSubmitting(true)
    try {
      const { order, payment } = await placeOrder({
        owner,
        user,
        customer: { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone },
        delivery: { address: form.address, city: form.city, state: form.state, country: form.country, postalCode: form.postalCode },
        lines,
        totals,
      })
      switch (payment.kind) {
        case 'redirect':
          // Hand over to Paystack's secure payment page. It sends the customer
          // back to /order/<id>, where the payment is verified.
          window.location.assign(payment.url)
          return
        case 'already_paid':
          navigate(`/order/${encodeURIComponent(order.id)}`)
          return
        case 'not_configured':
          navigate(`/order/${encodeURIComponent(order.id)}`, { state: { notice: payment.message } })
          return
        case 'error':
          // The order is saved; let the customer retry from the order page
          // instead of placing a second order.
          navigate(`/order/${encodeURIComponent(order.id)}`, {
            state: { notice: `Your order is saved, but we couldn’t open the payment page: ${payment.message} You can pay from this page.` },
          })
          return
      }
    } catch (err) {
      setSubmitError(
        err instanceof CheckoutError ? err.message : 'Sorry, something went wrong while placing your order. Please try again.',
      )
      setSubmitting(false)
    }
  }

  const errorList = (Object.keys(errors) as CheckoutField[]).filter((f) => errors[f] && touched[f])

  const field = (name: CheckoutField, input: ReactNode, opts: { optional?: boolean; hint?: string } = {}) => (
    <div className={`field${errors[name] && touched[name] ? ' field--error' : ''}`}>
      <label htmlFor={name} className="field-label">
        {FIELD_LABELS[name]} {opts.optional ? <span className="field-optional">(optional)</span> : <span className="field-required" aria-hidden="true">*</span>}
      </label>
      {input}
      {opts.hint && <p id={`${name}-hint`} className="field-hint">{opts.hint}</p>}
      {errors[name] && touched[name] && (
        <p id={`${name}-error`} className="field-error">{errors[name]}</p>
      )}
    </div>
  )

  const inputProps = (name: CheckoutField, hint = false) => ({
    id: name,
    name,
    value: form[name],
    onChange,
    onBlur,
    required: name !== 'postalCode',
    'aria-invalid': !!(errors[name] && touched[name]),
    'aria-describedby': [hint ? `${name}-hint` : '', errors[name] && touched[name] ? `${name}-error` : ''].filter(Boolean).join(' ') || undefined,
    className: 'input',
  })

  return (
    <div className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/cart">Cart</Link></li>
          <li aria-current="page">Checkout</li>
        </ol>
      </nav>
      <h1 className="page-title">Checkout</h1>
      {!user && (
        <p className="checkout-signin">
          Have an account? <Link to="/account/sign-in" state={{ from: '/checkout' }}>Sign in</Link> to save this order to your
          order history, or <Link to="/account/register" state={{ from: '/checkout' }}>create one</Link>. You can also check out as a guest.
        </p>
      )}

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={onSubmit} noValidate aria-describedby="required-note">
          <p id="required-note" className="field-hint">Fields marked <span aria-hidden="true">*</span><span className="visually-hidden">with an asterisk</span> are required.</p>

          {errorList.length > 0 && (
            <div ref={errorSummaryRef} className="error-summary" role="alert" tabIndex={-1} aria-labelledby="error-summary-title">
              <h2 id="error-summary-title" className="error-summary__title">Please fix the following:</h2>
              <ul>
                {errorList.map((f) => (
                  <li key={f}><a href={`#${f}`} onClick={(e) => { e.preventDefault(); document.getElementById(f)?.focus() }}>{errors[f]}</a></li>
                ))}
              </ul>
            </div>
          )}

          <fieldset className="form-section">
            <legend className="form-section__title"><span className="step">1</span> Customer information</legend>
            <div className="form-grid">
              {field('firstName', <input {...inputProps('firstName')} autoComplete="given-name" />)}
              {field('lastName', <input {...inputProps('lastName')} autoComplete="family-name" />)}
              {field('email', <input {...inputProps('email', true)} type="email" autoComplete="email" inputMode="email" />, { hint: 'We’ll send your order updates here.' })}
              {field('phone', <input {...inputProps('phone', true)} type="tel" autoComplete="tel" inputMode="tel" placeholder="+234 801 234 5678" />, { hint: 'For delivery updates only.' })}
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend className="form-section__title"><span className="step">2</span> Delivery information</legend>
            <div className="form-grid">
              <div className="form-grid__full">
                {field('address', <input {...inputProps('address')} autoComplete="street-address" placeholder="House number and street name" />)}
              </div>
              {field('city', <input {...inputProps('city')} autoComplete="address-level2" />)}
              {field('state', <input {...inputProps('state')} autoComplete="address-level1" />)}
              {field('country', (
                <select {...inputProps('country')} className="input select" autoComplete="country-name">
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ))}
              {field('postalCode', <input {...inputProps('postalCode')} autoComplete="postal-code" />, { optional: true })}
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend className="form-section__title"><span className="step">3</span> Payment</legend>
            {/*
              PAYMENT INTEGRATION POINT
              This section only describes payment. The actual payment happens on
              the gateway's own secure page/popup, started by PaymentService.
              Card details are NEVER collected by this app.
            */}
            <div className="payment-box">
              <div className="payment-box__head">
                <LockIcon width={18} height={18} />
                <strong>{paymentProvider.displayName}</strong>
              </div>
              <p className="payment-box__text">
                {paymentProvider.isConfigured
                  ? <>You’ll be taken to Paystack’s secure page to pay by card, bank transfer or USSD. We never see or store your card details.</>
                  : <>You’ll pay with card, bank transfer or USSD on our payment partner’s secure page. We never see or store your card details.</>}
              </p>
              {!paymentProvider.isConfigured && (
                <div className="notice notice--info" role="note">
                  <InfoIcon width={18} height={18} />
                  <span>
                    <strong>Online payment is not connected yet.</strong> Placing your order will save it as
                    “Awaiting payment”. <strong>You will not be charged.</strong>
                  </span>
                </div>
              )}
            </div>
          </fieldset>

          {submitError && <div className="notice notice--error" role="alert">{submitError}</div>}

          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting} aria-busy={submitting}>
            <LockIcon width={18} height={18} />
            {submitting
              ? paymentProvider.isConfigured ? 'Taking you to Paystack…' : 'Placing your order…'
              : paymentProvider.isConfigured
                ? `Pay ${formatPrice(totals.total)}`
                : `Place order · ${formatPrice(totals.total)}`}
          </button>
          <Link to="/cart" className="link-back">← Back to cart</Link>
        </form>

        <aside className="summary-card checkout-summary" aria-labelledby="checkout-summary-heading">
          <div className="checkout-summary__head">
            <h2 id="checkout-summary-heading" className="summary-card__title">Order summary</h2>
            <button type="button" className="btn-link checkout-summary__toggle" aria-expanded={showSummary} aria-controls="checkout-items" onClick={() => setShowSummary((s) => !s)}>
              {showSummary ? 'Hide items' : `Show ${totals.itemCount} items`}
            </button>
          </div>
          <ul id="checkout-items" className={`summary-items${showSummary ? ' summary-items--open' : ''}`} role="list">
            {lines.map((l) => (
              <li key={l.product.id} className="summary-item">
                <div className="summary-item__media">
                  <ProductImage src={l.product.image} alt="" />
                  <span className="summary-item__qty" aria-hidden="true">{l.quantity}</span>
                </div>
                <div className="summary-item__info">
                  <p className="summary-item__name">{l.product.name}</p>
                  <p className="summary-item__meta">{l.quantity} × {formatPrice(l.unitPrice)}</p>
                  {!isPurchasable(l.product) && <p className="field-error">No longer available</p>}
                </div>
                <p className="summary-item__total">{formatPrice(l.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <SummaryTotals {...totals} />
          <Link to="/cart" className="btn-link">Edit cart</Link>
        </aside>
      </div>
    </div>
  )
}
