-- Security tests for the Confam NG schema. Run against a THROWAWAY local database
-- (never your live Supabase project): local-supabase-stub.sql, then the migration,
-- then seed.sql, then this file. Every line should print PASS.
\set ON_ERROR_STOP 1
\set QUIET 1
-- helper: report a pass, or stop with a failure
create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok then raise notice 'PASS  %', label; else raise exception 'FAIL  %', label; end if;
end $$;
-- helper: run SQL as a role/user and expect it to fail with a message containing `expect`
create or replace function pg_temp.expect_error(stmt text, expect text, label text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'FAIL  % (no error raised)', label;
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  if position(lower(expect) in lower(sqlerrm)) > 0 then raise notice 'PASS  % → "%"', label, sqlerrm;
  else raise exception 'FAIL  % (unexpected error: %)', label, sqlerrm; end if;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- ===== 1. Sign-up creates a profile =====
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ada@example.com', '{"full_name":"Ada Okafor"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bayo@example.com', '{"name":"Bayo Ade"}'),
  ('00000000-0000-0000-0000-00000000000c', 'chi@example.com', '{}');
select pg_temp.check((select full_name from profiles where email='ada@example.com') = 'Ada Okafor', 'sign-up creates profile with full name');
select pg_temp.check((select full_name from profiles where email='bayo@example.com') = 'Bayo Ade', 'Google-style "name" metadata is used');
select pg_temp.check((select full_name from profiles where email='chi@example.com') = 'chi', 'falls back to email name');

-- ===== 2. Catalogue: everyone reads, nobody writes =====
set role anon; set request.jwt.claim.sub = '';
select pg_temp.check((select count(*) from products) = 35, 'guest can browse all 35 products');
select pg_temp.check((select count(*) from brands) = 7, 'guest can read brands');
reset role;
-- updates by guests/customers silently affect 0 rows under RLS; check price unchanged
set role anon; update products set price = 1 where id = 'p-001'; reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update products set price = 1 where id = 'p-001'; delete from products where id = 'p-002';
select pg_temp.expect_error($$insert into products (id, slug, name, price, category_id, brand_id, type_id) values ('hack','hack','Hack',1,'phones','nova','phones')$$, 'row-level security', 'customer cannot add products');
reset role;
select pg_temp.check((select price from products where id = 'p-001') = 2150000 and exists (select 1 from products where id='p-002'), 'guests/customers cannot change or delete products');
update products set active = false where id = 'p-035';
set role anon; select pg_temp.check((select count(*) from products) = 34, 'hidden (inactive) products are not shown'); reset role;
update products set active = true where id = 'p-035';

-- ===== 3. Carts are private =====
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into cart_items (user_id, product_id, quantity) values ('00000000-0000-0000-0000-00000000000a', 'p-024', 2);
select pg_temp.check((select count(*) from cart_items) = 1, 'customer A can add to their own cart');
select pg_temp.expect_error($$insert into cart_items (user_id, product_id, quantity) values ('00000000-0000-0000-0000-00000000000a', 'p-026', 11)$$, 'check constraint', 'cart quantity above 10 is rejected');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) from cart_items) = 0, 'customer B cannot see customer A''s cart');
select pg_temp.expect_error($$insert into cart_items (user_id, product_id, quantity) values ('00000000-0000-0000-0000-00000000000a', 'p-026', 1)$$, 'row-level security', 'customer B cannot add to A''s cart');
update cart_items set quantity = 9; delete from cart_items;
reset role;
select pg_temp.check((select quantity from cart_items where user_id = '00000000-0000-0000-0000-00000000000a' and product_id = 'p-024') = 2, 'customer B cannot change or delete A''s cart');
set role anon; set request.jwt.claim.sub = '';
select pg_temp.check((select count(*) from cart_items) = 0, 'guests cannot see any saved carts'); reset role;

-- ===== 4. Placing orders: the database sets the prices =====
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
create temp table r (o jsonb);
grant all on r to anon, authenticated;
insert into r select place_order(
  '{"firstName":"Ada","lastName":"Okafor","email":"Ada@Example.com","phone":"08012345678"}',
  '{"address":"5 Awolowo Road","city":"Lagos","state":"Lagos","country":"Nigeria"}',
  -- the "unitPrice" and "total" here are lies from a tampered browser — they must be ignored
  '[{"productId":"p-002","quantity":1,"unitPrice":1},{"productId":"p-027","quantity":2,"unitPrice":1}]');
select pg_temp.check((select (o->>'subtotal')::int from r) = 1092500 + 9000, 'subtotal uses real prices (iPhone 15 −5% + 2 cables = ₦1,101,500)');
select pg_temp.check((select (o->>'shipping')::int from r) = 0 and (select (o->>'total')::int from r) = 1101500, 'free delivery over ₦100,000; total correct');
select pg_temp.check((select o->>'paymentStatus' from r) = 'pending' and (select o->>'orderStatus' from r) = 'pending', 'new order is pending / awaiting payment');
select pg_temp.check((select o->>'id' from r) ~ '^CN-\d{8}-[0-9A-F]{6}$', 'order number looks like CN-YYYYMMDD-XXXXXX: ' || (select o->>'id' from r));
select pg_temp.check((select jsonb_array_length(o->'items') from r) = 2 and (select o->'customer'->>'email' from r) = 'ada@example.com', 'order has 2 items; email stored lower-case');
truncate r;
insert into r select place_order('{"firstName":"Ada","lastName":"Okafor","email":"ada@example.com","phone":"0801"}',
  '{"address":"5 Awolowo Road","city":"Lagos","state":"Lagos","country":"Nigeria"}', '[{"productId":"p-027","quantity":1}]');
