create type public.billing_provider as enum ('payos', 'apple', 'google', 'manual');
create type public.billing_order_status as enum ('pending', 'paid', 'cancelled', 'failed', 'refunded');
create type public.entitlement_status as enum ('active', 'expired', 'revoked');

create table public.billing_products (
  id uuid primary key,
  code text not null unique,
  name text not null,
  active boolean not null default true
);

create table public.billing_prices (
  id uuid primary key,
  product_id uuid not null references public.billing_products(id),
  code text not null unique,
  amount integer not null check (amount >= 0),
  currency text not null check (char_length(currency) = 3),
  duration_days integer check (duration_days > 0),
  active boolean not null default true
);

create table public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  price_id uuid not null references public.billing_prices(id),
  provider public.billing_provider not null,
  provider_order_code text not null,
  provider_payment_id text,
  amount integer not null check (amount >= 0),
  currency text not null check (char_length(currency) = 3),
  status public.billing_order_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_order_code)
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.billing_products(id),
  entitlement_key text not null,
  source_provider public.billing_provider not null,
  source_reference text not null,
  status public.entitlement_status not null default 'active',
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_provider, source_reference, entitlement_key)
);

create table public.billing_webhook_events (
  provider public.billing_provider not null,
  provider_event_id text not null,
  received_at timestamptz not null default now(),
  primary key (provider, provider_event_id)
);

create index billing_orders_user_idx on public.billing_orders (user_id, created_at desc);
create index entitlements_user_active_idx on public.entitlements (user_id, status, ends_at);

alter table public.billing_products enable row level security;
alter table public.billing_prices enable row level security;
alter table public.billing_orders enable row level security;
alter table public.entitlements enable row level security;
alter table public.billing_webhook_events enable row level security;

create policy "Anyone reads active products" on public.billing_products for select using (active);
create policy "Anyone reads active prices" on public.billing_prices for select using (active);
create policy "Users read their own orders" on public.billing_orders for select using ((select auth.uid()) = user_id);
create policy "Users create their own pending orders" on public.billing_orders for insert
with check ((select auth.uid()) = user_id and status = 'pending');
create policy "Users attach checkout identifiers to pending orders" on public.billing_orders for update
using ((select auth.uid()) = user_id and status = 'pending')
with check ((select auth.uid()) = user_id and status in ('pending', 'failed'));
create policy "Users read their own entitlements" on public.entitlements for select using ((select auth.uid()) = user_id);

insert into public.billing_products (id, code, name) values
  ('00000000-0000-4000-8000-000000000001', 'free', 'Haru Free'),
  ('00000000-0000-4000-8000-000000000002', 'pro', 'Haru Pro');

insert into public.billing_prices (id, product_id, code, amount, currency, duration_days) values
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000002', 'pro_annual_vnd', 499000, 'VND', 365);

create function public.complete_payos_order(
  p_order_code text,
  p_payment_link_id text,
  p_reference text,
  p_amount integer,
  p_paid_at timestamptz
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.billing_orders;
  target_price public.billing_prices;
begin
  insert into public.billing_webhook_events (provider, provider_event_id)
  values ('payos', p_reference)
  on conflict do nothing;

  if not found then return; end if;

  select * into target_order
  from public.billing_orders
  where provider = 'payos' and provider_order_code = p_order_code
  for update;

  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if target_order.amount <> p_amount then raise exception 'AMOUNT_MISMATCH'; end if;
  if target_order.status = 'paid' then return; end if;

  select * into target_price
  from public.billing_prices where id = target_order.price_id;

  update public.billing_orders set
    status = 'paid',
    provider_payment_id = p_payment_link_id,
    paid_at = p_paid_at,
    updated_at = now()
  where id = target_order.id;

  insert into public.entitlements (
    user_id, product_id, entitlement_key, source_provider,
    source_reference, status, starts_at, ends_at
  ) values (
    target_order.user_id,
    target_price.product_id,
    'premium_content',
    'payos',
    p_reference,
    'active',
    p_paid_at,
    p_paid_at + make_interval(days => target_price.duration_days)
  ) on conflict do nothing;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    target_order.user_id,
    'billing.entitlement_granted',
    'billing_order',
    target_order.id::text,
    jsonb_build_object('provider', 'payos', 'reference', p_reference)
  );
end;
$$;

revoke all on function public.complete_payos_order(text, text, text, integer, timestamptz) from public;
grant execute on function public.complete_payos_order(text, text, text, integer, timestamptz) to service_role;
