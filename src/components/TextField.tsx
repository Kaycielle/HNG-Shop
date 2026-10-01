import { useState, type InputHTMLAttributes } from 'react'
import { EyeIcon, EyeOffIcon } from './Icons'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  hint?: string
}

/** Labelled input with hint, error message and (for passwords) a show/hide button. */
export function TextField({ id, label, error, hint, type = 'text', ...inputProps }: Props) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined

  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className={isPassword ? 'input-wrap' : undefined}>
        <input
          id={id}
          className="input"
          type={isPassword && visible ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className="input-wrap__toggle"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
          </button>
        )}
      </div>
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  )
}
