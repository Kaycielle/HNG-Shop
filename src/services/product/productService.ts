/**
 * ProductService — the ONLY place the app gets product data from.
 *
 * Phase 1: reads the mock data in data/mockProducts.ts.
 * Phase 2: replace the bodies of these functions with database queries
 *          (e.g. supabase.from('products').select(...)). Every function is
 *          already async, so pages and components will not need to change.
 */
import { mockCategories, mockProducts } from '../../data/mockProducts'
import { getUnitPrice, isPurchasable, type Category, type Product } from '../../models/product'

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'name'

export interface ProductQuery {
  search?: string
  categoryId?: string
  inStockOnly?: boolean
  onSaleOnly?: boolean
  sort?: ProductSort
}

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'Name: A–Z' },
]

export async function getCategories(): Promise<Category[]> {
  return mockCategories
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const search = query.search?.trim().toLowerCase() ?? ''
  const categoryNames = new Map(mockCategories.map((c) => [c.id, c.name.toLowerCase()]))

  const results = mockProducts.filter((p) => {
    if (query.categoryId && p.categoryId !== query.categoryId) return false
    if (query.inStockOnly && !isPurchasable(p)) return false
    if (query.onSaleOnly && !p.discountPercent) return false
    if (search) {
      const haystack = [p.name, p.shortDescription, p.description, categoryNames.get(p.categoryId) ?? '']
        .join(' ')
        .toLowerCase()
      // Every word the customer typed must appear somewhere.
      return search.split(/\s+/).every((word) => haystack.includes(word))
    }
    return true
  })

  return sortProducts(results, query.sort ?? 'featured')
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  return mockProducts.filter((p) => p.featured && isPurchasable(p)).slice(0, limit)
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return mockProducts.find((p) => p.slug === slug) ?? null
}

/** Used by the cart to look up the current details of the products in it. */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const wanted = new Set(ids)
  return mockProducts.filter((p) => wanted.has(p.id))
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  return mockProducts
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, limit)
}

function sortProducts(products: Product[], sort: ProductSort): Product[] {
  const list = [...products]
  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => getUnitPrice(a) - getUnitPrice(b))
    case 'price-desc':
      return list.sort((a, b) => getUnitPrice(b) - getUnitPrice(a))
    case 'rating':
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name))
    case 'featured':
    default:
      // Featured first, then available before sold out.
      return list.sort(
        (a, b) =>
          Number(isPurchasable(b)) - Number(isPurchasable(a)) ||
          Number(!!b.featured) - Number(!!a.featured),
      )
  }
}
