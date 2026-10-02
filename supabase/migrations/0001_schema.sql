-- =============================================================================
-- Fit Heiress NG — database schema for Supabase (PostgreSQL)
--
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste this whole file → Run. Then run supabase/seed.sql to add the products.
-- It is safe to run again: everything uses "if not exists" / "or replace".
--
-- Security model (Row Level Security):
--   • Anyone may READ the catalogue (brands, categories, types, active products).
--     Nobody can change it from the website — only you, from the dashboard.
--   • A signed-in customer can read/write ONLY their own profile and cart.
--   • Orders are created ONLY through the place_order() function, which looks
--     up real prices and stock in the database and calculates every total
--     itself. Prices sent by a browser are never trusted.
--   • New orders are always 'pending' / 'pending'. Only a trusted server using
--     the service-role key (the payment webhook, coming next) may mark an
--     order paid. The website has no permission to do that.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          text primary key,
  name        text not null,
  description text not null default '',
  sort_order  int  not null default 0
);
alter table public.categories enable row level security;

create table if not exists public.product_types (
  id          text primary key,
  name        text not null,
  category_id text not null references public.categories (id),
  sort_order  int  not null default 0
);
alter table public.product_types enable row level security;

create table if not exists public.brands (
  id         text primary key,
  name       text not null,
  tagline    text not null default '',
  sort_order int  not null default 0
);
alter table public.brands enable row level security;

