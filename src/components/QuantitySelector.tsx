import { useEffect, useId, useState } from 'react'
import { MinusIcon, PlusIcon } from './Icons'

interface Props {
  value: number
  max: number
  onChange: (value: number) => void
  /** Accessible name, e.g. "Quantity for Aura Headphones". */
  label: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

/**
 * − [ 2 ] + control. Never allows less than 1 or more than `max`; anything
 * typed outside that range is corrected when the field loses focus.
 */
export function QuantitySelector({ value, max, onChange, label, disabled = false, size = 'md' }: Props) {
  const id = useId()
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])

  const commit = (raw: string) => {
    const n = Number.parseInt(raw, 10)
    const next = Number.isNaN(n) ? value : Math.max(1, Math.min(n, max))
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  return (
    <div className={`qty qty--${size}`} role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="visually-hidden">{label}</span>
      <button type="button" className="qty__btn" onClick={() => onChange(value - 1)} disabled={disabled || value <= 1} aria-label="Decrease quantity">
        <MinusIcon width={16} height={16} />
      </button>
      <input
        id={id}
        className="qty__input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
        }}
      />
      <button type="button" className="qty__btn" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity">
        <PlusIcon width={16} height={16} />
      </button>
    </div>
  )
}
