/**
 * Cart model.
 *
 *   Owner (guest or user) → Cart → CartItems → Products
 *
 * A cart item only stores the product ID and quantity — NOT the price or name.
 * Prices always come from the product catalogue, so a stale cart can never
 * charge an old price. In Phase 2 this maps directly onto two tables:
 *   carts(id, owner_id, updated_at)
 *   cart_items(cart_id, product_id, quantity, added_at)
 */
import type { CartOwner } from './user'
import type { Product } from './product'

export interface CartItem {
  productId: string
  quantity: number
  addedAt: string // ISO date string
}

export interface Cart {
  owner: CartOwner
  items: CartItem[]
  updatedAt: string // ISO date string
}

/** A cart item joined with its product — what the UI actually displays. */
export interface CartLine {
  product: Product
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface CartTotals {
  itemCount: number
  subtotal: number
  shipping: number
  total: number
}
