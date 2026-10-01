/**
 * Where the catalogue (categories, item types, brands, products) comes from.
 *
 * - Supabase connected → read from the database tables.
 * - Not connected      → the sample data in src/data/mockProducts.ts.
 *
 * The whole catalogue is loaded once and kept in memory. That is ideal for a
 * shop of this size (tens to a few hundred products); a much larger catalogue
 * would move searching and filtering into database queries instead.
 */
import { mockBrands, mockCategories, mockProductTypes, mockProducts } from '../../data/mockProducts'
import type { Brand, Category, Product, ProductType, StockStatus } from '../../models/product'
import { assetUrl } from '../../utils/assets'
import { describeSupabaseError, supabase } from '../supabase/client'

export interface Catalog {
  categories: Category[]
  types: ProductType[]
  brands: Brand[]
  products: Product[]
}

/** Low stock is 5 or fewer — the same rule for the sample data and the database. */
export function stockStatusFor(quantity: number): StockStatus {
  return quantity <= 0 ? 'out_of_stock' : quantity <= 5 ? 'low_stock' : 'in_stock'
}

/** Image paths are stored relative ("images/products/x.svg"); make them full URLs. */
const withImageUrl = (p: Product): Product => ({ ...p, image: /^(https?:|data:)/.test(p.image) ? p.image : assetUrl(p.image) })

interface ProductRow {
  id: string
  slug: string
  name: string
  short_description: string
  description: string
  price: number
  discount_percent: number | null
  image: string
  category_id: string
  brand_id: string
  type_id: string
  stock_quantity: number
  rating: number | string | null
  rating_count: number | null
  featured: boolean
  specs: { label: string; value: string }[] | null
}

/** Turns a database row (snake_case) into the app's Product shape. */
export function productFromRow(r: ProductRow): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortDescription: r.short_description,
    description: r.description,
    price: r.price,
    discountPercent: r.discount_percent ?? undefined,
    image: r.image,
    categoryId: r.category_id,
    brandId: r.brand_id,
    typeId: r.type_id,
    stockQuantity: r.stock_quantity,
    stockStatus: stockStatusFor(r.stock_quantity),
    rating: r.rating === null ? undefined : Number(r.rating),
    ratingCount: r.rating_count ?? undefined,
    featured: r.featured,
    specs: r.specs ?? [],
  }
}

async function loadFromSupabase(): Promise<Catalog> {
  const db = supabase!
  const [categories, types, brands, products] = await Promise.all([
    db.from('categories').select('id, name, description').order('sort_order'),
    db.from('product_types').select('id, name, category_id').order('sort_order'),
    db.from('brands').select('id, name, tagline').order('sort_order'),
    db.from('products').select('*').order('sort_order'),
  ])
  const failed = [categories, types, brands, products].find((r) => r.error)
  if (failed?.error) throw new Error(describeSupabaseError(failed.error))
  return {
    categories: categories.data ?? [],
    types: (types.data ?? []).map((t) => ({ id: t.id, name: t.name, categoryId: t.category_id })),
    brands: brands.data ?? [],
    products: (products.data as ProductRow[]).map(productFromRow).map(withImageUrl),
  }
}

let cached: Promise<Catalog> | null = null

export function getCatalog(): Promise<Catalog> {
  if (!cached) {
    cached = supabase
      ? loadFromSupabase()
      : Promise.resolve({
          categories: mockCategories,
          types: mockProductTypes,
          brands: mockBrands,
          products: mockProducts.map(withImageUrl),
        })
    // If loading fails (e.g. offline), try again next time instead of caching the error.
    cached.catch(() => {
      cached = null
    })
  }
  return cached
}
