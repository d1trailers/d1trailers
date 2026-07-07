create table if not exists public.docusign_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  display_name text not null,
  docusign_template_id text not null,
  role_name text not null default 'tenant_signer',
  required boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 100,
  tab_config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists docusign_templates_active_sort_idx
  on public.docusign_templates (active, required, sort_order, created_at);

create table if not exists public.rental_signing_packets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  rental_id uuid not null references public.rentals (id) on delete cascade,
  docusign_envelope_id text unique,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'in_progress', 'completed', 'declined', 'voided', 'failed')),
  signer_profile_id uuid references public.profiles (id) on delete set null,
  signer_name text,
  signer_email text not null,
  document_count integer not null default 0,
  billing_activation_status text not null default 'pending'
    check (billing_activation_status in ('pending', 'ready', 'completed', 'failed', 'skipped')),
  billing_checkout_url text,
  billing_checkout_session_id text,
  billing_error_message text,
  completed_at timestamptz,
  declined_at timestamptz,
  voided_at timestamptz,
  last_synced_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists rental_signing_packets_tenant_idx
  on public.rental_signing_packets (tenant_id);

create index if not exists rental_signing_packets_rental_idx
  on public.rental_signing_packets (rental_id);

create index if not exists rental_signing_packets_status_idx
  on public.rental_signing_packets (status);

create unique index if not exists rental_signing_packets_active_rental_idx
  on public.rental_signing_packets (rental_id)
  where status in ('draft', 'sent', 'in_progress');

create table if not exists public.rental_signing_packet_documents (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.rental_signing_packets (id) on delete cascade,
  rental_id uuid not null references public.rentals (id) on delete cascade,
  template_id uuid references public.docusign_templates (id) on delete set null,
  docusign_document_id text,
  document_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'signed', 'stored', 'failed')),
  bucket text,
  storage_path text,
  rental_document_id uuid references public.rental_documents (id) on delete set null,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (packet_id, docusign_document_id)
);

create index if not exists rental_signing_packet_documents_packet_idx
  on public.rental_signing_packet_documents (packet_id, sort_order);

create index if not exists rental_signing_packet_documents_rental_idx
  on public.rental_signing_packet_documents (rental_id);

create table if not exists public.docusign_events (
  id uuid primary key default gen_random_uuid(),
  event_hash text not null unique,
  event_type text not null,
  docusign_envelope_id text,
  packet_id uuid references public.rental_signing_packets (id) on delete set null,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processed', 'failed', 'skipped')),
  error_message text,
  raw_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists docusign_events_envelope_idx
  on public.docusign_events (docusign_envelope_id);

create index if not exists docusign_events_status_idx
  on public.docusign_events (processing_status);

alter table public.docusign_templates enable row level security;
alter table public.rental_signing_packets enable row level security;
alter table public.rental_signing_packet_documents enable row level security;
alter table public.docusign_events enable row level security;

grant select on public.docusign_templates to authenticated;
grant select on public.rental_signing_packets to authenticated;
grant select on public.rental_signing_packet_documents to authenticated;
grant select on public.docusign_events to authenticated;

drop policy if exists "docusign_templates_select_active_or_staff" on public.docusign_templates;
create policy "docusign_templates_select_active_or_staff"
  on public.docusign_templates for select
  to authenticated
  using (active = true or public.is_staff_member());

drop policy if exists "rental_signing_packets_select_member_or_staff" on public.rental_signing_packets;
create policy "rental_signing_packets_select_member_or_staff"
  on public.rental_signing_packets for select
  to authenticated
  using (public.is_staff_member() or public.is_tenant_member(tenant_id));

drop policy if exists "rental_signing_packet_documents_select_member_or_staff" on public.rental_signing_packet_documents;
create policy "rental_signing_packet_documents_select_member_or_staff"
  on public.rental_signing_packet_documents for select
  to authenticated
  using (
    public.is_staff_member()
    or exists (
      select 1
      from public.rental_signing_packets rsp
      where rsp.id = packet_id
        and public.is_tenant_member(rsp.tenant_id)
    )
  );

drop policy if exists "docusign_events_select_staff" on public.docusign_events;
create policy "docusign_events_select_staff"
  on public.docusign_events for select
  to authenticated
  using (public.is_staff_member());

drop trigger if exists docusign_templates_set_updated_at on public.docusign_templates;
create trigger docusign_templates_set_updated_at before update on public.docusign_templates
for each row execute procedure public.set_updated_at();

drop trigger if exists rental_signing_packets_set_updated_at on public.rental_signing_packets;
create trigger rental_signing_packets_set_updated_at before update on public.rental_signing_packets
for each row execute procedure public.set_updated_at();

drop trigger if exists rental_signing_packet_documents_set_updated_at on public.rental_signing_packet_documents;
create trigger rental_signing_packet_documents_set_updated_at before update on public.rental_signing_packet_documents
for each row execute procedure public.set_updated_at();

drop trigger if exists docusign_events_set_updated_at on public.docusign_events;
create trigger docusign_events_set_updated_at before update on public.docusign_events
for each row execute procedure public.set_updated_at();
