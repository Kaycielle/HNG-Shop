/**
 * OrderRepository — where orders are saved and read back.
 *
 * Phase 1: orders are kept in this browser only (development convenience).
 * Phase 2: orders MUST be created and updated on the server/database. The
 *          server should re-calculate prices from the product table rather
 *          than trusting totals sent by the browser, and only the server
 *          (after verifying payment) may set paymentStatus to 'paid'.
 */
import type { Order } from '../../models/order'
import { ownerKey, type CartOwner } from '../../models/user'
import { devStorage } from '../devStorage'

export interface OrderRepository {
  save(order: Order): Promise<void>
  getById(orderId: string): Promise<Order | null>
  listForOwner(owner: CartOwner): Promise<Order[]>
}

const STORAGE_KEY = 'orders'

const localOrderRepository: OrderRepository = {
  async save(order) {
    const orders = devStorage.get<Order[]>(STORAGE_KEY) ?? []
    devStorage.set(STORAGE_KEY, [order, ...orders.filter((o) => o.id !== order.id)])
  },
  async getById(orderId) {
    return (devStorage.get<Order[]>(STORAGE_KEY) ?? []).find((o) => o.id === orderId) ?? null
  },
  async listForOwner(owner) {
    const key = ownerKey(owner)
    return (devStorage.get<Order[]>(STORAGE_KEY) ?? []).filter((o) => ownerKey(o.owner) === key)
  },
}

// Phase 2: replace with the database-backed repository.
export const orderRepository: OrderRepository = localOrderRepository
