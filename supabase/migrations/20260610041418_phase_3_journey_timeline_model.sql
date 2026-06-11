alter table public.timeline_items
  add column if not exists item_key text,
  add column if not exists stage text not null default 'upcoming',
  add column if not exists sort_order integer not null default 100,
  add column if not exists created_by_profile_id uuid references public.profiles (id) on delete set null,
  add column if not exists updated_by_profile_id uuid references public.profiles (id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'timeline_items_stage_check'
      and conrelid = 'public.timeline_items'::regclass
  ) then
    alter table public.timeline_items
      add constraint timeline_items_stage_check
      check (stage in ('current', 'upcoming', 'completed'));
  end if;
end $$;

create unique index if not exists timeline_items_tenant_application_item_key_unique_idx
  on public.timeline_items (
    tenant_id,
    coalesce(application_id, '00000000-0000-0000-0000-000000000000'::uuid),
    item_key
  )
  where item_key is not null;

create index if not exists timeline_items_tenant_stage_sort_idx
  on public.timeline_items (tenant_id, visible_to_tenant, stage, sort_order, created_at);

update public.timeline_items
set stage = case
  when completed_at is not null then 'completed'
  when type = 'action_required' then 'current'
  when title in (
    'Interest received',
    'Application submitted',
    'Application approved'
  ) then 'completed'
  else 'upcoming'
end,
sort_order = case
  when title = 'Interest received' then 10
  when title = 'Application submitted' then 20
  when title = 'Additional information requested' then 40
  when title = 'Application approved' then 50
  else sort_order
end
where stage = 'upcoming'
   or sort_order = 100;
