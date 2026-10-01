import type { Brand, Product } from '../models/product'
import { ProductCard } from './ProductCard'

interface Props {
  products: Product[]
  /** Label each card with its brand name. */
  brands?: Brand[]
  /** Or choose the small label above each card's name yourself. */
  getLabel?: (product: Product) => string | undefined
}

/** Product cards in a responsive grid. */
export function ProductGrid({ products, brands = [], getLabel }: Props) {
  const names = new Map(brands.map((b) => [b.id, b.name]))
  return (
    <ul className="product-grid" role="list">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} brandName={getLabel ? getLabel(p) : names.get(p.brandId)} />
        </li>
      ))}
    </ul>
  )
}
