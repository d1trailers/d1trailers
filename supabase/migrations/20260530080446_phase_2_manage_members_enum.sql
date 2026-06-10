do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'manage_members'
      and enumtypid = 'public.tenant_permission'::regtype
  ) then
    alter type public.tenant_permission add value 'manage_members';
  end if;
end $$;
