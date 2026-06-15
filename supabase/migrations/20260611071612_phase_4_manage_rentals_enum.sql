do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'manage_rentals'
      and enumtypid = 'public.tenant_permission'::regtype
  ) then
    alter type public.tenant_permission add value 'manage_rentals';
  end if;
end $$;
