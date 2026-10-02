// Test for supabase/functions/paystack/index.ts against a THROWAWAY local PostgreSQL
// (never your live project) with fake Supabase auth and a fake Paystack.
//
// 1. Create a local database and run, in order: tests/local-supabase-stub.sql,
//    migrations/0001_schema.sql, 0002_payments.sql, 0003_confirmation_emails.sql, seed.sql
// 2. node --experimental-strip-types --no-warnings --import ./supabase/tests/node-deno-shim.mjs supabase/tests/paystack-function.test.mjs
//    (connection via PGHOST / PGPORT / PGUSER / PGDATABASE; defaults: localhost 5432 postgres confam)
import { execFileSync } from 'node:child_process'
import { createHmac } from 'node:crypto'

const env = process.env
const PG = ['-h', env.PGHOST || 'localhost', '-p', env.PGPORT || '5432', '-U', env.PGUSER || 'postgres', '-d', env.PGDATABASE || 'confam', '-At', '-v', 'ON_ERROR_STOP=1']
const sql = (q) => execFileSync('psql', [...PG, '-c', q], { encoding: 'utf8' }).trim()
const lit = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)

const SUPABASE_URL = 'https://proj.supabase.co'
const SECRET = 'sk_test_unit_secret'
const SITE = 'https://hng-shop-gamma.vercel.app'
const USERS = { 'tok-ada': '00000000-0000-0000-0000-0000000000a1', 'tok-bayo': '00000000-0000-0000-0000-0000000000b2' }
let failures = 0
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failures++ }

// ---- fake Paystack state ----
const paystack = { initialized: [], tx: {} } // tx[reference] = { status, amount, currency }
// ---- fake Mailgun ----
const mailgun = { sent: [], failNext: 0, auth: [] }

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url
  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers || {})
  const reply = (status, body) => new Response(body === undefined ? '' : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  // Supabase PostgREST rpc → run the real SQL function as service_role
  if (url.startsWith(`${SUPABASE_URL}/rest/v1/rpc/`)) {
    const fn = url.split('/rpc/')[1].split('?')[0]
    const args = JSON.parse(init.body || '{}')
    const call = `public.${fn}(${Object.entries(args).map(([k, v]) => `${k} => ${lit(v)}`).join(', ')})`
    try {
      const out = sql(`set role service_role; select coalesce(to_jsonb(${call})::text, 'null')`)
      return reply(200, JSON.parse(out.split('\n').pop()))
    } catch (e) {
      return reply(400, { message: String(e.stderr || e.message).replace(/^.*ERROR:\s*/s, '').split('\n')[0], code: 'P0001' })
    }
  }
  // Supabase Auth: who owns this token?
  if (url.startsWith(`${SUPABASE_URL}/auth/v1/user`)) {
    const token = (headers.get('authorization') || '').replace(/^Bearer /, '')
    return USERS[token] ? reply(200, { id: USERS[token], aud: 'authenticated', role: 'authenticated' }) : reply(401, { msg: 'invalid JWT', code: 401 })
  }
  // Mailgun
  if (url.startsWith('https://api.mailgun.net/v3/')) {
    mailgun.auth.push(headers.get('authorization'))
    if (mailgun.failNext > 0) { mailgun.failNext--; return reply(500, { message: 'Mailgun is down' }) }
    const f = init.body
    mailgun.sent.push({ domain: url.split('/v3/')[1].split('/')[0], from: f.get('from'), to: f.get('to'), subject: f.get('subject'), text: f.get('text'), html: f.get('html') })
    return reply(200, { id: '<test@mailgun>', message: 'Queued. Thank you.' })
  }
  // Paystack
  if (url.startsWith('https://api.paystack.co/')) {
    if (headers.get('authorization') !== `Bearer ${SECRET}`) return reply(401, { status: false, message: 'Invalid key' })
    if (url.endsWith('/transaction/initialize') && method === 'POST') {
      const b = JSON.parse(init.body)
      paystack.initialized.push(b)
      paystack.tx[b.reference] = { status: 'abandoned', amount: b.amount, currency: b.currency, reference: b.reference, metadata: b.metadata }
      return reply(200, { status: true, data: { authorization_url: `https://checkout.paystack.com/${b.reference}`, reference: b.reference } })
    }
    const m = url.match(/\/transaction\/verify\/(.+)$/)
    if (m) {
      const tx = paystack.tx[decodeURIComponent(m[1])]
      return tx ? reply(200, { status: true, data: tx }) : reply(400, { status: false, message: 'Transaction reference not found' })
    }
  }
  throw new Error('Unexpected fetch ' + method + ' ' + url)
}

