/**
 * Checkout form validation. Returns a friendly message for every field that
 * has a problem. An empty object means the form is valid.
 */
import type { CustomerInfo, DeliveryInfo } from '../models/order'

export type CheckoutForm = CustomerInfo & DeliveryInfo
export type CheckoutField = keyof CheckoutForm
export type CheckoutErrors = Partial<Record<CheckoutField, string>>

const NAME_PATTERN = /^[\p{L}][\p{L}\s'.-]*$/u
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_ALLOWED = /^\+?[\d\s()-]+$/
const POSTAL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,9}$/

export const COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'United Kingdom', 'United States', 'Canada']

export function validateField(field: CheckoutField, rawValue: string): string | undefined {
  const value = rawValue.trim()
  switch (field) {
    case 'firstName':
    case 'lastName': {
      const label = field === 'firstName' ? 'first name' : 'last name'
      if (!value) return `Please enter your ${label}.`
      if (value.length < 2) return `Your ${label} should be at least 2 characters.`
      if (value.length > 50) return `Your ${label} should be 50 characters or fewer.`
      if (!NAME_PATTERN.test(value)) return `Your ${label} can only contain letters, spaces, hyphens and apostrophes.`
      return
    }
    case 'email':
      if (!value) return 'Please enter your email address.'
      if (!EMAIL_PATTERN.test(value)) return 'Please enter a valid email address, like name@example.com.'
      return
    case 'phone': {
      if (!value) return 'Please enter your phone number.'
      if (!PHONE_ALLOWED.test(value)) return 'Phone numbers can only contain digits, spaces, dashes and a leading +.'
      const digits = value.replace(/\D/g, '').length
      if (digits < 7 || digits > 15) return 'Please enter a valid phone number (7–15 digits).'
      return
    }
    case 'address':
      if (!value) return 'Please enter your delivery address.'
      if (value.length < 5) return 'Please enter your full street address.'
      return
    case 'city':
      if (!value) return 'Please enter your city.'
      return
    case 'state':
      if (!value) return 'Please enter your state or region.'
      return
    case 'country':
      if (!value) return 'Please choose your country.'
      if (!COUNTRIES.includes(value)) return 'Sorry, we don’t deliver to that country yet.'
      return
    case 'postalCode':
      // Optional — many Nigerian addresses don't use one.
      if (value && !POSTAL_PATTERN.test(value)) return 'Please enter a valid postal code, or leave it blank.'
      return
  }
}

export function validateCheckout(form: CheckoutForm): CheckoutErrors {
  const errors: CheckoutErrors = {}
  for (const field of Object.keys(form) as CheckoutField[]) {
    const message = validateField(field, form[field])
    if (message) errors[field] = message
  }
  return errors
}
