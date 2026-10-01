/**
 * CheckoutService — runs the steps of placing an order, in order.
 *
 *   validate → create the pending order (database or browser) → ask PaymentService
 *
 * Next: PaymentService returns a real gateway redirect. Verification, marking
 * as paid and the confirmation email happen on the server.
 */
import type { CartLine, CartTotals } from '../../models/cart'
import type { CustomerInfo, DeliveryInfo, Order } from '../../models/order'
import { isPurchasable } from '../../models/product'
import type { CartOwner, User } from '../../models/user'
import { OrderError, orderRepository } from '../order/orderRepository'
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

  let order
  try {
    order = await orderRepository.place(input)
  } catch (err) {
    // Out of stock, missing details… — show the database's message to the customer.
    if (err instanceof OrderError) throw new CheckoutError(err.message)
    throw err
  }

  // Phase 2: the payment reference is recorded by the server when it creates the transaction.
  const payment = await startPayment(order)
  return { order, payment }
}
