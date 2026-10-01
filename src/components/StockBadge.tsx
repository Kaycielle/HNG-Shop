import type { Product } from '../models/product'

export function StockBadge({ product }: { product: Product }) {
  if (product.stockStatus === 'out_of_stock' || product.stockQuantity <= 0) {
    return <span className="stock stock--out">Out of stock</span>
  }
  if (product.stockStatus === 'low_stock') {
    return <span className="stock stock--low">Only {product.stockQuantity} left</span>
  }
  return <span className="stock stock--in">In stock</span>
}
