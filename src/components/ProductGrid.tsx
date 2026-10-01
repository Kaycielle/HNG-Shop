import type { Category, Product } from '../models/product'
import { ProductCard } from './ProductCard'

export function ProductGrid({ products, categories = [] }: { products: Product[]; categories?: Category[] }) {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  return (
    <ul className="product-grid" role="list">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} categoryName={names.get(p.categoryId)} />
        </li>
      ))}
    </ul>
  )
}
