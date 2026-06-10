alter table public.profiles
  add column if not exists last_active_tenant_id uuid references public.tenants (id) on delete set null;

create index if not exists profiles_last_active_tenant_idx
  on public.profiles (last_active_tenant_id);

create table if not exists public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  invited_email text not null,
  invited_by_profile_id uuid references public.profiles (id) on delete set null,
  accepted_by_profile_id uuid references public.profiles (id) on delete set null,
  target_role public.tenant_role not null,
  permission_snapshot public.tenant_permission[] not null default '{}'::public.tenant_permission[],
  status text not null default 'pending',
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_invitations_status_check
    check (status in ('pending', 'accepted', 'revoked', 'expired'))
);

create index if not exists tenant_invitations_tenant_idx
  on public.tenant_invitations (tenant_id);

create index if not exists tenant_invitations_invited_email_lower_idx
  on public.tenant_invitations (lower(invited_email));

create unique index if not exists tenant_invitations_pending_unique_idx
  on public.tenant_invitations (tenant_id, lower(invited_email))
  where status = 'pending';

create or replace function public.has_tenant_permission(
  target_tenant_id uuid,
  required_permission public.tenant_permission
)
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
      and (
        tm.role = 'account_owner'
        or exists (
          select 1
          from public.tenant_membership_permissions tmp
          where tmp.membership_id = tm.id
            and tmp.permission = required_permission
        )
      )
  );
$$;

insert into public.tenant_memberships (
  tenant_id,
  profile_id,
  role,
  invitation_status,
  is_active
)
select
  t.id,
  p.id,
  'account_owner'::public.tenant_role,
  'active',
  true
from public.tenants t
join public.profiles p
  on lower(p.email) = lower(t.primary_email)
left join public.tenant_memberships tm
  on tm.tenant_id = t.id
 and tm.profile_id = p.id
where tm.id is null;

insert into public.tenant_invitations (
  tenant_id,
  invited_email,
  target_role,
  permission_snapshot,
  status,
  expires_at
)
select
  t.id,
  lower(t.primary_email),
  'account_owner'::public.tenant_role,
  '{}'::public.tenant_permission[],
  'pending',
  timezone('utc', now()) + interval '30 days'
from public.tenants t
where not exists (
    select 1
    from public.tenant_memberships tm
    join public.profiles p
      on p.id = tm.profile_id
    where tm.tenant_id = t.id
      and lower(p.email) = lower(t.primary_email)
      and tm.is_active = true
  )
  and not exists (
    select 1
    from public.tenant_invitations ti
    where ti.tenant_id = t.id
      and lower(ti.invited_email) = lower(t.primary_email)
      and ti.status = 'pending'
  );

update public.profiles p
set last_active_tenant_id = (
  select tm.tenant_id
  from public.tenant_memberships tm
  where tm.profile_id = p.id
    and tm.is_active = true
    and tm.invitation_status = 'active'
  order by
    case when tm.role = 'account_owner' then 0 else 1 end,
    tm.created_at asc
  limit 1
)
where p.last_active_tenant_id is null
  and exists (
    select 1
    from public.tenant_memberships tm
    where tm.profile_id = p.id
      and tm.is_active = true
      and tm.invitation_status = 'active'
  );

alter table public.tenant_invitations enable row level security;

drop policy if exists "tenant_memberships_select_member_or_staff" on public.tenant_memberships;
create policy "tenant_memberships_select_member_or_staff"
  on public.tenant_memberships for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_staff_member()
    or public.has_tenant_permission(tenant_id, 'manage_members')
  );

drop policy if exists "tenant_membership_permissions_select_member_or_staff" on public.tenant_membership_permissions;
create policy "tenant_membership_permissions_select_member_or_staff"
  on public.tenant_membership_permissions for select
  to authenticated
  using (
    public.is_staff_member()
    or exists (
      select 1
      from public.tenant_memberships tm
      where tm.id = membership_id
        and (
          tm.profile_id = auth.uid()
          or public.has_tenant_permission(tm.tenant_id, 'manage_members')
        )
    )
  );

drop policy if exists "tenant_invitations_select_allowed" on public.tenant_invitations;
create policy "tenant_invitations_select_allowed"
  on public.tenant_invitations for select
  to authenticated
  using (
    public.is_staff_member()
    or public.has_tenant_permission(tenant_id, 'manage_members')
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.email) = lower(invited_email)
    )
  );

drop trigger if exists tenant_invitations_set_updated_at on public.tenant_invitations;
create trigger tenant_invitations_set_updated_at before update on public.tenant_invitations
for each row execute procedure public.set_updated_at();
