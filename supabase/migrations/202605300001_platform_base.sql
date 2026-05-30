create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tenant_status') then
    create type public.tenant_status as enum (
      'lead',
      'applied',
      'under_review',
      'feedback_requested',
      'approved',
      'awaiting_first_payment',
      'active',
      'past_due',
      'suspended',
      'closed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'staff_role') then
    create type public.staff_role as enum ('staff_admin', 'staff_ops');
  end if;

  if not exists (select 1 from pg_type where typname = 'tenant_role') then
    create type public.tenant_role as enum ('account_owner', 'account_user');
  end if;

  if not exists (select 1 from pg_type where typname = 'tenant_permission') then
    create type public.tenant_permission as enum (
      'view_rentals',
      'view_documents',
      'view_billing',
      'view_timeline',
      'manage_pickup'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'timeline_item_type') then
    create type public.timeline_item_type as enum ('milestone', 'action_required', 'message');
  end if;

  if not exists (select 1 from pg_type where typname = 'communication_event_type') then
    create type public.communication_event_type as enum (
      'interest_received',
      'application_received',
      'feedback_requested',
      'application_approved',
      'billing_notice',
      'portal_access'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'billing_frequency') then
    create type public.billing_frequency as enum ('weekly', 'monthly', 'yearly');
  end if;

  if not exists (select 1 from pg_type where typname = 'rental_status') then
    create type public.rental_status as enum (
      'draft',
      'awaiting_first_payment',
      'active',
      'past_due',
      'suspended',
      'returned',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'billing_status') then
    create type public.billing_status as enum (
      'draft',
      'awaiting_first_payment',
      'active',
      'past_due',
      'suspended',
      'cancelled',
      'unpaid'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'trailer_status') then
    create type public.trailer_status as enum (
      'available',
      'reserved',
      'rented',
      'maintenance',
      'retired'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'assignment_status') then
    create type public.assignment_status as enum ('active', 'expired', 'cancelled');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

create table if not exists public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.staff_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id)
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  legal_name text,
  display_name text not null,
  slug text not null unique,
  primary_email text not null,
  primary_phone text,
  status public.tenant_status not null default 'lead',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tenants_primary_email_lower_idx
  on public.tenants (lower(primary_email));

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.tenant_role not null,
  invitation_status text not null default 'active',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, profile_id)
);

create table if not exists public.tenant_membership_permissions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.tenant_memberships (id) on delete cascade,
  permission public.tenant_permission not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (membership_id, permission)
);

create table if not exists public.interest_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  company_name text,
  rental_duration text,
  intended_use text,
  referral_source text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  submitted_by_profile_id uuid references public.profiles (id) on delete set null,
  status public.tenant_status not null default 'applied',
  company_name text not null,
  primary_email text not null,
  primary_phone text not null,
  owner_first_name text not null,
  owner_last_name text not null,
  billing_frequency public.billing_frequency not null default 'monthly',
  rental_duration text not null,
  intended_use text,
  payload jsonb not null default '{}'::jsonb,
  review_notes text,
  decision_by_profile_id uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists applications_tenant_idx on public.applications (tenant_id);
create index if not exists applications_status_idx on public.applications (status);
create index if not exists applications_primary_email_lower_idx
  on public.applications (lower(primary_email));

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  bucket text not null,
  storage_path text not null,
  file_name text not null,
  content_type text,
  category text,
  document_type text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rentals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  status public.rental_status not null default 'draft',
  billing_status public.billing_status not null default 'draft',
  billing_frequency public.billing_frequency not null default 'monthly',
  rate numeric(10,2),
  deposit_amount numeric(10,2),
  contract_start_date date,
  operational_start_date date,
  end_date date,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  stripe_product_id text,
  current_period_end date,
  last_invoice_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trailers (
  id uuid primary key default gen_random_uuid(),
  trailer_code text,
  trailer_type text,
  plate_number text,
  vin text unique,
  status public.trailer_status not null default 'available',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals (id) on delete cascade,
  trailer_id uuid not null references public.trailers (id) on delete cascade,
  status public.assignment_status not null default 'active',
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  stripe_customer_id text,
  default_currency text not null default 'usd',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id)
);

create table if not exists public.timeline_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  rental_id uuid references public.rentals (id) on delete set null,
  type public.timeline_item_type not null,
  title text not null,
  description text,
  visible_to_tenant boolean not null default true,
  due_at timestamptz,
  completed_at timestamptz,
  cta_label text,
  cta_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.communication_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  recipient_email text not null,
  type public.communication_event_type not null,
  channel text not null default 'email',
  subject text,
  status text not null default 'pending',
  provider text,
  provider_message_id text,
  error_message text,
  payload_snapshot jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  tenant_id uuid references public.tenants (id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_staff_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.staff_memberships sm
    where sm.profile_id = auth.uid()
      and sm.is_active = true
  );
$$;

create or replace function public.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.profile_id = auth.uid()
      and tm.tenant_id = target_tenant_id
      and tm.is_active = true
      and tm.invitation_status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_membership_permissions enable row level security;
