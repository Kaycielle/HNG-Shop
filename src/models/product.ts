/**
 * Product model.
 *
 * This is the shape every part of the app uses for a product. In Phase 2 the
 * same shape will come back from the database (Supabase/Neon), so the UI does
 * not need to change — only the ProductService that fetches it.
 */

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface Category {
  id: string
  name: string
  description: string
}

export interface Product {
  id: string
  /** URL-friendly name used in links, e.g. /product/aura-wireless-headphones */
  slug: string
  name: string
  /** Short one-line summary shown on product cards. */
  shortDescription: string
  /** Full description shown on the product details page. */
  description: string
  /** Regular price in whole currency units (e.g. Naira). Integers only. */
  price: number
  /** Optional discount as a whole percentage, e.g. 15 means 15% off. */
  discountPercent?: number
  image: string
  categoryId: string
  stockStatus: StockStatus
  /** How many units are available. Used to cap cart quantities. */
  stockQuantity: number
  /** Optional average rating from 0 to 5. */
  rating?: number
  ratingCount?: number
  featured?: boolean
  /** Extra details shown on the product page ("Material: Leather", ...). */
  specs?: { label: string; value: string }[]
}

/** The most of one product a customer may put in their cart. */
export const MAX_QUANTITY_PER_ITEM = 10

/** The price the customer actually pays for one unit, after any discount. */
export function getUnitPrice(product: Product): number {
  if (!product.discountPercent) return product.price
  return Math.round(product.price * (1 - product.discountPercent / 100))
}

export function isPurchasable(product: Product): boolean {
  return product.stockStatus !== 'out_of_stock' && product.stockQuantity > 0
}

/** Highest quantity allowed in the cart for this product. */
export function getMaxQuantity(product: Product): number {
  if (!isPurchasable(product)) return 0
  return Math.min(product.stockQuantity, MAX_QUANTITY_PER_ITEM)
}
