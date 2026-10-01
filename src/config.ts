/**
 * App-wide settings. Values can be overridden with environment variables
 * (see .env.example). Only PUBLIC values belong here — this code runs in the
 * customer's browser, so anything in it can be seen by anyone.
 */
export const config = {
  storeName: import.meta.env.VITE_STORE_NAME || 'Confam NG',
  currency: import.meta.env.VITE_CURRENCY || 'NGN',
  locale: 'en-NG',
  /** Flat delivery fee, waived when the subtotal reaches the threshold. */
  shippingFlatRate: 3500,
  freeShippingThreshold: 100000,
}
