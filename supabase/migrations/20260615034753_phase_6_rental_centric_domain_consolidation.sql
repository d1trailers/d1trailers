-- Phase 6: Rental-centric domain consolidation

alter table public.applications
  alter column status drop default;

alter table public.applications
  alter column status type text using lower(coalesce(status::text, 'submitted'));

update public.applications
set status = case
  when status in ('', 'null') then 'submitted'
  when status = 'applied' then 'submitted'
  else status
end;

alter table public.applications
  alter column status set default 'submitted';

create type public.tenant_status_new as enum (
  'active',
  'suspended',
  'stale'
);

alter table public.tenants
  alter column status drop default;

alter table public.tenants
  alter column status type public.tenant_status_new
  using (
    case
      when status::text = 'suspended' then 'suspended'::public.tenant_status_new
      when status::text in ('active', 'past_due', 'approved', 'awaiting_first_payment') then 'active'::public.tenant_status_new
      else 'stale'::public.tenant_status_new
    end
  );

drop type public.tenant_status;
alter type public.tenant_status_new rename to tenant_status;

alter table public.tenants
  alter column status set default 'stale';

create type public.rental_status_new as enum (
  'draft',
  'customer_review',
  'changes_pending',
  'awaiting_first_payment',
  'active',
  'past_due',
  'suspended',
  'returned',
  'declined',
  'cancelled'
);

alter table public.rentals
  alter column status drop default;

alter table public.rentals
  alter column status type public.rental_status_new
  using (
    case status::text
      when 'draft' then 'draft'::public.rental_status_new
      when 'awaiting_first_payment' then 'awaiting_first_payment'::public.rental_status_new
      when 'active' then 'active'::public.rental_status_new
      when 'past_due' then 'past_due'::public.rental_status_new
      when 'suspended' then 'suspended'::public.rental_status_new
      when 'returned' then 'returned'::public.rental_status_new
      when 'cancelled' then 'cancelled'::public.rental_status_new
      else 'draft'::public.rental_status_new
    end
  );

drop type public.rental_status;
alter type public.rental_status_new rename to rental_status;

alter table public.rentals
  alter column status set default 'draft';

alter table public.communication_events
  add column if not exists rental_id uuid references public.rentals (id) on delete set null;

create index if not exists communication_events_rental_id_idx
  on public.communication_events (rental_id, created_at desc);

update public.communication_events
set rental_id = nullif(payload_snapshot ->> 'rentalId', '')::uuid
where rental_id is null
  and jsonb_typeof(payload_snapshot) = 'object'
  and (payload_snapshot ? 'rentalId')
  and (payload_snapshot ->> 'rentalId') ~* '^[0-9a-f-]{36}$';

update public.timeline_items as item
set rental_id = rental.id
from public.rentals as rental
where item.rental_id is null
  and item.application_id is not null
  and rental.application_id = item.application_id;

update public.tenants as tenant
set status = case
  when exists (
    select 1
    from public.rentals rental
    where rental.tenant_id = tenant.id
      and rental.record_kind = 'agreement'
      and rental.status = 'suspended'
  ) then 'suspended'::public.tenant_status
  when exists (
    select 1
    from public.rentals rental
    where rental.tenant_id = tenant.id
      and rental.record_kind = 'agreement'
      and rental.status in ('awaiting_first_payment', 'active', 'past_due')
  ) then 'active'::public.tenant_status
  else 'stale'::public.tenant_status
end;
