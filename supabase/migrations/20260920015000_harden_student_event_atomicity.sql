-- Harden the Student -> Platform Event boundary.
--
-- Goal:
--   student INSERT
--      -> student.created event
--      -> automation job enqueue
--      -> same database transaction
--
-- The application already emits student.created after insertion.
-- The database trigger below makes the event mandatory and atomic.
-- The event emitter is made idempotent so the existing application
-- call returns the already-created event instead of creating a duplicate.

create unique index if not exists uq_platform_events_entity_event
  on public.platform_events (
    organization_id,
    event_type,
    entity_type,
    entity_id
  )
  where entity_id is not null;

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
  existing_event public.platform_events%rowtype;
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

  if p_entity_id is not null then
    select *
    into existing_event
    from public.platform_events
    where organization_id = p_organization_id
      and event_type = trim(p_event_type)
      and entity_type = trim(p_entity_type)
      and entity_id = p_entity_id
    limit 1;

    if found then
      return existing_event;
    end if;
  end if;

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
  on conflict (
    organization_id,
    event_type,
    entity_type,
    entity_id
  )
  where entity_id is not null
  do nothing
  returning *
  into inserted_event;

  if inserted_event.id is null then
    select *
    into existing_event
    from public.platform_events
    where organization_id = p_organization_id
      and event_type = trim(p_event_type)
      and entity_type = trim(p_entity_type)
      and entity_id = p_entity_id
    limit 1;

    if not found then
      raise exception 'Platform event could not be created or resolved.';
    end if;

    return existing_event;
  end if;

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

create or replace function public.emit_student_created_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.emit_platform_event(
    new.organization_id,
    'student.created',
    'student',
    new.id,
    now(),
    jsonb_build_object(
      'student_id', new.student_id,
      'full_name', new.full_name
    )
  );

  return new;
end;
$$;

revoke all on function public.emit_student_created_event()
  from public;

grant execute on function public.emit_student_created_event()
  to authenticated;

drop trigger if exists emit_student_created_platform_event
  on public.students;

create trigger emit_student_created_platform_event
after insert on public.students
for each row
execute function public.emit_student_created_event();
