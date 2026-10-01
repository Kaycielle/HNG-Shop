/**
 * CartService — the rules of the cart, written as small "pure" functions.
 *
 * Each function takes a cart and returns a NEW cart; nothing is saved here.
 * Keeping the rules separate from storage means they work the same whether
 * the cart lives in the browser (Phase 1) or the database (Phase 2).
 */
import { config } from '../../config'
import type { Cart, CartLine, CartTotals } from '../../models/cart'
import { getMaxQuantity, getUnitPrice, type Product } from '../../models/product'
import type { CartOwner } from '../../models/user'

export function createEmptyCart(owner: CartOwner): Cart {
  return { owner, items: [], updatedAt: new Date().toISOString() }
}

/** Makes sure a quantity is a whole number between 1 and the allowed max. */
export function clampQuantity(quantity: number, max: number): number {
  if (!Number.isFinite(quantity)) return 1
  return Math.max(1, Math.min(Math.floor(quantity), Math.max(max, 1)))
}

export function getItemQuantity(cart: Cart, productId: string): number {
  return cart.items.find((i) => i.productId === productId)?.quantity ?? 0
}

/** Adds a product. Returns the cart unchanged if the product can't be bought. */
export function addItem(cart: Cart, product: Product, quantity = 1): Cart {
  const max = getMaxQuantity(product)
  if (max === 0 || quantity < 1) return cart

  const existing = cart.items.find((i) => i.productId === product.id)
  const items = existing
    ? cart.items.map((i) =>
        i.productId === product.id ? { ...i, quantity: clampQuantity(i.quantity + quantity, max) } : i,
      )
    : [...cart.items, { productId: product.id, quantity: clampQuantity(quantity, max), addedAt: new Date().toISOString() }]

  return touch({ ...cart, items })
}

/** Sets an exact quantity. Values below 1 are not allowed — use removeItem. */
export function setItemQuantity(cart: Cart, product: Product, quantity: number): Cart {
  const max = getMaxQuantity(product)
  const items = cart.items.map((i) =>
    i.productId === product.id ? { ...i, quantity: clampQuantity(quantity, max) } : i,
  )
  return touch({ ...cart, items })
}

export function removeItem(cart: Cart, productId: string): Cart {
  return touch({ ...cart, items: cart.items.filter((i) => i.productId !== productId) })
}

export function clearItems(cart: Cart): Cart {
  return touch({ ...cart, items: [] })
}

/**
 * Phase 2: when a guest signs in, combine their guest cart with the cart
 * already saved on their account so nothing is lost.
 */
export function mergeCarts(userCart: Cart, guestCart: Cart, products: Product[]): Cart {
  let merged = userCart
  for (const item of guestCart.items) {
    const product = products.find((p) => p.id === item.productId)
    if (product) merged = addItem(merged, product, item.quantity)
  }
  return merged
}

/** Joins cart items with their products (current price, name, image...). */
export function buildCartLines(cart: Cart, products: Product[]): CartLine[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  const lines: CartLine[] = []
  for (const item of cart.items) {
    const product = byId.get(item.productId)
    if (!product) continue // product removed from the catalogue
    const unitPrice = getUnitPrice(product)
    lines.push({ product, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity })
  }
  return lines
}

export function calculateShipping(subtotal: number): number {
  if (subtotal === 0) return 0
  return subtotal >= config.freeShippingThreshold ? 0 : config.shippingFlatRate
}

export function calculateTotals(lines: CartLine[]): CartTotals {
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0)
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)
  const shipping = calculateShipping(subtotal)
  return { itemCount, subtotal, shipping, total: subtotal + shipping }
}

function touch(cart: Cart): Cart {
  return { ...cart, updatedAt: new Date().toISOString() }
}