// ---- Deno shim + load the real function ----
let handler
globalThis.Deno = {
  env: { get: (k) => ({ PAYSTACK_SECRET_KEY: SECRET, SITE_URL: SITE + '/', SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: 'service-role-key', MAILGUN_API_KEY: 'mg-test-key', MAILGUN_DOMAIN: 'sandbox123.mailgun.org' })[k] },
  serve: (h) => { handler = h },
}
await import(new URL('../functions/paystack/index.ts', import.meta.url).href)

const call = async (body, token) => {
  const res = await handler(new Request(`${SUPABASE_URL}/functions/v1/paystack`, {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : { authorization: 'Bearer sb_publishable_anon' }) },
  }))
  return { status: res.status, body: await res.json() }
}
const webhook = async (payload, signature) => {
  const raw = JSON.stringify(payload)
  const sig = signature ?? createHmac('sha512', SECRET).update(raw).digest('hex')
  const res = await handler(new Request(`${SUPABASE_URL}/functions/v1/paystack/webhook`, { method: 'POST', body: raw, headers: { 'x-paystack-signature': sig } }))
  return res.status
}
const orderRow = (id) => JSON.parse(sql(`select row_to_json(o) from orders o where id = ${lit(id)}`))
const stock = (pid) => Number(sql(`select stock_quantity from products where id = ${lit(pid)}`))

// ---- set up: two customers, a signed-in order and a guest order ----
sql(`insert into auth.users (id, email, raw_user_meta_data) values ('${USERS['tok-ada']}', 'ada@example.com', '{"full_name":"Ada Okafor"}'), ('${USERS['tok-bayo']}', 'bayo@example.com', '{}')`)
sql(`insert into cart_items (user_id, product_id, quantity) values ('${USERS['tok-ada']}', 'p-024', 2), ('${USERS['tok-ada']}', 'p-034', 1)`)
const place = (sub, guest) => JSON.parse(sql(`${sub ? `set role authenticated; set request.jwt.claim.sub = '${sub}';` : "set role anon; set request.jwt.claim.sub = '';"}
  select place_order('{"firstName":"Ada","lastName":"<b>Okafor</b>","email":"ada@example.com","phone":"0801"}','{"address":"5 Awolowo Road","city":"Lagos","state":"Lagos","country":"Nigeria"}','[{"productId":"p-024","quantity":2}]', ${lit(guest)})::text`).split('\n').pop())
const userOrder = place(USERS['tok-ada'])
const guestOrder = place(null, 'g_guestbrowser01')
const stock0 = stock('p-024')
console.log(`   user order ${userOrder.id} total ₦${userOrder.total}; guest order ${guestOrder.id}; whey stock ${stock0}`)

// 1. Starting a payment
let r = await call({ action: 'initialize', orderId: userOrder.id }, 'tok-ada')
ok(r.status === 200 && r.body.url.startsWith('https://checkout.paystack.com/'), 'owner can start a payment → Paystack page URL')
const init1 = paystack.initialized.at(-1)
ok(init1.amount === userOrder.total * 100 && init1.currency === 'NGN', `amount sent to Paystack is the DATABASE total in kobo (${init1.amount})`)
ok(init1.email === 'ada@example.com' && init1.callback_url === `${SITE}/order/${userOrder.id}`, 'customer email + return address (trailing slash in SITE_URL handled)')
ok(orderRow(userOrder.id).payment_reference === r.body.reference && r.body.reference.startsWith(userOrder.id + '-'), 'payment reference saved on the order')
ok((await call({ action: 'initialize', orderId: userOrder.id }, 'tok-bayo')).status === 404, 'another customer cannot start payment for Ada’s order')
ok((await call({ action: 'initialize', orderId: userOrder.id })).status === 404, 'a guest cannot start payment for Ada’s order')
ok((await call({ action: 'initialize', orderId: guestOrder.id, guestId: 'g_guestbrowser01' })).status === 200, 'guest can pay for their own order (same browser)')
ok((await call({ action: 'initialize', orderId: guestOrder.id, guestId: 'g_otherbrowser9' })).status === 404, 'a different browser cannot pay for/inspect the guest order')
ok((await call({ action: 'initialize', orderId: 'FH-NOPE' }, 'tok-ada')).status === 404, 'unknown order → not found')

