do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'tenant_message'
      and enumtypid = 'public.communication_event_type'::regtype
  ) then
    alter type public.communication_event_type add value 'tenant_message';
  end if;
end $$;
