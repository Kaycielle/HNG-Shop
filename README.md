# Confam NG — HNG E-Commerce (Phase 1)

Confam NG sells original phones, gadgets and accessories. This is a responsive online shop built with **React + TypeScript + Vite**. Phase 1 covers the full
shopping and checkout experience. Database, Google sign-in, payments and email are prepared
for, but **not connected yet**.

## Run it

```bash
npm install      # first time only
npm run dev      # then open http://localhost:5173
npm run build    # type-check + production build
```

## Project structure

```
src/
  models/          Data shapes: Product, Cart, Order, User (match future DB tables)
  data/            mockProducts.ts — TEMPORARY sample catalogue (fictional brands) (deleted in Phase 2)
  services/        One folder per integration — the only code that changes in Phase 2
    product/         ProductService   (mock data → database)
    cart/            CartService rules + CartRepository (browser storage → database)
    order/           OrderService + OrderRepository (browser storage → database)
    checkout/        Runs the checkout steps in order
    payment/         PaymentService   (not configured → real gateway)
    auth/            AuthService      (demo accounts now → Supabase + Google sign-in)
    email/           Email content builder (sent from a server via Mailgun in Phase 2)
    devStorage.ts    TEMPORARY localStorage helper (development only)
  context/         AuthContext (who is shopping) and CartContext (their cart)
  components/      Reusable UI: header, footer, product card, quantity selector…
  pages/           Home, Shop, Product, Cart, Checkout, Order confirmation, 404
  utils/           Price formatting, form validation, small hooks
  styles/          global.css (design tokens at the top)
public/images/     Product illustrations (replace with real photos any time)
```

## What is mock / temporary in Phase 1

| Area     | Phase 1                                    | Phase 2                                   |
|----------|--------------------------------------------|-------------------------------------------|
| Products | `src/data/mockProducts.ts`                 | Supabase/Neon `products` table            |
| Cart     | Browser localStorage, per guest ID         | Database, per signed-in user              |
| Orders   | Browser localStorage                       | Created & verified on the server          |
| Accounts | Demo accounts saved in this browser only   | Supabase Auth: email/password + Google    |
| Payment  | Not connected — orders stay *Awaiting payment* | Real gateway + server-side verification |
| Email    | Nothing is sent                            | Mailgun, sent by the server after payment |

## Brands and accounts

- **Brands:** every product has a brand (`brandId`) and an item type (`typeId`, e.g. Power banks).
  `/brands` and the top of **Shop all** show each brand with the types it carries;
  `/brand/:brandId` groups that brand's products by type (`?type=` narrows it).
- **Accounts:** `/account/register`, `/account/sign-in` and `/account` (details, saved cart, orders).
  A guest's cart moves into their account when they sign in; signing out keeps it saved.
  In Phase 1 accounts are **demo-only** (this browser only, passwords salted + PBKDF2-hashed).
  Swap `demoAuthService` for Supabase in `src/services/auth/authService.ts` for real accounts.

## Security notes

- No API keys are in the code. See `.env.example`; real values go in `.env.local` (git-ignored).
- Anything prefixed `VITE_` is visible to the public. **Secret** keys (payment secret key,
  Mailgun key, database service key) must only ever live on a server.
- An order is never marked *Paid* by the browser. Only the server, after verifying with the
  payment gateway, may do that.
