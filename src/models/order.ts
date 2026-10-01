/**
 * Order model.
 *
 * Designed to be saved in the database in Phase 2, e.g.:
 *   orders(id, user_id, customer..., delivery..., subtotal, shipping, total,
 *          payment_status, order_status, payment_reference, created_at)
 *   order_items(order_id, product_id, product_name, unit_price, quantity, line_total)
 *
 * IMPORTANT: An order's paymentStatus may only become 'paid' after the payment
 * gateway has VERIFIED the payment on a server. Clicking a button never makes
 * an order paid.
 */
import type { CartOwner } from './user'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface CustomerInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface DeliveryInfo {
  address: string
  city: string
  state: string
  country: string
  postalCode: string
}

/**
 * A snapshot of a product at the moment of ordering. We copy the name and
 * price so the order stays accurate even if the product changes later.
 */
export interface OrderItem {
  productId: string
  productName: string
  image: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface Order {
  id: string
  /** The signed-in user's ID (Phase 2). Null for guest orders in Phase 1. */
  userId: string | null
  owner: CartOwner
  customer: CustomerInfo
  delivery: DeliveryInfo
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  currency: string
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  /** Reference from the payment gateway. Set in Phase 2. */
  paymentReference: string | null
  createdAt: string // ISO date string
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}
