-- SAKATA OS Platform Automation Foundation
--
-- Event -> Rule -> Durable Job
--
-- This migration does not execute business actions yet.
-- It establishes the controlled, tenant-scoped automation handoff.

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  name text not null,

  description text,

  event_type text not null,

  entity_type text,

  action_type text not null,

  action_config jsonb not null default '{}'::jsonb,

  enabled boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint automation_rules_name_valid
    check (length(trim(name)) > 0),

  constraint automation_rules_event_type_valid
    check (length(trim(event_type)) > 0),

  constraint automation_rules_entity_type_valid
    check (
      entity_type is null
      or length(trim(entity_type)) > 0
    ),

  constraint automation_rules_action_type_valid
    check (length(trim(action_type)) > 0),

  constraint automation_rules_action_config_object
    check (jsonb_typeof(action_config) = 'object')
);

create index if not exists idx_automation_rules_organization
  on public.automation_rules (organization_id);

create index if not exists idx_automation_rules_event
  on public.automation_rules (
    organization_id,
    event_type,
    enabled
  );

create table if not exists public.automation_jobs (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  automation_rule_id uuid not null
    references public.automation_rules(id)
    on delete restrict,

  platform_event_id uuid not null
    references public.platform_events(id)
    on delete restrict,

  status text not null default 'queued',

  attempt_count integer not null default 0,

  available_at timestamptz not null default now(),

  started_at timestamptz,

  completed_at timestamptz,

  failed_at timestamptz,

  last_error text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint automation_jobs_status_valid
    check (
      status in (
        'queued',
        'running',
        'completed',
        'failed',
        'cancelled'
      )
    ),

  constraint automation_jobs_attempt_count_valid
    check (attempt_count >= 0),

  constraint automation_jobs_organization_event_unique
    unique (
      organization_id,
      automation_rule_id,
      platform_event_id
    )
);

create index if not exists idx_automation_jobs_queue
  on public.automation_jobs (
    organization_id,
    status,
    available_at
  );

create index if not exists idx_automation_jobs_rule
  on public.automation_jobs (
    automation_rule_id,
    status
  );

create index if not exists idx_automation_jobs_event
  on public.automation_jobs (
    platform_event_id
  );

alter table public.automation_rules
  enable row level security;

alter table public.automation_jobs
  enable row level security;

revoke all on public.automation_rules from anon;
revoke all on public.automation_rules from authenticated;

revoke all on public.automation_jobs from anon;
revoke all on public.automation_jobs from authenticated;

drop policy if exists automation_rules_member_select
  on public.automation_rules;

create policy automation_rules_member_select
on public.automation_rules
for select
to authenticated
using (
  public.is_current_user_org_member(organization_id)
);

drop policy if exists automation_jobs_member_select
  on public.automation_jobs;

create policy automation_jobs_member_select
on public.automation_jobs
for select
to authenticated
using (
  public.is_current_user_org_member(organization_id)
);

create or replace function public.enqueue_automation_jobs_for_event(
  p_event_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_record public.platform_events%rowtype;
  inserted_count integer;
begin
  select *
  into event_record
  from public.platform_events
  where id = p_event_id;

  if not found then
    raise exception 'Platform event not found.';
  end if;

  if not public.is_current_user_org_member(event_record.organization_id) then
    raise exception 'Organization membership required.';
  end if;

  insert into public.automation_jobs (
    organization_id,
    automation_rule_id,
    platform_event_id,
    status,
    available_at
  )
  select
    event_record.organization_id,
    rule.id,
    event_record.id,
    'queued',
    now()
  from public.automation_rules rule
  where rule.organization_id = event_record.organization_id
    and rule.enabled = true
    and rule.event_type = event_record.event_type
    and (
      rule.entity_type is null
      or rule.entity_type = event_record.entity_type
    )
  on conflict (
    organization_id,
    automation_rule_id,
    platform_event_id
  )
  do nothing;

  get diagnostics inserted_count = row_count;

  return inserted_count;
end;
$$;

revoke all on function public.enqueue_automation_jobs_for_event(uuid)
  from public;

grant execute on function public.enqueue_automation_jobs_for_event(uuid)
  to authenticated;

create or replace function public.emit_platform_event(
  p_organization_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_occurred_at timestamptz default now(),
  p_payload jsonb default '{}'::jsonb
)
returns public.platform_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_event public.platform_events%rowtype;
  actor_id uuid;
begin
  if p_organization_id is null then
    raise exception 'Organization ID is required.';
  end if;

  if p_event_type is null
     or length(trim(p_event_type)) = 0 then
    raise exception 'Event type is required.';
  end if;

  if p_entity_type is null
     or length(trim(p_entity_type)) = 0 then
    raise exception 'Entity type is required.';
  end if;

  if p_payload is null then
    p_payload := '{}'::jsonb;
  end if;

  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Platform event payload must be a JSON object.';
  end if;

  if not public.is_current_user_org_member(p_organization_id) then
    raise exception 'Organization membership required.';
  end if;

  select up.id
  into actor_id
  from public.user_profiles up
  where up.auth_user_id = auth.uid()
    and up.organization_id = p_organization_id
  limit 1;

  insert into public.platform_events (
    organization_id,
    event_type,
    entity_type,
    entity_id,
    actor_user_id,
    occurred_at,
    payload
  )
  values (
    p_organization_id,
    trim(p_event_type),
    trim(p_entity_type),
    p_entity_id,
    actor_id,
    coalesce(p_occurred_at, now()),
    p_payload
  )
  returning *
  into inserted_event;

  perform public.enqueue_automation_jobs_for_event(
    inserted_event.id
  );

  return inserted_event;
end;
$$;

revoke all on function public.emit_platform_event(
  uuid,
  text,
  text,
  uuid,
  timestamptz,
  jsonb
) from public;

grant execute on function public.emit_platform_event(
  uuid,
  text,
  text,
  uuid,
  timestamptz,
  jsonb
) to authenticated;
