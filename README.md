# Confam NG — HNG E-Commerce

Confam NG sells original phones, gadgets and accessories. A responsive online shop built with
**React + TypeScript + Vite**, with **Supabase** for the database and customer accounts.

## Run it

```bash
npm install      # first time only
npm run dev      # then open http://localhost:5173
npm run build    # type-check + production build
npm run db:seed  # regenerate supabase/seed.sql from the sample catalogue
```

## Project structure

```
src/
  models/          Data shapes: Product, Brand, Cart, Order, User (match the database tables)
  data/            mockProducts.ts — sample catalogue (used when Supabase isn't connected; source of seed.sql)
  services/        One folder per integration
    supabase/        The Supabase connection (on only when .env.local has the keys)
    product/         ProductService + catalogSource (database or sample data)
    cart/            Cart rules + CartRepository (database for signed-in customers, browser for guests)
    order/           OrderRepository (database place_order() function, or browser)
    checkout/        Runs the checkout steps in order
    auth/            AuthService: Supabase Auth (email + Google), or demo accounts
    payment/         PaymentService (not connected yet — orders stay "Awaiting payment")
    email/           Email content builder (Mailgun, sent from a server, next step)
  context/         AuthContext (who is shopping) and CartContext (their cart)
  components/      Reusable UI
  pages/           Home, Shop, Brands, Brand, Product, Cart, Checkout, Order, Account, Sign in, Register
  styles/          global.css (design tokens at the top)
supabase/
  migrations/      0001_confam_schema.sql — tables, security rules, order functions
  seed.sql         The catalogue (35 products, 7 brands)
  tests/           Security tests for a local PostgreSQL
public/images/     Product illustrations
```

## Status

| Area     | Supabase connected                              | Not connected (fallback)              |
|----------|-------------------------------------------------|---------------------------------------|
| Products | `products` table                                | `src/data/mockProducts.ts`            |
| Accounts | Supabase Auth: email/password + Google          | Demo accounts, this browser only      |
| Cart     | `cart_items` for signed-in customers; guests in the browser until they sign in | Browser |
| Orders   | `place_order()` — prices set by the database    | Browser                               |
| Payment  | Not connected yet — orders stay *Awaiting payment*; nothing is charged |       |
| Email    | Not connected yet (Mailgun, from a server, after payment is verified) |        |

## Brands and accounts

- **Brands:** every product has a brand (`brandId`) and an item type (`typeId`, e.g. Power banks).
  `/brands` and the top of **Shop all** show each brand with the types it carries;
  `/brand/:brandId` groups that brand's products by type (`?type=` narrows it).
- **Accounts:** `/account/register`, `/account/sign-in` and `/account` (details, saved cart, orders).
  A guest's cart moves into their account when they sign in; signing out keeps it saved.

## Connecting Supabase (database + accounts)

Without Supabase the shop runs on sample data with demo accounts. To make it real:

1. **Create a project** at [supabase.com](https://supabase.com) → *New project* (any name, e.g.
   `confam-ng`; choose a strong database password and the region closest to Nigeria, e.g. *West EU*).
2. **Create the tables.** Dashboard → **SQL Editor** → *New query* → paste the whole of
   `supabase/migrations/0001_confam_schema.sql` → **Run**.
3. **Add the products.** New query → paste `supabase/seed.sql` → **Run**.
   (Changed `src/data/mockProducts.ts`? Run `npm run db:seed` to regenerate it.)
4. **Connect the site.** Dashboard → **Project Settings → API** (or the *Connect* button).
   Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   Restart `npm run dev`. The "Demo accounts" notice on the sign-in page disappears when connected.
5. **Tell Supabase where the site lives.** Dashboard → **Authentication → URL Configuration**:
   - *Site URL*: `http://localhost:5173` (later: your live address)
   - *Redirect URLs*: add `http://localhost:5173/**` (and later `https://your-domain/**`)
6. **Email confirmation** (Authentication → Providers → Email): on by default, so new customers
   click a link in their inbox before signing in. Turn *Confirm email* off while testing if you prefer.

### Google sign-in (optional, after the steps above)

1. [Google Cloud Console](https://console.cloud.google.com) → create a project → **APIs & Services →
   OAuth consent screen** (External; add your app name and email).
2. **Credentials → Create credentials → OAuth client ID** → *Web application*.
   Under **Authorised redirect URIs** add `https://<your-project>.supabase.co/auth/v1/callback`.
3. Copy the **Client ID** and **Client secret** into Supabase → **Authentication → Providers → Google**
   → enable → Save. The *Continue with Google* button then works.

### What's in the database

| Table | What it holds | Who can see / change it |
|---|---|---|
| `categories`, `product_types`, `brands`, `products` | The catalogue | Everyone reads; only you (dashboard) edit |
| `profiles` | Name + email per account (created automatically on sign-up) | Each customer: their own |
| `cart_items` | Signed-in customers' carts | Each customer: their own |
| `orders`, `order_items` | Orders and the items in them | Each customer reads their own; **nobody** can write directly |

Orders are created only by the `place_order()` database function, which takes product IDs and
quantities, looks up real prices and stock, and calculates subtotal, delivery and total itself.
New orders are always *pending*; only a trusted server (the payment step) can mark one paid.
`supabase/tests/` contains the security tests used to check all of this on a local PostgreSQL.

To edit products later: Dashboard → **Table Editor → products** (change prices, stock, or set
`active` to false to hide one). The site picks up changes on the next page load.

## Security notes

- No API keys are in the code. See `.env.example`; real values go in `.env.local` (git-ignored).
- Anything prefixed `VITE_` is visible to the public. **Secret** keys (payment secret key,
  Mailgun key, database service key) must only ever live on a server.
- An order is never marked *Paid* by the browser. Only the server, after verifying with the
  payment gateway, may do that.
