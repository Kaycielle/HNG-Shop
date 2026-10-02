/**
 * Fit Heiress NG — Paystack payments (Supabase Edge Function, runs on Supabase's servers).
 *
 * One function, three jobs:
 *   POST { action: "initialize", orderId, guestId? }  → starts a Paystack payment, returns its page URL
 *   POST { action: "verify", orderId, reference, guestId? } → asks Paystack if it was paid; marks the order paid
 *   POST /paystack/webhook                             → Paystack's signed "charge.success" notice
 *
 * Secrets (Dashboard → Edge Functions → Secrets):
 *   PAYSTACK_SECRET_KEY  sk_test_… (later sk_live_…) — never put this in the website
 *   SITE_URL             your shop's permanent address, e.g. https://hng-shop-gamma.vercel.app
 * Optional — order confirmation emails (Mailgun):
 *   MAILGUN_API_KEY      your Mailgun API key — secret, never put this in the website
 *   MAILGUN_DOMAIN       e.g. sandboxXXXX.mailgun.org (testing) or mg.yourdomain.com
 *   MAILGUN_FROM         optional, e.g. "Fit Heiress NG <orders@mg.yourdomain.com>"
 *   MAILGUN_REGION       optional: "eu" if your Mailgun account is in the EU region
 * Without them, payments still work; no email is sent.
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
  customer: { firstName: string; lastName: string; email: string; phone: string }
  delivery: { address: string; city: string; state: string; country: string; postalCode: string }
  items: { productName: string; unitPrice: number; quantity: number; lineTotal: number }[]
  subtotal: number
  shipping: number
  total: number
  currency: string
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  paymentReference: string | null
  confirmationEmailSentAt?: string | null
  createdAt: string
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
    console.error('Payment does not belong to one of our orders', tx.reference)
    return null
  }
  const order = await loadOrder(orderId)
  if (!order) return null
  if (order.paymentStatus === 'paid') return await withConfirmationEmail(order)
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
  return await withConfirmationEmail(data as OrderJson)
}

// ---------------------------------------------------------------------------
// Order confirmation email (Mailgun)
// ---------------------------------------------------------------------------
const mailgun = {
  apiKey: (Deno.env.get('MAILGUN_API_KEY') ?? '').trim(),
  domain: (Deno.env.get('MAILGUN_DOMAIN') ?? '').trim(),
  from: (Deno.env.get('MAILGUN_FROM') ?? '').trim(),
  region: (Deno.env.get('MAILGUN_REGION') ?? '').trim().toLowerCase(),
}
const storeName = (Deno.env.get('STORE_NAME') ?? 'Fit Heiress NG').trim()
// "Fit Heiress NG" → wordmark "FIT HEIRESS" + tag "NG" (same rule as the website logo).
const nameParts = storeName.split(/\s+/)
const emailTag = nameParts.length > 1 && /^[A-Z]{2,3}$/.test(nameParts[nameParts.length - 1]) ? nameParts[nameParts.length - 1] : ''
const emailWordmark = (emailTag ? nameParts.slice(0, -1).join(' ') : storeName).toUpperCase()
const naira = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)
/** Customer-typed text (names, addresses) must never be able to inject HTML into the email. */
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/**
 * Sends the confirmation email once per paid order. Never throws: a payment
 * must succeed even if email is down. If sending fails, the claim is released
 * so the next confirmation (webhook or page refresh) tries again.
 */
async function withConfirmationEmail(order: OrderJson): Promise<OrderJson> {
  if (order.paymentStatus !== 'paid' || order.confirmationEmailSentAt) return order
  if (!mailgun.apiKey || !mailgun.domain) {
    console.log('Mailgun not configured — skipping confirmation email for', order.id)
    return order
  }
  try {
    const { data: claimed, error } = await admin.rpc('claim_confirmation_email', { p_order_id: order.id })
    if (error) throw new Error(error.message)
    if (!claimed) return order // another request already sent it
    try {
      await sendConfirmationEmail(order)
      return { ...order, confirmationEmailSentAt: new Date().toISOString() }
    } catch (err) {
      console.error('Confirmation email failed for', order.id, err)
      await admin.rpc('release_confirmation_email', { p_order_id: order.id })
      return order
    }
  } catch (err) {
    console.error('Could not record confirmation email for', order.id, err)
    return order
  }
}

