do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.rental_request_kind'::regtype
      and enumlabel = 'modification_request'
  ) then
    alter type public.rental_request_kind add value 'modification_request';
  end if;
end $$;