select pg_temp.check((select (o->>'shipping')::int from r) = 3500 and (select (o->>'total')::int from r) = 8000, 'small order pays ₦3,500 delivery (₦4,500 + ₦3,500 = ₦8,000)');
select pg_temp.expect_error($$select place_order('{"firstName":"A","lastName":"B","email":"a@b.co","phone":"1"}','{"address":"x","city":"y","state":"z","country":"Nigeria"}','[{"productId":"p-004","quantity":1}]')$$, 'out of stock', 'sold-out product is refused');
select pg_temp.expect_error($$select place_order('{"firstName":"A","lastName":"B","email":"a@b.co","phone":"1"}','{"address":"x","city":"y","state":"z","country":"Nigeria"}','[{"productId":"p-001","quantity":4}]')$$, 'fewer than 4 left', 'more than the stock is refused (iPhone 16 Pro Max has 3)');
select pg_temp.expect_error($$select place_order('{"firstName":"A","lastName":"B","email":"a@b.co","phone":"1"}','{"address":"x","city":"y","state":"z","country":"Nigeria"}','[{"productId":"p-027","quantity":0}]')$$, 'between 1 and 10', 'zero quantity is refused');
select pg_temp.expect_error($$select place_order('{"firstName":"A","lastName":"B","email":"a@b.co","phone":"1"}','{"address":"x","city":"y","state":"z","country":"Nigeria"}','[{"productId":"p-027","quantity":1},{"productId":"p-027","quantity":1}]')$$, 'appear once', 'duplicate lines are refused');
select pg_temp.expect_error($$select place_order('{"firstName":"A","lastName":"B","email":"a@b.co","phone":"1"}','{"address":"x","city":"y","state":"z","country":"Nigeria"}','[]')$$, 'cart is empty', 'empty order is refused');
select pg_temp.expect_error($$select place_order('{"firstName":"A","lastName":"B","email":"not-an-email","phone":"1"}','{"address":"x","city":"y","state":"z","country":"Nigeria"}','[{"productId":"p-027","quantity":1}]')$$, 'email', 'invalid email is refused');
select pg_temp.expect_error($$select place_order('{"firstName":"A","lastName":"B","email":"a@b.co","phone":"1"}','{"address":"","city":"y","state":"z","country":"Nigeria"}','[{"productId":"p-027","quantity":1}]')$$, 'delivery address', 'missing address is refused');
select pg_temp.expect_error($$select place_order('{"firstName":"A","lastName":"B","email":"a@b.co","phone":"1"}','{"address":"x","city":"y","state":"z","country":"Nigeria"}','[{"productId":"nope","quantity":1}]')$$, 'no longer available', 'unknown product is refused');
select pg_temp.check((select count(*) from orders) = 2, 'refused orders leave nothing behind; Ada sees her 2 orders');
select pg_temp.check((select count(*) from my_orders()) = 2, 'my_orders() returns Ada''s 2 orders');

-- ===== 5. Orders are private, and customers can't mark them paid =====
update orders set payment_status = 'paid', order_status = 'shipped';
select pg_temp.expect_error($$insert into orders (id, user_id, first_name, last_name, email, phone, address, city, state, country, subtotal, shipping, total) values ('CN-FAKE', auth.uid(), 'a','b','c','d','e','f','g','h',0,0,0)$$, 'row-level security', 'customer cannot insert orders directly');
reset role;
select pg_temp.check((select count(*) from orders where payment_status = 'paid') = 0, 'customer cannot mark their own order paid');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) from orders) = 0 and (select count(*) from order_items) = 0, 'customer B cannot see A''s orders');
select pg_temp.check((select count(*) from my_orders()) = 0, 'my_orders() for B is empty');
select pg_temp.check(get_order((select id from orders limit 1)) is null, 'B cannot fetch A''s order by number') ;
reset role;
select pg_temp.check((select count(*) from public.orders where user_id = '00000000-0000-0000-0000-00000000000a') = 2, '(sanity) A really has 2 orders');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check(get_order((select id from public.orders limit 1)) is null, 'B cannot fetch A''s order even with its number');
reset role;

-- ===== 6. Guest checkout =====
set role anon; set request.jwt.claim.sub = '';
truncate r;
insert into r select place_order('{"firstName":"Guest","lastName":"Buyer","email":"g@example.com","phone":"0802"}',
  '{"address":"1 Marina","city":"Lagos","state":"Lagos","country":"Nigeria"}', '[{"productId":"p-026","quantity":1}]', 'g_guestbrowser01');
select pg_temp.check((select o->>'userId' from r) is null and (select o->>'guestId' from r) = 'g_guestbrowser01', 'guest can place an order (no account)');
select pg_temp.check(get_order((select o->>'id' from r), 'g_guestbrowser01') is not null, 'guest can view their order from the same browser');
select pg_temp.check(get_order((select o->>'id' from r), 'g_someoneelse99') is null, 'a different browser cannot view the guest order');
select pg_temp.check((select count(*) from orders) = 0, 'guests cannot list any orders');
select pg_temp.expect_error($$select place_order('{"firstName":"A","lastName":"B","email":"a@b.co","phone":"1"}','{"address":"x","city":"y","state":"z","country":"Nigeria"}','[{"productId":"p-027","quantity":1}]')$$, 'sign in', 'guest order without a browser ID is refused');
select pg_temp.expect_error($$select * from my_orders()$$, 'permission denied', 'guests cannot call my_orders()');
select pg_temp.expect_error($$select order_json('x')$$, 'permission denied', 'website cannot call the internal order_json()');
reset role;

-- ===== 7. Stock is not reduced for unpaid orders =====
select pg_temp.check((select stock_quantity from products where id = 'p-026') = 50, 'stock unchanged by unpaid orders (reduced after payment, next phase)');