// 2. Customer closes the Paystack page without paying
r = await call({ action: 'verify', orderId: userOrder.id, reference: init1.reference }, 'tok-ada')
ok(r.body.paid === false && /wasn’t completed/.test(r.body.message), 'abandoned payment → not paid, friendly message')
ok(orderRow(userOrder.id).payment_status === 'pending', 'order stays pending')

// 3. Tampered amount: Paystack reports less than the total
paystack.tx[init1.reference] = { ...paystack.tx[init1.reference], status: 'success', amount: 100 }
r = await call({ action: 'verify', orderId: userOrder.id, reference: init1.reference }, 'tok-ada')
ok(r.body.paid === false && orderRow(userOrder.id).payment_status === 'pending', 'successful payment of the WRONG amount does not mark the order paid')

// 4. Wrong currency
paystack.tx[init1.reference] = { ...paystack.tx[init1.reference], amount: userOrder.total * 100, currency: 'USD' }
r = await call({ action: 'verify', orderId: userOrder.id, reference: init1.reference }, 'tok-ada')
ok(r.body.paid === false && orderRow(userOrder.id).payment_status === 'pending', 'payment in the wrong currency is rejected')

// 5. Using another order’s payment reference
const guestRef = paystack.initialized.at(-1).reference // guest order's reference (from the guest initialize above)
paystack.tx[guestRef].status = 'success'
r = await call({ action: 'verify', orderId: userOrder.id, reference: guestRef }, 'tok-ada')
ok(r.body.paid === false && orderRow(userOrder.id).payment_status === 'pending', 'a payment for a different order cannot pay this one')
paystack.tx[guestRef].status = 'abandoned'

// 6. Real success
paystack.tx[init1.reference] = { ...paystack.tx[init1.reference], currency: 'NGN', status: 'success' }
r = await call({ action: 'verify', orderId: userOrder.id, reference: init1.reference }, 'tok-ada')
const row = orderRow(userOrder.id)
ok(r.body.paid === true && r.body.order.paymentStatus === 'paid', 'verified payment → order marked PAID')
ok(row.order_status === 'processing' && row.paid_at !== null, 'order moves to processing, paid time recorded')
ok(stock('p-024') === stock0 - 2, `stock reduced by the quantity bought (${stock0} → ${stock('p-024')})`)
ok(Number(sql(`select count(*) from cart_items where user_id = '${USERS['tok-ada']}' and product_id = 'p-024'`)) === 0
   && Number(sql(`select count(*) from cart_items where user_id = '${USERS['tok-ada']}' and product_id = 'p-034'`)) === 1, 'bought item removed from saved cart; other cart items kept')

// 6b. Confirmation email
ok(mailgun.sent.length === 1, 'exactly one confirmation email sent after payment')
const mail = mailgun.sent[0]
ok(mail.to.includes('ada@example.com') && mail.domain === 'sandbox123.mailgun.org' && mail.from === 'Fit Heiress NG <orders@sandbox123.mailgun.org>', 'email goes to the customer, from the Mailgun domain')
ok(mail.subject === `Your Fit Heiress NG order ${userOrder.id} is confirmed`, 'subject names the order: ' + mail.subject)
ok(mail.text.includes('Momentous Essential Grass-Fed Whey (24 servings) x 2') && mail.text.includes('₦196,000') && mail.text.includes('5 Awolowo Road'), 'email lists items, total paid (₦196,000) and delivery address')
ok(mail.text.includes(`https://hng-shop-gamma.vercel.app/order/${userOrder.id}`), 'email links to the order page')
ok(mail.html.includes('&lt;b&gt;Okafor&lt;/b&gt;') && !mail.html.includes('<b>Okafor</b>'), 'customer-typed text is escaped in the HTML email')
ok(mailgun.auth[0] === 'Basic ' + Buffer.from('api:mg-test-key').toString('base64'), 'Mailgun called with the API key (server side only)')
ok(r.body.order.confirmationEmailSentAt && orderRow(userOrder.id).confirmation_email_sent_at !== null, 'order records when the email was sent')

