/**
 * ProductService — the ONLY place pages get product data from.
 *
 * The data itself comes from catalogSource.ts: the Supabase database when it
 * is connected, otherwise the built-in sample catalogue. Every function is
 * async, so pages never need to know which one is in use.
 */
import {
  getUnitPrice,
  isPurchasable,
  type Brand,
  type BrandSummary,
  type Category,
  type Product,
  type ProductType,
} from '../../models/product'
import { getCatalog } from './catalogSource'

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'name'

export interface ProductQuery {
  search?: string
  categoryId?: string
  brandId?: string
  typeId?: string
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
  return (await getCatalog()).categories
}

export async function getProductTypes(): Promise<ProductType[]> {
  return (await getCatalog()).types
}

export async function getBrands(): Promise<Brand[]> {
  return (await getCatalog()).brands
}

export async function getBrand(brandId: string): Promise<Brand | null> {
  return (await getCatalog()).brands.find((b) => b.id === brandId) ?? null
}

/**
 * Every brand with what it currently sells: how many products, which item
 * types (Phones, Power banks…), its lowest price and a showcase image.
 */
export async function getBrandSummaries(): Promise<BrandSummary[]> {
  const { brands, products: allProducts, types } = await getCatalog()
  return brands
    .map((brand) => {
      const products = allProducts.filter((p) => p.brandId === brand.id)
      const brandTypes = types
        .map((type) => ({ type, count: products.filter((p) => p.typeId === type.id).length }))
        .filter((t) => t.count > 0)
      const showcase = products.find((p) => p.featured && isPurchasable(p)) ?? products.find(isPurchasable) ?? products[0]
      return {
        ...brand,
        productCount: products.length,
        types: brandTypes,
        fromPrice: Math.min(...products.map(getUnitPrice)),
        image: showcase?.image ?? '',
      }
    })
    .filter((b) => b.productCount > 0)
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const { categories, brands, types, products } = await getCatalog()
  const search = query.search?.trim().toLowerCase() ?? ''
  const categoryNames = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]))
  const brandNames = new Map(brands.map((b) => [b.id, b.name.toLowerCase()]))
  const typeNames = new Map(types.map((t) => [t.id, t.name.toLowerCase()]))

  const results = products.filter((p) => {
    if (query.categoryId && p.categoryId !== query.categoryId) return false
    if (query.brandId && p.brandId !== query.brandId) return false
    if (query.typeId && p.typeId !== query.typeId) return false
    if (query.inStockOnly && !isPurchasable(p)) return false
    if (query.onSaleOnly && !p.discountPercent) return false
    if (search) {
      const haystack = [
        p.name,
        p.shortDescription,
        p.description,
        categoryNames.get(p.categoryId) ?? '',
        brandNames.get(p.brandId) ?? '',
        typeNames.get(p.typeId) ?? '',
      ]
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
  return (await getCatalog()).products.filter((p) => p.featured && isPurchasable(p)).slice(0, limit)
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return (await getCatalog()).products.find((p) => p.slug === slug) ?? null
}

/** Used by the cart to look up the current details of the products in it. */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const wanted = new Set(ids)
  return (await getCatalog()).products.filter((p) => wanted.has(p.id))
}

/** Same brand first, then the same type of item from other brands. */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const others = (await getCatalog()).products.filter((p) => p.id !== product.id)
  const sameBrand = others.filter((p) => p.brandId === product.brandId)
  const sameType = others.filter((p) => p.typeId === product.typeId && p.brandId !== product.brandId)
  return [...sameBrand, ...sameType].slice(0, limit)
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
