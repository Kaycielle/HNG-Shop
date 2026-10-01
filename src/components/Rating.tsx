import { StarIcon } from './Icons'

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <div className="rating">
      <StarIcon width={16} height={16} className="rating__star" />
      <span>
        <span className="visually-hidden">Rated </span>
        {value.toFixed(1)}
        <span className="visually-hidden"> out of 5</span>
      </span>
      {count !== undefined && <span className="rating__count">({count}<span className="visually-hidden"> reviews</span>)</span>}
    </div>
  )
}
