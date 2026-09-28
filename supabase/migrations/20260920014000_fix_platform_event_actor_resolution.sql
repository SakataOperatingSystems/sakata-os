-- Correct platform event actor resolution.
--
-- user_profiles does not contain organization_id.
-- Organization membership is represented by:
-- organization_memberships.organization_id
-- organization_memberships.user_profile_id -> user_profiles.id
--
-- The event remains tenant-scoped and automation enqueue remains
-- part of the trusted event-emission path.

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
  inner join public.organization_memberships om
    on om.user_profile_id = up.id
   and om.organization_id = p_organization_id
  where up.auth_user_id = auth.uid()
  order by om.created_at desc
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
