create table if not exists public.rental_documents (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals (id) on delete cascade,
  bucket text not null,
  storage_path text not null,
  file_name text not null,
  content_type text,
  category text,
  document_type text not null,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists rental_documents_rental_id_idx
  on public.rental_documents (rental_id);

alter table public.rental_documents enable row level security;

drop policy if exists "rental_documents_select_member_or_staff" on public.rental_documents;
create policy "rental_documents_select_member_or_staff"
  on public.rental_documents for select
  to authenticated
  using (
    public.is_staff_member()
    or exists (
      select 1
      from public.rentals r
      where r.id = rental_id
        and public.is_tenant_member(r.tenant_id)
    )
  );
