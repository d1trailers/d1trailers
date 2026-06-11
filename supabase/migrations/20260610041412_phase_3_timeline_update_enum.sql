do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'timeline_update'
      and enumtypid = 'public.communication_event_type'::regtype
  ) then
    alter type public.communication_event_type add value 'timeline_update';
  end if;
end $$;
