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
as $function$
declare
    v_actor_user_id uuid;
    v_event public.platform_events%rowtype;
begin
    if p_organization_id is null then
        raise exception 'Organization ID is required.';
    end if;

    if nullif(trim(p_event_type), '') is null then
        raise exception 'Event type is required.';
    end if;

    if nullif(trim(p_entity_type), '') is null then
        raise exception 'Entity type is required.';
    end if;

    if p_payload is null then
        p_payload := '{}'::jsonb;
    end if;

    if jsonb_typeof(p_payload) <> 'object' then
        raise exception 'Platform event payload must be a JSON object.';
    end if;

    if not public.is_current_user_org_member(
        p_organization_id
    ) then
        raise exception
            'The current user is not an active member of the requested organization.';
    end if;

    select up.id
    into v_actor_user_id
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.status = 'active';

    if v_actor_user_id is null then
        raise exception
            'Active user profile was not found for the current user.';
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
        v_actor_user_id,
        coalesce(p_occurred_at, now()),
        p_payload
    )
    returning *
    into v_event;

    return v_event;
end;
$function$;

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

comment on function public.emit_platform_event(uuid, text, text, uuid, timestamptz, jsonb) is
'Trusted tenant-scoped platform event emission. Derives the authenticated actor from the current session and writes an immutable platform event.';
