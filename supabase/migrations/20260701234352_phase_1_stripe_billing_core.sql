create unique index if not exists billing_accounts_stripe_customer_id_idx
  on public.billing_accounts (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists rentals_stripe_subscription_id_idx
  on public.rentals (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  rental_id uuid references public.rentals (id) on delete set null,
  stripe_invoice_id text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null,
  billing_reason text,
  collection_method text,
  currency text not null default 'usd',
  amount_due numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  amount_remaining numeric(12,2) not null default 0,
  hosted_invoice_url text,
  invoice_pdf_url text,
  period_start timestamptz,
  period_end timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_invoices_tenant_id_idx
  on public.billing_invoices (tenant_id);

create index if not exists billing_invoices_rental_id_idx
  on public.billing_invoices (rental_id);

create index if not exists billing_invoices_status_idx
  on public.billing_invoices (status);

create table if not exists public.billing_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.billing_invoices (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  rental_id uuid references public.rentals (id) on delete set null,
  stripe_line_item_id text unique,
  source_type text not null default 'rental_charge'
    check (source_type in ('rental_charge', 'deposit', 'toll', 'fee', 'adjustment')),
  description text,
  amount numeric(12,2) not null default 0,
  quantity numeric(12,2),
  currency text not null default 'usd',
  period_start timestamptz,
  period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_invoice_lines_invoice_id_idx
  on public.billing_invoice_lines (invoice_id);

create index if not exists billing_invoice_lines_tenant_id_idx
  on public.billing_invoice_lines (tenant_id);

create index if not exists billing_invoice_lines_rental_id_idx
  on public.billing_invoice_lines (rental_id);

create table if not exists public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processed', 'failed', 'skipped')),
  tenant_id uuid references public.tenants (id) on delete set null,
  rental_id uuid references public.rentals (id) on delete set null,
  billing_invoice_id uuid references public.billing_invoices (id) on delete set null,
  error_message text,
  raw_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists stripe_events_event_type_idx
  on public.stripe_events (event_type);

create index if not exists stripe_events_processing_status_idx
  on public.stripe_events (processing_status);

alter table public.billing_invoices enable row level security;
alter table public.billing_invoice_lines enable row level security;
alter table public.stripe_events enable row level security;

grant select on public.billing_invoices to authenticated;
grant select on public.billing_invoice_lines to authenticated;
grant select on public.stripe_events to authenticated;

drop policy if exists "billing_invoices_select_member_or_staff" on public.billing_invoices;
create policy "billing_invoices_select_member_or_staff"
  on public.billing_invoices for select
  to authenticated
  using (public.is_staff_member() or public.is_tenant_member(tenant_id));

drop policy if exists "billing_invoice_lines_select_member_or_staff" on public.billing_invoice_lines;
create policy "billing_invoice_lines_select_member_or_staff"
  on public.billing_invoice_lines for select
  to authenticated
  using (public.is_staff_member() or public.is_tenant_member(tenant_id));

drop policy if exists "stripe_events_select_staff" on public.stripe_events;
create policy "stripe_events_select_staff"
  on public.stripe_events for select
  to authenticated
  using (public.is_staff_member());

drop trigger if exists billing_invoices_set_updated_at on public.billing_invoices;
create trigger billing_invoices_set_updated_at before update on public.billing_invoices
for each row execute procedure public.set_updated_at();

drop trigger if exists billing_invoice_lines_set_updated_at on public.billing_invoice_lines;
create trigger billing_invoice_lines_set_updated_at before update on public.billing_invoice_lines
for each row execute procedure public.set_updated_at();

drop trigger if exists stripe_events_set_updated_at on public.stripe_events;
create trigger stripe_events_set_updated_at before update on public.stripe_events
for each row execute procedure public.set_updated_at();
