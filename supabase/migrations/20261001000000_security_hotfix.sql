-- Phase 0 security hotfix.
--
-- 1. Normalize identity emails to lowercase so lookups can use exact matches
--    (ILIKE treated "_" and "%" as wildcards, letting look-alike addresses match).
-- 2. Remove direct PostgREST table access for anon/authenticated. All app data access
--    goes through the server's service-role client; RLS stays enabled as a second layer.
-- 3. Add a small fixed-window rate limiter for public endpoints.
-- 4. Define the documents bucket as private with a size limit and MIME allowlist.

-- ---------------------------------------------------------------------------
-- 1. Lowercase emails
-- ---------------------------------------------------------------------------

update public.profiles
set email = lower(trim(email))
where email <> lower(trim(email));

update public.tenants
set primary_email = lower(trim(primary_email))
where primary_email <> lower(trim(primary_email));

update public.applications
set primary_email = lower(trim(primary_email))
where primary_email <> lower(trim(primary_email));

update public.tenant_invitations
set invited_email = lower(trim(invited_email))
where invited_email <> lower(trim(invited_email));

alter table public.profiles
  drop constraint if exists profiles_email_lowercase_check,
  add constraint profiles_email_lowercase_check check (email = lower(email));

alter table public.tenants
  drop constraint if exists tenants_primary_email_lowercase_check,
  add constraint tenants_primary_email_lowercase_check
    check (primary_email = lower(primary_email));

alter table public.applications
  drop constraint if exists applications_primary_email_lowercase_check,
  add constraint applications_primary_email_lowercase_check
    check (primary_email = lower(primary_email));

alter table public.tenant_invitations
  drop constraint if exists tenant_invitations_invited_email_lowercase_check,
  add constraint tenant_invitations_invited_email_lowercase_check
    check (invited_email = lower(invited_email));

-- Exact-match lookups (the app now uses `.eq` on normalized values).
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists tenants_primary_email_idx on public.tenants (primary_email);
create index if not exists tenant_invitations_invited_email_idx
  on public.tenant_invitations (invited_email);

-- Store auth emails lowercased when the auth trigger creates/updates profiles.
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
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        updated_at = timezone('utc', now());

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. No direct table access from the browser roles
-- ---------------------------------------------------------------------------
-- The browser Supabase client is only used for auth (sign-out); every data read and
-- write runs server-side with the service role. Previously, any authenticated user
-- could query tables like `applications` directly with the publishable key.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- Users could previously rewrite their own profile email/display name directly.
drop policy if exists "profiles_update_self" on public.profiles;

-- ---------------------------------------------------------------------------
-- 3. Rate limiting
-- ---------------------------------------------------------------------------

create table if not exists public.rate_limit_buckets (
  bucket_key text not null,
  window_start timestamptz not null,
  hit_count integer not null default 0,
  primary key (bucket_key, window_start)
);

alter table public.rate_limit_buckets enable row level security;
revoke all on public.rate_limit_buckets from anon, authenticated;

create index if not exists rate_limit_buckets_window_idx
  on public.rate_limit_buckets (window_start);

create or replace function public.consume_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_window_seconds <= 0 or p_max <= 0 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_buckets (bucket_key, window_start, hit_count)
  values (p_key, v_window_start, 1)
  on conflict (bucket_key, window_start)
    do update set hit_count = public.rate_limit_buckets.hit_count + 1
  returning hit_count into v_count;

  -- Opportunistic cleanup of old windows.
  if random() < 0.01 then
    delete from public.rate_limit_buckets
    where window_start < now() - interval '2 days';
  end if;

  return v_count <= p_max;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4. Private documents bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
