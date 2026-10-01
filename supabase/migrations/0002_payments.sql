-- =============================================================================
-- Confam NG — payments (Paystack)
--
-- Run AFTER 0001_confam_schema.sql: Dashboard → SQL Editor → New query →
-- paste this file → Run. Safe to run again.
--
-- These functions are used ONLY by the "paystack" Edge Function, which runs on
-- Supabase's servers with the service-role key. The website cannot call them:
-- a browser can never mark an order paid.
-- =============================================================================

alter table public.orders add column if not exists paid_at timestamptz;

-- Records which Paystack transaction an unpaid order is being paid with.
create or replace function public.set_payment_reference(p_order_id text, p_reference text)
returns void language sql security definer set search_path = public as $$
  update public.orders
     set payment_reference = p_reference
   where id = p_order_id and payment_status = 'pending'
$$;

-- Marks an order paid after the Edge Function has verified the payment with
-- Paystack. Safe to call more than once (the browser return and Paystack's
-- webhook may both arrive): only the first call changes anything.
create or replace function public.mark_order_paid(p_order_id text, p_reference text, p_amount_kobo bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  -- Lock the order so two simultaneous confirmations can't both run.
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if v_order.payment_status = 'paid' then
    return public.order_json(p_order_id); -- already done
  end if;

  -- Paystack amounts are in kobo (₦1 = 100 kobo).
  if p_amount_kobo <> v_order.total::bigint * 100 then
    raise exception 'Amount paid (% kobo) does not match order % total (% kobo)',
      p_amount_kobo, p_order_id, v_order.total::bigint * 100;
  end if;

  update public.orders
     set payment_status = 'paid',
         order_status = 'processing',
         payment_reference = p_reference,
         paid_at = now()
   where id = p_order_id;

  -- Reduce stock now that the order is paid.
  update public.products p
     set stock_quantity = greatest(p.stock_quantity - i.quantity, 0)
    from public.order_items i
   where i.order_id = p_order_id and p.id = i.product_id;

  -- Empty the bought items from a signed-in customer's saved cart.
  if v_order.user_id is not null then
    delete from public.cart_items c
     using public.order_items i
     where i.order_id = p_order_id and c.user_id = v_order.user_id and c.product_id = i.product_id;
  end if;

  -- Next step (Mailgun): the Edge Function sends the confirmation email after this returns.
  return public.order_json(p_order_id);
end $$;

-- Only the server (service role) may use these.
revoke all on function public.set_payment_reference(text, text) from public, anon, authenticated;
revoke all on function public.mark_order_paid(text, text, bigint) from public, anon, authenticated;
grant execute on function public.set_payment_reference(text, text) to service_role;
grant execute on function public.mark_order_paid(text, text, bigint) to service_role;
grant execute on function public.order_json(text) to service_role;
