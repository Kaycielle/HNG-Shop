-- =============================================================================
-- Fit Heiress NG — switch the shop over from the old phone catalogue
--
-- Run ONCE, in your Supabase SQL Editor, BEFORE the new supabase/seed.sql:
--   1. New query → paste this file → Run
--   2. New query → paste supabase/seed.sql → Run
--
-- What it does:
--   • New order numbers start with FH- (Fit Heiress) instead of CN-.
--   • Deletes the TEST orders, saved carts and the old catalogue (phones,
--     gadgets, accessories) so the new products can be loaded cleanly.
--   • Keeps customer accounts and profiles (they can still sign in).
--
-- ⚠️ This permanently deletes all orders. That's fine now (they're test orders)
--    but do NOT run this file again once real customers have ordered.
-- =============================================================================

begin;

-- 1. Order numbers: FH-YYYYMMDD-XXXXXX
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

-- 2. Clear test orders, carts and the old catalogue (children first).
delete from public.order_items;
delete from public.orders;
delete from public.cart_items;
delete from public.products;
delete from public.product_types;
delete from public.brands;
delete from public.categories;

commit;
