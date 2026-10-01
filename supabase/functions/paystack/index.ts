/**
 * Confam NG — Paystack payments (Supabase Edge Function, runs on Supabase's servers).
 *
 * One function, three jobs:
 *   POST { action: "initialize", orderId, guestId? }  → starts a Paystack payment, returns its page URL
 *   POST { action: "verify", orderId, reference, guestId? } → asks Paystack if it was paid; marks the order paid
 *   POST /paystack/webhook                             → Paystack's signed "charge.success" notice
 *
 * Secrets (Dashboard → Edge Functions → Secrets):
 *   PAYSTACK_SECRET_KEY  sk_test_… (later sk_live_…) — never put this in the website
 *   SITE_URL             your shop's permanent address, e.g. https://hng-shop-kaylechi.vercel.app
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
 *
 * Settings: turn OFF "Verify JWT" for this function — Paystack's webhook has no
 * Supabase login, and this code checks who is calling itself.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const PAYSTACK_API = 'https://api.paystack.co'
const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''
const siteUrl = (Deno.env.get('SITE_URL') ?? '').trim().replace(/\/+$/, '')
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false, autoRefreshToken: false },
})

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** A problem we can explain to the customer (shown on the website). */
class PaymentError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

interface OrderJson {
  id: string
  userId: string | null
  guestId: string | null
  customer: { email: string }
  total: number
  currency: string
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  paymentReference: string | null
}

interface PaystackTransaction {
  status: string // 'success', 'failed', 'abandoned', ...
  reference: string
  amount: number // kobo
  currency: string
  metadata?: { order_id?: string } | string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.status !== true) {
    console.error('Paystack error', res.status, body)
    throw new PaymentError(body.message ? `Paystack: ${body.message}` : 'Paystack could not be reached. Please try again.', 502)
  }
  return body.data as T
}

async function loadOrder(orderId: string): Promise<OrderJson | null> {
  const { data, error } = await admin.rpc('order_json', { p_order_id: orderId })
  if (error) throw new Error(`Database error: ${error.message}`)
  return (data as OrderJson | null) ?? null
}

/** The signed-in customer, if the request carries their login (otherwise null = guest). */
async function callerUserId(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  return error ? null : (data.user?.id ?? null)
}

/** Only the customer who placed the order (or the same guest browser) may pay for or check it. */
async function orderForCaller(req: Request, orderId: unknown, guestId: unknown): Promise<OrderJson> {
  if (typeof orderId !== 'string' || !orderId) throw new PaymentError('Missing order number.')
  const order = await loadOrder(orderId)
  const userId = await callerUserId(req)
  const isOwner =
    !!order &&
    ((order.userId !== null && order.userId === userId) ||
      (order.userId === null && typeof guestId === 'string' && guestId.length >= 8 && order.guestId === guestId))
  if (!order || !isOwner) throw new PaymentError('We couldn’t find that order.', 404)
  return order
}

const orderIdFromMetadata = (tx: PaystackTransaction): string | undefined => {
  const meta = typeof tx.metadata === 'string' ? safeParse(tx.metadata) : tx.metadata
  return meta?.order_id
}
const safeParse = (s: string) => {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

/**
 * Marks the order paid ONLY if Paystack says the payment succeeded, in Naira,
 * for exactly the order total, with a reference created for this order.
 */
async function finalize(tx: PaystackTransaction): Promise<OrderJson | null> {
  if (tx.status !== 'success') return null
  const orderId = orderIdFromMetadata(tx)
  if (!orderId || !tx.reference.startsWith(`${orderId}-`)) {
    console.error('Payment does not belong to a Confam order', tx.reference)
    return null
  }
  const order = await loadOrder(orderId)
  if (!order) return null
  if (order.paymentStatus === 'paid') return order
  if (tx.currency !== 'NGN' || tx.amount !== order.total * 100) {
    console.error('Amount/currency mismatch', { orderId, paid: tx.amount, currency: tx.currency, expected: order.total * 100 })
    return null
  }
  const { data, error } = await admin.rpc('mark_order_paid', {
    p_order_id: orderId,
    p_reference: tx.reference,
    p_amount_kobo: tx.amount,
  })
  if (error) throw new Error(`Database error: ${error.message}`)
  // Next step: send the Mailgun confirmation email here.
  return data as OrderJson
}

/** Constant-time check of Paystack's HMAC-SHA512 webhook signature. */
async function validSignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secretKey), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const expected = Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, '0')).join('')
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
async function initialize(req: Request, body: Record<string, unknown>) {
  if (!siteUrl) throw new PaymentError('Payments aren’t fully set up yet (SITE_URL is missing).', 500)
  const order = await orderForCaller(req, body.orderId, body.guestId)
  if (order.paymentStatus === 'paid') return { alreadyPaid: true }
  if (order.paymentStatus !== 'pending') throw new PaymentError('This order can’t be paid online. Please contact us.')

  // A fresh reference each attempt, so a customer can retry after closing the payment page.
  const reference = `${order.id}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
  const orderPage = `${siteUrl}/order/${encodeURIComponent(order.id)}`
  const tx = await paystack<{ authorization_url: string; reference: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: order.customer.email,
      amount: order.total * 100, // kobo
      currency: 'NGN',
      reference,
      callback_url: orderPage,
      metadata: { order_id: order.id, cancel_action: orderPage },
    }),
  })
  const { error } = await admin.rpc('set_payment_reference', { p_order_id: order.id, p_reference: reference })
  if (error) throw new Error(`Database error: ${error.message}`)
  return { url: tx.authorization_url, reference }
}

async function verify(req: Request, body: Record<string, unknown>) {
  const order = await orderForCaller(req, body.orderId, body.guestId)
  if (order.paymentStatus === 'paid') return { paid: true, order }
  const reference = typeof body.reference === 'string' ? body.reference : order.paymentReference
  if (!reference || !reference.startsWith(`${order.id}-`)) return { paid: false, message: 'No payment was found for this order yet.' }
  const tx = await paystack<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`)
  const paidOrder = await finalize(tx)
  if (paidOrder) return { paid: true, order: paidOrder }
  const message =
    tx.status === 'abandoned' || tx.status === 'ongoing' || tx.status === 'pending'
      ? 'Your payment wasn’t completed. You haven’t been charged — you can try again.'
      : tx.status === 'failed'
        ? 'Your payment didn’t go through. You can try again with another card or method.'
        : 'We couldn’t confirm this payment. If you were charged, please contact us with your order number.'
  return { paid: false, status: tx.status, message }
}

async function webhook(req: Request) {
  const raw = await req.text()
  if (!(await validSignature(raw, req.headers.get('x-paystack-signature')))) {
    return new Response('Invalid signature', { status: 401 })
  }
  const event = safeParse(raw) as { event?: string; data?: PaystackTransaction } | null
  if (event?.event === 'charge.success' && event.data?.reference) {
    // Double-check with Paystack rather than trusting the notice's contents.
    const tx = await paystack<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(event.data.reference)}`)
    await finalize(tx)
  }
  return new Response('ok', { status: 200 })
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!secretKey) return json({ error: 'Payments aren’t fully set up yet (PAYSTACK_SECRET_KEY is missing).' }, 500)

  try {
    if (new URL(req.url).pathname.endsWith('/webhook')) return await webhook(req)
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    if (body.action === 'initialize') return json(await initialize(req, body))
    if (body.action === 'verify') return json(await verify(req, body))
    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    if (err instanceof PaymentError) return json({ error: err.message }, err.status)
    console.error(err)
    return json({ error: 'Something went wrong with the payment. Please try again.' }, 500)
  }
})
