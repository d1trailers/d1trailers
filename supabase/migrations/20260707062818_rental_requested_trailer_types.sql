create table if not exists public.rental_requested_trailer_types (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals (id) on delete cascade,
  trailer_type text not null,
  quantity integer not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint rental_requested_trailer_types_quantity_check check (quantity > 0),
  constraint rental_requested_trailer_types_trailer_type_check check (length(trim(trailer_type)) > 0),
  constraint rental_requested_trailer_types_unique_type unique (rental_id, trailer_type)
);

create index if not exists rental_requested_trailer_types_rental_id_idx
  on public.rental_requested_trailer_types (rental_id);

alter table public.rental_requested_trailer_types enable row level security;

grant select on public.rental_requested_trailer_types to authenticated;
grant all on public.rental_requested_trailer_types to service_role;

drop policy if exists "rental_requested_trailer_types_select_member_or_staff"
  on public.rental_requested_trailer_types;

create policy "rental_requested_trailer_types_select_member_or_staff"
  on public.rental_requested_trailer_types
  for select
  to authenticated
  using (
    public.is_staff_member()
    or exists (
      select 1
      from public.rentals r
      join public.tenant_memberships tm on tm.tenant_id = r.tenant_id
      where r.id = rental_requested_trailer_types.rental_id
        and tm.profile_id = auth.uid()
        and tm.is_active = true
    )
  );

drop trigger if exists rental_requested_trailer_types_set_updated_at
  on public.rental_requested_trailer_types;

create trigger rental_requested_trailer_types_set_updated_at
  before update on public.rental_requested_trailer_types
  for each row execute procedure public.set_updated_at();

insert into public.rental_requested_trailer_types (
  rental_id,
  trailer_type,
  quantity,
  sort_order
)
select
  r.id,
  r.requested_trailer_type,
  coalesce(r.requested_trailer_count, 1),
  100
from public.rentals r
where r.requested_trailer_type is not null
  and length(trim(r.requested_trailer_type)) > 0
  and coalesce(r.requested_trailer_count, 1) > 0
on conflict (rental_id, trailer_type) do update
set quantity = excluded.quantity,
    sort_order = excluded.sort_order;
