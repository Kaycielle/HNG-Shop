/**
 * CartRepository — where carts are SAVED and LOADED.
 *
 * The rest of the app only talks to the `CartRepository` interface.
 *
 *   Signed-in customer + Supabase connected → the `cart_items` table, so the
 *     cart follows them to any device and survives signing out.
 *   Guest (or Supabase not connected)        → this browser's storage. A guest
 *     cart moves into the account when the customer signs in (CartContext).
 */
import type { Cart, CartItem } from '../../models/cart'
import { ownerKey, type CartOwner } from '../../models/user'
import { devStorage } from '../devStorage'
import { describeSupabaseError, supabase } from '../supabase/client'

export interface CartRepository {
  load(owner: CartOwner): Promise<Cart | null>
  save(cart: Cart): Promise<void>
  clear(owner: CartOwner): Promise<void>
}

/** Keeps each owner's cart in this browser's localStorage. */
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

interface CartItemRow {
  product_id: string
  quantity: number
  added_at: string
}

/** Saves a signed-in customer's cart in Supabase (`cart_items`, protected by Row Level Security). */
const supabaseCartRepository: CartRepository = {
  async load(owner) {
    const { data, error } = await supabase!
      .from('cart_items')
      .select('product_id, quantity, added_at')
      .eq('user_id', owner.id)
      .order('added_at')
    if (error) throw new Error(describeSupabaseError(error))
    const items: CartItem[] = (data as CartItemRow[]).map((r) => ({ productId: r.product_id, quantity: r.quantity, addedAt: r.added_at }))
    const updatedAt = items.reduce((latest, i) => (i.addedAt > latest ? i.addedAt : latest), new Date(0).toISOString())
    return { owner, items, updatedAt }
  },

  async save(cart) {
    const db = supabase!
    // 1. Remove products that are no longer in the cart.
    const keep = cart.items.map((i) => i.productId)
    let remove = db.from('cart_items').delete().eq('user_id', cart.owner.id)
    if (keep.length > 0) remove = remove.not('product_id', 'in', `(${keep.map((id) => `"${id}"`).join(',')})`)
    const removed = await remove
    if (removed.error) throw new Error(describeSupabaseError(removed.error))
    // 2. Add or update everything that is.
    if (cart.items.length > 0) {
      const { error } = await db.from('cart_items').upsert(
        cart.items.map((i) => ({ user_id: cart.owner.id, product_id: i.productId, quantity: i.quantity, added_at: i.addedAt })),
        { onConflict: 'user_id,product_id' },
      )
      if (error) throw new Error(describeSupabaseError(error))
    }
  },

  async clear(owner) {
    const { error } = await supabase!.from('cart_items').delete().eq('user_id', owner.id)
    if (error) throw new Error(describeSupabaseError(error))
  },
}

const pick = (owner: CartOwner): CartRepository =>
  supabase && owner.kind === 'user' ? supabaseCartRepository : localCartRepository

// Saves for the same owner run one after another, so a quick "+ + +" can never
// be written out of order.
const queues = new Map<string, Promise<unknown>>()
function inOrder<T>(owner: CartOwner, task: () => Promise<T>): Promise<T> {
  const key = ownerKey(owner)
  const run = (queues.get(key) ?? Promise.resolve()).then(task)
  queues.set(key, run.catch(() => undefined))
  return run
}

export const cartRepository: CartRepository = {
  load: (owner) => inOrder(owner, () => pick(owner).load(owner)),
  save: (cart) => inOrder(cart.owner, () => pick(cart.owner).save(cart)),
  clear: (owner) => inOrder(owner, () => pick(owner).clear(owner)),
}
