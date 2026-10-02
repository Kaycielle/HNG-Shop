-- =============================================================================
-- Fit Heiress NG — order confirmation emails (Mailgun)
--
-- Run AFTER 0002_payments.sql: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again.
--
-- The "paystack" Edge Function sends the email after a payment is verified.
-- These functions make sure each order gets exactly ONE confirmation email,
-- even though the browser and Paystack's webhook both confirm the payment.
-- =============================================================================

alter table public.orders add column if not exists confirmation_email_sent_at timestamptz;

-- Claims the right to send an order's confirmation email. Returns true for
-- exactly one caller per paid order; everyone else gets false.
create or replace function public.claim_confirmation_email(p_order_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.orders
     set confirmation_email_sent_at = now()
   where id = p_order_id
     and payment_status = 'paid'
     and confirmation_email_sent_at is null;
  return found;
end $$;

-- If sending failed, hand the claim back so the next confirmation retries.
create or replace function public.release_confirmation_email(p_order_id text)
returns void language sql security definer set search_path = public as $$
  update public.orders set confirmation_email_sent_at = null where id = p_order_id
$$;

-- Order JSON gains confirmationEmailSentAt so the order page can say "we've emailed you".
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
    'confirmationEmailSentAt', o.confirmation_email_sent_at,
    'createdAt', o.created_at
  )
  from public.orders o where o.id = p_order_id
$$;

-- Server only (service role). Re-applied for order_json because "create or replace" keeps
-- existing grants, but this keeps the file self-contained.
revoke all on function public.claim_confirmation_email(text) from public, anon, authenticated;
revoke all on function public.release_confirmation_email(text) from public, anon, authenticated;
revoke all on function public.order_json(text) from public, anon, authenticated;
grant execute on function public.claim_confirmation_email(text) to service_role;
grant execute on function public.release_confirmation_email(text) to service_role;
grant execute on function public.order_json(text) to service_role;