create table if not exists public.products (
  id                text primary key,
  slug              text not null unique,
  name              text not null,
  short_description text not null default '',
  description       text not null default '',
  price             integer not null check (price >= 0),            -- whole Naira
  discount_percent  integer check (discount_percent between 1 and 90),
  image             text not null default '',                      -- path inside the site, e.g. images/products/x.svg
  category_id       text not null references public.categories (id),
  brand_id          text not null references public.brands (id),
  type_id           text not null references public.product_types (id),
  stock_quantity    integer not null default 0 check (stock_quantity >= 0),
  rating            numeric(2, 1) check (rating between 0 and 5),
  rating_count      integer check (rating_count >= 0),
  featured          boolean not null default false,
  specs             jsonb not null default '[]'::jsonb,             -- [{ "label": "...", "value": "..." }]
  active            boolean not null default true,                 -- false hides it from the shop
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.products enable row level security;

create index if not exists products_brand_idx on public.products (brand_id);
create index if not exists products_type_idx  on public.products (type_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
-- One profile per account (auth.users is managed by Supabase Auth).
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  email      text not null default '',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Create the profile automatically when someone signs up (email or Google).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''),
             nullif(new.raw_user_meta_data ->> 'name', ''),
             split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Each row is one product in a signed-in customer's cart.
create table if not exists public.cart_items (
  user_id    uuid not null references auth.users (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  quantity   integer not null check (quantity between 1 and 10),
  added_at   timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.cart_items enable row level security;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                text primary key,                  -- e.g. FH-20261001-7F3A9C
  user_id           uuid references auth.users (id) on delete set null,
  guest_id          text,                              -- set for guest checkouts
  first_name        text not null,
  last_name         text not null,
  email             text not null,
  phone             text not null,
  address           text not null,
  city              text not null,
  state             text not null,
  country           text not null,
  postal_code       text not null default '',
  subtotal          integer not null check (subtotal >= 0),
  shipping          integer not null check (shipping >= 0),
  total             integer not null check (total >= 0),
  currency          text not null default 'NGN',
  payment_status    text not null default 'pending'
                    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  order_status      text not null default 'pending'
                    check (order_status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_reference text,
  created_at        timestamptz not null default now(),
  check (user_id is not null or guest_id is not null)
);
alter table public.orders enable row level security;

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

-- A snapshot of each product at the moment of ordering.
create table if not exists public.order_items (
  order_id     text not null references public.orders (id) on delete cascade,
  product_id   text not null references public.products (id),
  product_name text not null,
  image        text not null default '',
  unit_price   integer not null check (unit_price >= 0),
  quantity     integer not null check (quantity between 1 and 10),
  line_total   integer not null check (line_total >= 0),
  primary key (order_id, product_id)
);
alter table public.order_items enable row level security;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- (Row Level Security is switched on right after each table is created, above.)

-- Catalogue: read-only for everyone.
drop policy if exists "catalogue: anyone can read categories" on public.categories;
create policy "catalogue: anyone can read categories" on public.categories for select using (true);
drop policy if exists "catalogue: anyone can read types" on public.product_types;
create policy "catalogue: anyone can read types" on public.product_types for select using (true);
drop policy if exists "catalogue: anyone can read brands" on public.brands;
create policy "catalogue: anyone can read brands" on public.brands for select using (true);
drop policy if exists "catalogue: anyone can read active products" on public.products;
create policy "catalogue: anyone can read active products" on public.products for select using (active);

-- Profiles: your own only.
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Cart: your own only, full control.
drop policy if exists "cart: read own" on public.cart_items;
create policy "cart: read own" on public.cart_items for select using (user_id = auth.uid());
drop policy if exists "cart: add own" on public.cart_items;
create policy "cart: add own" on public.cart_items for insert with check (user_id = auth.uid());
drop policy if exists "cart: change own" on public.cart_items;
create policy "cart: change own" on public.cart_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "cart: remove own" on public.cart_items;
create policy "cart: remove own" on public.cart_items for delete using (user_id = auth.uid());

-- Orders: read your own. No insert/update/delete policies on purpose —
-- orders are created by place_order() and updated only by the server.
drop policy if exists "orders: read own" on public.orders;
create policy "orders: read own" on public.orders for select using (user_id = auth.uid());
drop policy if exists "order items: read own" on public.order_items;
create policy "order items: read own" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Order functions (the only way the website creates or reads orders)
-- ---------------------------------------------------------------------------

-- Internal: one order as JSON in the shape the app uses. Not callable by the website.
create or replace function public.order_json(p_order_id text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id,
    'userId', o.user_id,
    'guestId', o.guest_id,
    'customer', jsonb_build_object('firstName', o.first_name, 'lastName', o.last_name, 'email', o.email, 'phone', o.phone),
    'delivery', jsonb_build_object('address', o.address, 'city', o.city, 'state', o.state, 'country', o.country, 'postalCode', o.postal_code),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', i.product_id, 'productName', i.product_name, 'image', i.image,
        'unitPrice', i.unit_price, 'quantity', i.quantity, 'lineTotal', i.line_total
      ) order by i.product_name)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb),
    'subtotal', o.subtotal,
    'shipping', o.shipping,
    'total', o.total,
    'currency', o.currency,
    'paymentStatus', o.payment_status,
    'orderStatus', o.order_status,
    'paymentReference', o.payment_reference,
    'createdAt', o.created_at
  )
  from public.orders o where o.id = p_order_id
$$;

