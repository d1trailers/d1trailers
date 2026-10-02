do $$
begin
  if not exists (select 1 from pg_type where typname = 'rental_record_kind') then
    create type public.rental_record_kind as enum ('request', 'agreement');
  end if;

  if not exists (select 1 from pg_type where typname = 'rental_request_kind') then
    create type public.rental_request_kind as enum (
      'initial_application',
      'new_rental',
      'rental_expansion',
      'admin_created'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'rental_request_outcome') then
    create type public.rental_request_outcome as enum (
      'approved_as_agreement',
      'merged_into_parent',
      'denied',
      'cancelled'
    );
  end if;
end $$;

alter table public.rentals
  add column if not exists record_kind public.rental_record_kind not null default 'agreement',
  add column if not exists request_kind public.rental_request_kind not null default 'admin_created',
  add column if not exists parent_rental_id uuid references public.rentals (id) on delete set null,
  add column if not exists requested_trailer_count integer,
  add column if not exists requested_trailer_type text,
  add column if not exists request_summary text,
  add column if not exists requested_by_profile_id uuid references public.profiles (id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists request_outcome public.rental_request_outcome;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rentals_requested_trailer_count_check'
  ) then
    alter table public.rentals
      add constraint rentals_requested_trailer_count_check
      check (requested_trailer_count is null or requested_trailer_count > 0);
  end if;
end $$;

create index if not exists rentals_record_kind_idx
  on public.rentals (record_kind);

create index if not exists rentals_parent_rental_idx
  on public.rentals (parent_rental_id);

create index if not exists rentals_record_kind_status_idx
  on public.rentals (tenant_id, record_kind, status);

create index if not exists rentals_request_outcome_idx
  on public.rentals (request_outcome);
