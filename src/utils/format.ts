import { config } from '../config'

const priceFormatter = new Intl.NumberFormat(config.locale, {
  style: 'currency',
  currency: config.currency,
  maximumFractionDigits: 0,
})

export function formatPrice(amount: number): string {
  return priceFormatter.format(amount)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(config.locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

export function pluralize(count: number, singular: string, plural = singular + 's'): string {
  return `${count} ${count === 1 ? singular : plural}`
}
