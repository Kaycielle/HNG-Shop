import { config } from '../config'
import { formatPrice } from '../utils/format'

interface Props {
  subtotal: number
  shipping: number
  total: number
  itemCount?: number
  showFreeShippingHint?: boolean
}

export function SummaryTotals({ subtotal, shipping, total, itemCount, showFreeShippingHint = false }: Props) {
  const remaining = config.freeShippingThreshold - subtotal
  return (
    <>
      <dl className="totals">
        <div className="totals__row">
          <dt>Subtotal{itemCount !== undefined && ` (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`}</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className="totals__row">
          <dt>Delivery</dt>
          <dd>{shipping === 0 ? 'Free' : formatPrice(shipping)}</dd>
        </div>
        <div className="totals__row totals__row--total">
          <dt>Total</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>
      {showFreeShippingHint && subtotal > 0 && remaining > 0 && (
        <p className="totals__hint">Add {formatPrice(remaining)} more for free delivery.</p>
      )}
    </>
  )
}
