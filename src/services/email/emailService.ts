/**
 * EmailService — order confirmation emails (Mailgun, Phase 2).
 *
 * SECURITY: Sending email needs the Mailgun API key, which is a SECRET. It
 * must never be in browser code. Emails will therefore be sent from a server
 * function, triggered only AFTER the payment has been verified:
 *
 *   Payment verified (server) → Save order as paid → sendOrderConfirmation(order)
 *
 * Phase 1: nothing is sent. This file only prepares the email content so the
 * Phase 2 server function can reuse it.
 */
import { config } from '../../config'
import type { Order } from '../../models/order'
import { formatPrice } from '../../utils/format'

export interface EmailMessage {
  to: string
  subject: string
  text: string
}

export function buildOrderConfirmationEmail(order: Order): EmailMessage {
  const lines = order.items
    .map((i) => `• ${i.productName} × ${i.quantity} — ${formatPrice(i.lineTotal)}`)
    .join('\n')
  return {
    to: order.customer.email,
    subject: `Your ${config.storeName} order ${order.id} is confirmed`,
    text: [
      `Hi ${order.customer.firstName},`,
      '',
      `Thank you for your order! Here is your summary:`,
      '',
      lines,
      '',
      `Subtotal: ${formatPrice(order.subtotal)}`,
      `Delivery: ${order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}`,
      `Total: ${formatPrice(order.total)}`,
      '',
      `Delivering to: ${order.delivery.address}, ${order.delivery.city}, ${order.delivery.state}, ${order.delivery.country}`,
      '',
      `— The ${config.storeName} team`,
    ].join('\n'),
  }
}
