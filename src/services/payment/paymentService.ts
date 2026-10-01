/**
 * PaymentService — the single doorway to the payment gateway.
 *
 * The checkout page calls `startPayment(order)` and reacts to the result. It
 * does not know (or care) which gateway is behind it.
 *
 * ── How the real flow will work (Phase 2) ──────────────────────────────────
 *   1. Browser: startPayment(order) → our SERVER creates a transaction with
 *      the gateway using the SECRET key and returns a payment page URL (or
 *      opens the gateway's popup with the PUBLIC key).
 *   2. Customer pays on the gateway's own secure page.
 *   3. Gateway → our SERVER (webhook / verify call) confirms the payment.
 *   4. SERVER marks the order 'paid', saves it, sends the Mailgun email.
 *   5. Browser shows the order confirmation page, reading the order from
 *      the database.
 *
 * The browser NEVER decides an order is paid. The `verifyPayment` step must
 * run on a server, because only the server can safely hold the secret key.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Phase 1: no gateway is connected. `startPayment` honestly returns
 * `not_configured`; no money moves and no order is ever marked paid.
 */
import type { Order } from '../../models/order'

export type PaymentStartResult =
  /** Send the customer to the gateway's hosted payment page. */
  | { kind: 'redirect'; url: string; reference: string }
  /** No gateway connected yet (Phase 1). */
  | { kind: 'not_configured'; message: string }
  /** The gateway refused to start the payment. */
  | { kind: 'error'; message: string }

export interface PaymentProvider {
  /** Name shown to customers, e.g. "Paystack". */
  readonly displayName: string
  readonly isConfigured: boolean
  startPayment(order: Order): Promise<PaymentStartResult>
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
}

// Phase 2: replace with the real gateway provider (e.g. Paystack/Flutterwave/Stripe).
export const paymentProvider: PaymentProvider = notConfiguredProvider

export function startPayment(order: Order): Promise<PaymentStartResult> {
  return paymentProvider.startPayment(order)
}
