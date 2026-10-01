/**
 * OrderService — turns a cart + checkout form into an Order.
 *
 * New orders always start as:
 *   paymentStatus: 'pending'   orderStatus: 'pending'
 * They only move to 'paid' / 'processing' after the payment gateway confirms
 * the payment on the server (Phase 2).
 */
import { config } from '../../config'
import type { CartLine, CartTotals } from '../../models/cart'
import type { CustomerInfo, DeliveryInfo, Order } from '../../models/order'
import type { CartOwner, User } from '../../models/user'
import { randomId } from '../devStorage'

interface CreateOrderInput {
  owner: CartOwner
  user: User | null
  customer: CustomerInfo
  delivery: DeliveryInfo
  lines: CartLine[]
  totals: CartTotals
}

export function createPendingOrder(input: CreateOrderInput): Order {
  const { owner, user, customer, delivery, lines, totals } = input
  return {
    id: generateOrderNumber(),
    userId: user?.id ?? null,
    owner,
    customer: trimAll(customer),
    delivery: trimAll(delivery),
    items: lines.map((l) => ({
      productId: l.product.id,
      productName: l.product.name,
      image: l.product.image,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    })),
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
    currency: config.currency,
    paymentStatus: 'pending',
    orderStatus: 'pending',
    paymentReference: null,
    createdAt: new Date().toISOString(),
  }
}

/** Human-friendly order number, e.g. "CN-20261001-7F3A9C". */
function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `CN-${date}-${randomId().slice(0, 6).toUpperCase()}`
}

function trimAll<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
  ) as T
}