-- Places an order. The browser sends WHAT it wants (product IDs + quantities)
-- and the customer's details; the database decides HOW MUCH it costs.
create or replace function public.place_order(
  p_customer jsonb,
  p_delivery jsonb,
  p_items    jsonb,
  p_guest_id text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_order_id text;
  v_subtotal integer := 0;
  v_shipping integer;
  v_item     record;
  v_product  public.products%rowtype;
  v_unit     integer;
  v_count    integer;
  -- Keep these in step with src/config.ts (shippingFlatRate, freeShippingThreshold).
  c_flat_rate      constant integer := 3500;
  c_free_threshold constant integer := 100000;
begin
  -- Who is ordering?
  if v_uid is null and coalesce(length(trim(p_guest_id)), 0) not between 8 and 64 then
    raise exception 'Please sign in or try again.' using errcode = 'P0001';
  end if;

  -- Required customer and delivery details.
  if coalesce(trim(p_customer ->> 'firstName'), '') = '' or coalesce(trim(p_customer ->> 'lastName'), '') = ''
     or coalesce(trim(p_customer ->> 'phone'), '') = ''
     or coalesce(trim(p_customer ->> 'email'), '') !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'Please check your name, email and phone number.' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_delivery ->> 'address'), '') = '' or coalesce(trim(p_delivery ->> 'city'), '') = ''
     or coalesce(trim(p_delivery ->> 'state'), '') = '' or coalesce(trim(p_delivery ->> 'country'), '') = '' then
    raise exception 'Please check your delivery address.' using errcode = 'P0001';
  end if;

  -- Items: a non-empty list of distinct products, 1–10 of each.
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Too many different items in one order.' using errcode = 'P0001';
  end if;
  select count(distinct x ->> 'productId') into v_count from jsonb_array_elements(p_items) x;
  if v_count <> jsonb_array_length(p_items) then
    raise exception 'Each product should appear once in the order.' using errcode = 'P0001';
  end if;

  v_order_id := 'FH-' || to_char(now() at time zone 'Africa/Lagos', 'YYYYMMDD') || '-'
                || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into public.orders (
    id, user_id, guest_id, first_name, last_name, email, phone,
    address, city, state, country, postal_code, subtotal, shipping, total
  ) values (
    v_order_id, v_uid, case when v_uid is null then trim(p_guest_id) end,
    left(trim(p_customer ->> 'firstName'), 80), left(trim(p_customer ->> 'lastName'), 80),
    lower(left(trim(p_customer ->> 'email'), 200)), left(trim(p_customer ->> 'phone'), 30),
    left(trim(p_delivery ->> 'address'), 300), left(trim(p_delivery ->> 'city'), 100),
    left(trim(p_delivery ->> 'state'), 100), left(trim(p_delivery ->> 'country'), 100),
    left(trim(coalesce(p_delivery ->> 'postalCode', '')), 20),
    0, 0, 0
  );

  for v_item in
    select x ->> 'productId' as product_id, (x ->> 'quantity')::int as quantity
    from jsonb_array_elements(p_items) x
  loop
    if v_item.quantity is null or v_item.quantity not between 1 and 10 then
      raise exception 'Quantities must be between 1 and 10.' using errcode = 'P0001';
    end if;

    select * into v_product from public.products where id = v_item.product_id and active;
    if not found then
      raise exception 'A product in your cart is no longer available.' using errcode = 'P0001';
    end if;
    if v_product.stock_quantity < v_item.quantity then
      raise exception '"%" is out of stock or has fewer than % left.', v_product.name, v_item.quantity using errcode = 'P0001';
    end if;

    v_unit := round(v_product.price * (100 - coalesce(v_product.discount_percent, 0)) / 100.0);
    insert into public.order_items (order_id, product_id, product_name, image, unit_price, quantity, line_total)
    values (v_order_id, v_product.id, v_product.name, v_product.image, v_unit, v_item.quantity, v_unit * v_item.quantity);
    v_subtotal := v_subtotal + v_unit * v_item.quantity;
  end loop;

  v_shipping := case when v_subtotal >= c_free_threshold then 0 else c_flat_rate end;
  update public.orders
     set subtotal = v_subtotal, shipping = v_shipping, total = v_subtotal + v_shipping
   where id = v_order_id;

  -- Stock is NOT reduced here: the order isn't paid yet. The payment step
  -- will reduce stock once payment is verified.
  return public.order_json(v_order_id);
end $$;

-- One order: yours if signed in, or a guest order placed from this browser.
create or replace function public.get_order(p_order_id text, p_guest_id text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select public.order_json(o.id)
  from public.orders o
  where o.id = p_order_id
    and ((auth.uid() is not null and o.user_id = auth.uid())
         or (p_guest_id is not null and length(p_guest_id) >= 8 and o.guest_id = p_guest_id))
$$;

-- All of the signed-in customer's orders, newest first.
create or replace function public.my_orders()
returns setof jsonb language sql stable security definer set search_path = public as $$
  select public.order_json(o.id)
  from public.orders o
  where auth.uid() is not null and o.user_id = auth.uid()
  order by o.created_at desc
$$;

-- Lock down who can call what.
revoke all on function public.order_json(text) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, jsonb, text) to anon, authenticated;
grant execute on function public.get_order(text, text) to anon, authenticated;
revoke all on function public.my_orders() from public, anon;
grant execute on function public.my_orders() to authenticated;
