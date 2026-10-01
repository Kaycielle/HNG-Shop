/**
 * PaymentService — the single doorway to the payment gateway (Paystack).
 *
 * The checkout and order pages call `startPayment(order)` / `verifyPayment(...)`
 * and react to the result; they don't know which gateway is behind it.
 *
 * ── How it works ───────────────────────────────────────────────────────────
 *   1. Browser: startPayment(order) → our server function ("paystack", in
 *      supabase/functions) creates the transaction with Paystack using the
 *      SECRET key, and returns Paystack's secure payment page URL.
 *   2. The customer pays on Paystack's page (card, bank transfer, USSD).
 *   3. Paystack sends them back to /order/<id>?reference=…, and the order page
 *      calls verifyPayment(). The server asks Paystack whether it really was
 *      paid, for the right amount, and only then marks the order paid.
 *   4. Paystack's signed webhook does the same on the server, so an order is
 *      confirmed even if the customer closes the browser.
 *
 * The browser NEVER decides an order is paid, and never sees the secret key.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Paystack is used when Supabase is connected AND a Paystack public key is set
 * (VITE_PAYSTACK_PUBLIC_KEY or PAYSTACK_PUBLIC_KEY). Otherwise payments are
 * "not configured": orders are saved as "Awaiting payment" and nobody is charged.
 */
import type { Order } from '../../models/order'
import type { CartOwner } from '../../models/user'
import { orderFromJson } from '../order/orderRepository'
import { supabase } from '../supabase/client'

export type PaymentStartResult =
  /** Send the customer to the gateway's hosted payment page. */
  | { kind: 'redirect'; url: string; reference: string }
  /** The order was already paid (e.g. paid in another tab). */
  | { kind: 'already_paid' }
  /** No gateway connected. */
  | { kind: 'not_configured'; message: string }
  /** The gateway refused to start the payment. */
  | { kind: 'error'; message: string }

export type PaymentVerifyResult =
  | { paid: true; order: Order }
  | { paid: false; message: string }

export interface PaymentProvider {
  /** Name shown to customers, e.g. "Paystack". */
  readonly displayName: string
  readonly isConfigured: boolean
  startPayment(order: Order): Promise<PaymentStartResult>
  verifyPayment(order: Order, reference: string | null): Promise<PaymentVerifyResult>
}

const notConfiguredProvider: PaymentProvider = {
  displayName: 'Online payment',
  isConfigured: false,
  async startPayment() {
    return {
      kind: 'not_configured',
      message:
        'Online payment is not connected yet. Your order has been saved as "Awaiting payment" and you have not been charged.',
    }
  },
  async verifyPayment() {
    return { paid: false, message: 'Online payment is not connected yet.' }
  },
}

/** Guest orders are matched to the browser that placed them. */
const guestIdOf = (owner: CartOwner) => (owner.kind === 'guest' ? owner.id : undefined)

/** Calls the "paystack" Edge Function and turns failures into a readable message. */
async function callPaystackFunction<T>(body: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase!.functions.invoke('paystack', { body })
  if (!error) return { data: data as T }
  // The function replies with { error: "message for the customer" }.
  let message = 'We couldn’t reach our payment service. Please try again in a moment.'
  try {
    const context = (error as { context?: Response }).context
    const reply = context ? await context.json() : null
    if (reply?.error) message = reply.error
  } catch {
    // keep the general message
  }
  console.error('Payment function error:', error)
  return { error: message }
}

const paystackProvider: PaymentProvider = {
  displayName: 'Paystack',
  isConfigured: true,

  async startPayment(order) {
    const { data, error } = await callPaystackFunction<{ url?: string; reference?: string; alreadyPaid?: boolean }>({
      action: 'initialize',
      orderId: order.id,
      guestId: guestIdOf(order.owner),
    })
    if (error) return { kind: 'error', message: error }
    if (data?.alreadyPaid) return { kind: 'already_paid' }
    if (!data?.url) return { kind: 'error', message: 'Paystack didn’t return a payment page. Please try again.' }
    return { kind: 'redirect', url: data.url, reference: data.reference ?? '' }
  },

  async verifyPayment(order, reference) {
    const { data, error } = await callPaystackFunction<{ paid: boolean; order?: unknown; message?: string }>({
      action: 'verify',
      orderId: order.id,
      reference,
      guestId: guestIdOf(order.owner),
    })
    if (error) return { paid: false, message: error }
    if (data?.paid && data.order) return { paid: true, order: orderFromJson(data.order as Parameters<typeof orderFromJson>[0]) }
    return { paid: false, message: data?.message ?? 'We couldn’t confirm this payment yet.' }
  },
}

const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.trim() ?? ''

export const paymentProvider: PaymentProvider =
  supabase && paystackPublicKey.startsWith('pk_') ? paystackProvider : notConfiguredProvider

export function startPayment(order: Order): Promise<PaymentStartResult> {
  return paymentProvider.startPayment(order)
}

export function verifyPayment(order: Order, reference: string | null): Promise<PaymentVerifyResult> {
  return paymentProvider.verifyPayment(order, reference)
}