export function buildConfirmationEmail(order: OrderJson, site: string) {
  const c = order.customer
  const d = order.delivery
  const orderUrl = site ? `${site}/order/${encodeURIComponent(order.id)}` : ''
  const address = [d.address, `${d.city}, ${d.state}${d.postalCode ? ` ${d.postalCode}` : ''}`, d.country]
  const subject = `Your ${storeName} order ${order.id} is confirmed`

  const text = [
    `Hi ${c.firstName},`,
    '',
    `Thank you for shopping with ${storeName}! We've received your payment and your order is being prepared.`,
    '',
    `Order number: ${order.id}`,
    '',
    ...order.items.map((i) => `- ${i.productName} x ${i.quantity} — ${naira(i.lineTotal)}`),
    '',
    `Subtotal: ${naira(order.subtotal)}`,
    `Delivery: ${order.shipping === 0 ? 'Free' : naira(order.shipping)}`,
    `Total paid: ${naira(order.total)}`,
    '',
    'Delivering to:',
    `${c.firstName} ${c.lastName}`,
    ...address,
    `Phone: ${c.phone}`,
    '',
    ...(orderUrl ? [`View your order: ${orderUrl}`, ''] : []),
    `— The ${storeName} team`,
  ].join('\n')

  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;">${esc(i.productName)}<br><span style="color:#777;font-size:13px;">${i.quantity} × ${esc(naira(i.unitPrice))}</span></td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${esc(naira(i.lineTotal))}</td>
      </tr>`,
    )
    .join('')
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#09090b;padding:20px 28px;color:#fff;font-size:18px;font-weight:bold;letter-spacing:2px;">
        ${esc(emailWordmark)}${emailTag ? ` <span style="color:#ff4d57;font-size:12px;border:1px solid #df2531;border-radius:4px;padding:2px 5px;">${esc(emailTag)}</span>` : ''}
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 8px;font-size:22px;">Thank you, ${esc(c.firstName)}!</h1>
        <p style="margin:0 0 20px;color:#444;line-height:1.5;">We've received your payment and your order is being prepared.</p>
        <p style="margin:0 0 4px;color:#777;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Order number</p>
        <p style="margin:0 0 20px;font-family:monospace;font-size:16px;">${esc(order.id)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}
          <tr><td style="padding:10px 0 2px;color:#555;">Subtotal</td><td style="padding:10px 0 2px;text-align:right;">${esc(naira(order.subtotal))}</td></tr>
          <tr><td style="padding:2px 0;color:#555;">Delivery</td><td style="padding:2px 0;text-align:right;">${order.shipping === 0 ? 'Free' : esc(naira(order.shipping))}</td></tr>
          <tr><td style="padding:10px 0;font-weight:bold;font-size:16px;border-top:1px solid #ddd;">Total paid</td><td style="padding:10px 0;font-weight:bold;font-size:16px;text-align:right;border-top:1px solid #ddd;">${esc(naira(order.total))}</td></tr>
        </table>
        <p style="margin:20px 0 4px;color:#777;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Delivering to</p>
        <p style="margin:0;line-height:1.5;">${esc(`${c.firstName} ${c.lastName}`)}<br>${address.map(esc).join('<br>')}<br>${esc(c.phone)}</p>
        ${orderUrl ? `<p style="margin:28px 0 0;"><a href="${esc(orderUrl)}" style="background:#df2531;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block;">View your order</a></p>` : ''}
      </td></tr>
      <tr><td style="padding:18px 28px;background:#fafafa;color:#888;font-size:12px;">You're receiving this because you placed an order with ${esc(storeName)}.</td></tr>
    </table>
  </td></tr></table></body></html>`

  return { subject, text, html }
}

async function sendConfirmationEmail(order: OrderJson) {
  const { subject, text, html } = buildConfirmationEmail(order, siteUrl)
  const base = mailgun.region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
  const form = new FormData()
  form.append('from', mailgun.from || `${storeName} <orders@${mailgun.domain}>`)
  form.append('to', `${order.customer.firstName} ${order.customer.lastName} <${order.customer.email}>`)
  form.append('subject', subject)
  form.append('text', text)
  form.append('html', html)
  const res = await fetch(`${base}/v3/${encodeURIComponent(mailgun.domain)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`api:${mailgun.apiKey}`)}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Mailgun ${res.status}: ${(await res.text()).slice(0, 300)}`)
  console.log('Confirmation email sent for', order.id)
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
  if (order.paymentStatus === 'paid') return { paid: true, order: await withConfirmationEmail(order) }
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