// 7. Same confirmation again (browser refresh + webhook)
r = await call({ action: 'verify', orderId: userOrder.id, reference: init1.reference }, 'tok-ada')
ok(r.body.paid === true && stock('p-024') === stock0 - 2, 'confirming twice is safe: stock not reduced twice')
ok((await webhook({ event: 'charge.success', data: { reference: init1.reference } })) === 200 && stock('p-024') === stock0 - 2, 'webhook after the browser already confirmed: still no double reduction')
ok((await call({ action: 'initialize', orderId: userOrder.id }, 'tok-ada')).body.alreadyPaid === true, 'paid order cannot be paid again')
ok(mailgun.sent.length === 1, 'refresh + webhook did NOT send a second email')

// 8. Webhook security + webhook-only confirmation (customer closed the browser)
const stockBefore = stock('p-024')
ok((await webhook({ event: 'charge.success', data: { reference: guestRef } }, 'bad-signature')) === 401, 'webhook with a forged signature is rejected')
paystack.tx[guestRef].status = 'success'
ok((await webhook({ event: 'charge.success', data: { reference: guestRef } }, 'a'.repeat(128))) === 401, 'webhook with a wrong (but well-formed) signature is rejected')
ok(orderRow(guestOrder.id).payment_status === 'pending', 'forged webhooks change nothing')
mailgun.failNext = 1 // Mailgun is down for this one
ok((await webhook({ event: 'charge.success', data: { reference: guestRef } })) === 200 && orderRow(guestOrder.id).payment_status === 'paid', 'genuine signed webhook marks the guest order paid (even with no browser return)')
ok(mailgun.sent.length === 1 && orderRow(guestOrder.id).confirmation_email_sent_at === null, 'Mailgun down: payment still succeeds; email not marked as sent')
r = await call({ action: 'verify', orderId: guestOrder.id, guestId: 'g_guestbrowser01' })
ok(r.body.paid === true && mailgun.sent.length === 2 && orderRow(guestOrder.id).confirmation_email_sent_at !== null, 'next confirmation retries and sends the email')
ok((await webhook({ event: 'charge.success', data: { reference: guestRef } })) === 200 && mailgun.sent.length === 2, 'and never sends it twice')
ok(stock('p-024') === stockBefore - 2, 'stock reduced for the webhook-confirmed order')
paystack.tx['fake-ref'] = { status: 'success', amount: 1, currency: 'NGN', reference: 'fake-ref', metadata: { order_id: guestOrder.id } }
ok((await webhook({ event: 'charge.success', data: { reference: 'fake-ref' } })) === 200, 'signed webhook for an unrelated reference is ignored safely')

// 9. The website itself can never mark orders paid
let blocked = 0
for (const role of ['anon', 'authenticated']) {
  for (const q of [`select mark_order_paid('${guestOrder.id}', 'x', 1)`, `select set_payment_reference('${guestOrder.id}', 'x')`, `select claim_confirmation_email('${guestOrder.id}')`, `select release_confirmation_email('${guestOrder.id}')`]) {
    try { sql(`set role ${role}; ${q}`) } catch (e) { if (/permission denied/.test(String(e.stderr))) blocked++ }
  }
}
ok(blocked === 8, 'guests and customers get "permission denied" for mark_order_paid, set_payment_reference and the email functions')

// 10. Bad requests
ok((await call({ action: 'nope' }, 'tok-ada')).status === 400, 'unknown action → 400')
ok((await handler(new Request(`${SUPABASE_URL}/functions/v1/paystack`, { method: 'GET' }))).status === 405, 'GET → 405')
ok((await handler(new Request(`${SUPABASE_URL}/functions/v1/paystack`, { method: 'OPTIONS' }))).status === 200, 'browser pre-flight (CORS) → 200')

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED')
process.exit(failures ? 1 : 0)
