/**
 * CheckoutService — runs the steps of placing an order, in order.
 *
 *   Phase 1: validate → create pending order → save → ask PaymentService
 *   Phase 2: the same steps, but "save" goes to the database and the
 *            PaymentService returns a real gateway redirect. Verification,
 *            marking as paid and the confirmation email happen on the server.
 */
import type { CartLine, CartTotals } from '../../models/cart'
import type { CustomerInfo, DeliveryInfo, Order } from '../../models/order'
import { isPurchasable } from '../../models/product'
import type { CartOwner, User } from '../../models/user'
import { orderRepository } from '../order/orderRepository'
import { createPendingOrder } from '../order/orderService'
import { startPayment, type PaymentStartResult } from '../payment/paymentService'

export interface PlaceOrderInput {
  owner: CartOwner
  user: User | null
  customer: CustomerInfo
  delivery: DeliveryInfo
  lines: CartLine[]
  totals: CartTotals
}

export interface PlaceOrderResult {
  order: Order
  payment: PaymentStartResult
}

export class CheckoutError extends Error {}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (input.lines.length === 0) throw new CheckoutError('Your cart is empty.')
  const unavailable = input.lines.find((l) => !isPurchasable(l.product))
  if (unavailable) {
    throw new CheckoutError(`"${unavailable.product.name}" is no longer available. Please remove it from your cart.`)
  }

  const order = createPendingOrder(input)
  await orderRepository.save(order)

  const payment = await startPayment(order)
  if (payment.kind === 'redirect') {
    await orderRepository.save({ ...order, paymentReference: payment.reference })
  }
  return { order, payment }
}
