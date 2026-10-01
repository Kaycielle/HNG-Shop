/**
 * CartRepository — where carts are SAVED and LOADED.
 *
 * The rest of the app only talks to the `CartRepository` interface. To move
 * carts into the database in Phase 2 we write a `supabaseCartRepository`
 * that implements the same three functions and change the one line at the
 * bottom of this file. Nothing else needs to change.
 */
import type { Cart } from '../../models/cart'
import { ownerKey, type CartOwner } from '../../models/user'
import { devStorage } from '../devStorage'

export interface CartRepository {
  load(owner: CartOwner): Promise<Cart | null>
  save(cart: Cart): Promise<void>
  clear(owner: CartOwner): Promise<void>
}

/** Phase 1 only: keeps each owner's cart in this browser's localStorage. */
const localCartRepository: CartRepository = {
  async load(owner) {
    const cart = devStorage.get<Cart>(`cart.${ownerKey(owner)}`)
    if (!cart || !Array.isArray(cart.items)) return null
    return cart
  },
  async save(cart) {
    devStorage.set(`cart.${ownerKey(cart.owner)}`, cart)
  },
  async clear(owner) {
    devStorage.remove(`cart.${ownerKey(owner)}`)
  },
}

// Phase 2: replace with the database-backed repository.
export const cartRepository: CartRepository = localCartRepository
