/**
 * OrderRepository — creates orders and reads them back.
 *
 *   Supabase connected → the database's place_order() function creates the
 *     order. It looks up real prices and stock and calculates every total
 *     itself, so a tampered browser can't change what an order costs. Orders
 *     are read back with get_order() / my_orders(), which only ever return
 *     the customer's own orders.
 *   Not connected      → orders are kept in this browser (Phase 1 demo).
 *
 * Either way a new order starts as payment 'pending' / order 'pending'. Only
 * a trusted server (the payment step) may mark it paid.
 */
import type { CartLine, CartTotals } from '../../models/cart'
import type { CustomerInfo, DeliveryInfo, Order } from '../../models/order'
import { ownerKey, type CartOwner, type User } from '../../models/user'
import { assetUrl } from '../../utils/assets'
import { devStorage } from '../devStorage'
import { describeSupabaseError, supabase } from '../supabase/client'
import { createPendingOrder } from './orderService'

export interface PlaceOrderRequest {
  owner: CartOwner
  user: User | null
  customer: CustomerInfo
  delivery: DeliveryInfo
  lines: CartLine[]
  totals: CartTotals
}

export interface OrderRepository {
  /** Creates a new pending order and returns it as saved (with final prices). */
  place(request: PlaceOrderRequest): Promise<Order>
  /** One order, if it belongs to `owner`. */
  getById(orderId: string, owner: CartOwner): Promise<Order | null>
  listForOwner(owner: CartOwner): Promise<Order[]>
}

/** A problem with the order the customer can act on (out of stock, missing details…). */
export class OrderError extends Error {}

// ---------------------------------------------------------------------------
// Browser-only orders (Supabase not connected)
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'orders'
const localOrders = () => devStorage.get<Order[]>(STORAGE_KEY) ?? []

const localOrderRepository: OrderRepository = {
  async place(request) {
    const order = createPendingOrder(request)
    devStorage.set(STORAGE_KEY, [order, ...localOrders()])
    return order
  },
  async getById(orderId, owner) {
    return localOrders().find((o) => o.id === orderId && ownerKey(o.owner) === ownerKey(owner)) ?? null
  },
  async listForOwner(owner) {
    return localOrders().filter((o) => ownerKey(o.owner) === ownerKey(owner))
  },
}

// ---------------------------------------------------------------------------
// Supabase orders
// ---------------------------------------------------------------------------
/** The JSON returned by the database's order functions (see order_json in the migration). */
interface OrderJson extends Omit<Order, 'owner'> {
  guestId: string | null
}

export function orderFromJson(json: OrderJson): Order {
  const { guestId, ...rest } = json
  return {
    ...rest,
    owner: rest.userId ? { kind: 'user', id: rest.userId } : { kind: 'guest', id: guestId ?? '' },
    items: rest.items.map((i) => ({ ...i, image: /^(https?:|data:)/.test(i.image) ? i.image : assetUrl(i.image) })),
  }
}

const supabaseOrderRepository: OrderRepository = {
  async place({ owner, customer, delivery, lines }) {
    const { data, error } = await supabase!.rpc('place_order', {
      p_customer: customer,
      p_delivery: delivery,
      // Only WHAT and HOW MANY are sent — the database sets the prices.
      p_items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      p_guest_id: owner.kind === 'guest' ? owner.id : null,
    })
    if (error) {
      // Messages raised by place_order() are written for customers.
      if (error.code === 'P0001') throw new OrderError(error.message)
      throw new Error(describeSupabaseError(error))
    }
    return orderFromJson(data as OrderJson)
  },

  async getById(orderId, owner) {
    const { data, error } = await supabase!.rpc('get_order', {
      p_order_id: orderId,
      p_guest_id: owner.kind === 'guest' ? owner.id : null,
    })
    if (error) throw new Error(describeSupabaseError(error))
    return data ? orderFromJson(data as OrderJson) : null
  },

  async listForOwner(owner) {
    if (owner.kind !== 'user') return []
    const { data, error } = await supabase!.rpc('my_orders')
    if (error) throw new Error(describeSupabaseError(error))
    return ((data ?? []) as OrderJson[]).map(orderFromJson)
  },
}

export const orderRepository: OrderRepository = supabase ? supabaseOrderRepository : localOrderRepository