alter table public.interest_submissions enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.rentals enable row level security;
alter table public.trailers enable row level security;
alter table public.assignments enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.timeline_items enable row level security;
alter table public.communication_events enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_staff_member());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "staff_memberships_select_own_or_staff" on public.staff_memberships;
create policy "staff_memberships_select_own_or_staff"
  on public.staff_memberships for select
  to authenticated
  using (profile_id = auth.uid() or public.is_staff_member());

drop policy if exists "tenants_select_member_or_staff" on public.tenants;
create policy "tenants_select_member_or_staff"
  on public.tenants for select
  to authenticated
  using (public.is_staff_member() or public.is_tenant_member(id));

drop policy if exists "tenant_memberships_select_member_or_staff" on public.tenant_memberships;
create policy "tenant_memberships_select_member_or_staff"
  on public.tenant_memberships for select
  to authenticated
  using (profile_id = auth.uid() or public.is_staff_member());

drop policy if exists "tenant_membership_permissions_select_member_or_staff" on public.tenant_membership_permissions;
create policy "tenant_membership_permissions_select_member_or_staff"
  on public.tenant_membership_permissions for select
  to authenticated
  using (
    public.is_staff_member()
    or exists (
      select 1 from public.tenant_memberships tm
      where tm.id = membership_id and tm.profile_id = auth.uid()
    )
  );

drop policy if exists "applications_select_member_or_staff" on public.applications;
create policy "applications_select_member_or_staff"
  on public.applications for select
  to authenticated
  using (public.is_staff_member() or public.is_tenant_member(tenant_id));

drop policy if exists "application_documents_select_member_or_staff" on public.application_documents;
create policy "application_documents_select_member_or_staff"
  on public.application_documents for select
  to authenticated
  using (
    public.is_staff_member()
    or exists (
      select 1 from public.applications a
      where a.id = application_id and public.is_tenant_member(a.tenant_id)
    )
  );

drop policy if exists "rentals_select_member_or_staff" on public.rentals;
create policy "rentals_select_member_or_staff"
  on public.rentals for select
  to authenticated
  using (public.is_staff_member() or public.is_tenant_member(tenant_id));

drop policy if exists "assignments_select_member_or_staff" on public.assignments;
create policy "assignments_select_member_or_staff"
  on public.assignments for select
  to authenticated
  using (
    public.is_staff_member()
    or exists (
      select 1 from public.rentals r
      where r.id = rental_id and public.is_tenant_member(r.tenant_id)
    )
  );

drop policy if exists "timeline_items_select_visible_member_or_staff" on public.timeline_items;
create policy "timeline_items_select_visible_member_or_staff"
  on public.timeline_items for select
  to authenticated
  using (
    public.is_staff_member()
    or (
      visible_to_tenant = true
      and public.is_tenant_member(tenant_id)
    )
  );

drop policy if exists "billing_accounts_select_member_or_staff" on public.billing_accounts;
create policy "billing_accounts_select_member_or_staff"
  on public.billing_accounts for select
  to authenticated
  using (public.is_staff_member() or public.is_tenant_member(tenant_id));

drop policy if exists "communication_events_select_staff" on public.communication_events;
create policy "communication_events_select_staff"
  on public.communication_events for select
  to authenticated
  using (public.is_staff_member());

drop policy if exists "audit_log_select_staff" on public.audit_log;
create policy "audit_log_select_staff"
  on public.audit_log for select
  to authenticated
  using (public.is_staff_member());

drop policy if exists "interest_submissions_select_staff" on public.interest_submissions;
create policy "interest_submissions_select_staff"
  on public.interest_submissions for select
  to authenticated
  using (public.is_staff_member());

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists staff_memberships_set_updated_at on public.staff_memberships;
create trigger staff_memberships_set_updated_at before update on public.staff_memberships
for each row execute procedure public.set_updated_at();

drop trigger if exists tenants_set_updated_at on public.tenants;
create trigger tenants_set_updated_at before update on public.tenants
for each row execute procedure public.set_updated_at();

drop trigger if exists tenant_memberships_set_updated_at on public.tenant_memberships;
create trigger tenant_memberships_set_updated_at before update on public.tenant_memberships
for each row execute procedure public.set_updated_at();

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at before update on public.applications
for each row execute procedure public.set_updated_at();

drop trigger if exists rentals_set_updated_at on public.rentals;
create trigger rentals_set_updated_at before update on public.rentals
for each row execute procedure public.set_updated_at();

drop trigger if exists trailers_set_updated_at on public.trailers;
create trigger trailers_set_updated_at before update on public.trailers
for each row execute procedure public.set_updated_at();

drop trigger if exists assignments_set_updated_at on public.assignments;
create trigger assignments_set_updated_at before update on public.assignments
for each row execute procedure public.set_updated_at();

drop trigger if exists billing_accounts_set_updated_at on public.billing_accounts;
create trigger billing_accounts_set_updated_at before update on public.billing_accounts
for each row execute procedure public.set_updated_at();

drop trigger if exists timeline_items_set_updated_at on public.timeline_items;
create trigger timeline_items_set_updated_at before update on public.timeline_items
for each row execute procedure public.set_updated_at();

drop trigger if exists communication_events_set_updated_at on public.communication_events;
create trigger communication_events_set_updated_at before update on public.communication_events
for each row execute procedure public.set_updated_at();
