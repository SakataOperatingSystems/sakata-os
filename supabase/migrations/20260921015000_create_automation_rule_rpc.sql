-- ============================================================
-- SAKATA OS
-- Migration: Controlled Automation Rule Creation
-- ============================================================
--
-- Establishes the server-side governance boundary for creating
-- tenant-scoped automation rules.
--
-- Current supported action:
--   notification.in_app
--
-- Direct authenticated INSERT on automation_rules remains
-- prohibited.
-- ============================================================


create or replace function public.create_automation_rule(
    p_organization_id uuid,
    p_name text,
    p_description text default null,
    p_event_type text default null,
    p_entity_type text default null,
    p_action_type text default null,
    p_action_config jsonb default '{}'::jsonb,
    p_enabled boolean default true
)
returns public.automation_rules
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_auth_user_id uuid;
    v_rule public.automation_rules%rowtype;
    v_action_config jsonb;
    v_recipient_mode text;
    v_recipient_user_profile_id uuid;
begin
    -- ========================================================
    -- AUTHENTICATION
    -- ========================================================

    select auth.uid()
    into v_auth_user_id;

    if v_auth_user_id is null then
        raise exception 'Authentication required.';
    end if;


    -- ========================================================
    -- BASIC INPUT VALIDATION
    -- ========================================================

    if p_organization_id is null then
        raise exception 'Organization ID is required.';
    end if;

    if p_name is null or length(trim(p_name)) = 0 then
        raise exception 'Automation rule name is required.';
    end if;

    if p_event_type is null or length(trim(p_event_type)) = 0 then
        raise exception 'Automation rule event type is required.';
    end if;

    if p_entity_type is not null
       and length(trim(p_entity_type)) = 0 then
        raise exception 'Automation rule entity type cannot be empty.';
    end if;

    if p_action_type is null or length(trim(p_action_type)) = 0 then
        raise exception 'Automation rule action type is required.';
    end if;

    v_action_config := coalesce(
        p_action_config,
        '{}'::jsonb
    );

    if jsonb_typeof(v_action_config) <> 'object' then
        raise exception
            'Automation action_config must be a JSON object.';
    end if;


    -- ========================================================
    -- CALLER TENANT AUTHORITY
    -- ========================================================

    if not exists (
        select 1
        from public.user_profiles up
        join public.organization_memberships om
          on om.user_profile_id = up.id
        where up.auth_user_id = v_auth_user_id
          and up.status = 'active'
          and om.organization_id = p_organization_id
          and om.status = 'active'
    ) then
        raise exception
            'Authenticated user is not an active member of the organization.';
    end if;


    -- ========================================================
    -- CURRENT ACTION GOVERNANCE
    -- ========================================================

    if p_action_type <> 'notification.in_app' then
        raise exception
            'Unsupported automation action type: %',
            p_action_type;
    end if;


    -- ========================================================
    -- NOTIFICATION ACTION VALIDATION
    -- ========================================================

    if nullif(
        trim(v_action_config ->> 'notification_type'),
        ''
    ) is null then
        raise exception
            'notification.in_app requires notification_type.';
    end if;

    if nullif(
        trim(v_action_config ->> 'title'),
        ''
    ) is null then
        raise exception
            'notification.in_app requires title.';
    end if;

    if nullif(
        v_action_config ->> 'body',
        ''
    ) is null then
        raise exception
            'notification.in_app requires body.';
    end if;

    if coalesce(
        nullif(
            trim(v_action_config ->> 'priority'),
            ''
        ),
        'normal'
    ) not in ('low', 'normal', 'high', 'urgent') then
        raise exception
            'notification.in_app has an invalid priority.';
    end if;


    -- ========================================================
    -- RECIPIENT GOVERNANCE
    -- ========================================================

    v_recipient_mode := coalesce(
        nullif(
            trim(v_action_config ->> 'recipient_mode'),
            ''
        ),
        'configured_user'
    );

    if v_recipient_mode not in (
        'configured_user',
        'event_actor'
    ) then
        raise exception
            'Unsupported notification recipient_mode: %',
            v_recipient_mode;
    end if;


    if v_recipient_mode = 'configured_user' then

        begin
            v_recipient_user_profile_id :=
                nullif(
                    trim(
                        v_action_config
                            ->> 'recipient_user_profile_id'
                    ),
                    ''
                )::uuid;
        exception
            when invalid_text_representation then
                raise exception
                    'configured_user recipient_user_profile_id must be a valid UUID.';
        end;

        if v_recipient_user_profile_id is null then
            raise exception
                'configured_user requires recipient_user_profile_id.';
        end if;

        if not exists (
            select 1
            from public.organization_memberships om
            join public.user_profiles up
              on up.id = om.user_profile_id
            where om.organization_id = p_organization_id
              and om.user_profile_id = v_recipient_user_profile_id
              and om.status = 'active'
              and up.status = 'active'
        ) then
            raise exception
                'Configured notification recipient is not an active member of the organization.';
        end if;

    end if;


    -- ========================================================
    -- CREATE RULE
    -- ========================================================

    insert into public.automation_rules (
        organization_id,
        name,
        description,
        event_type,
        entity_type,
        action_type,
        action_config,
        enabled
    )
    values (
        p_organization_id,
        trim(p_name),
        nullif(trim(coalesce(p_description, '')), ''),
        trim(p_event_type),
        nullif(trim(coalesce(p_entity_type, '')), ''),
        trim(p_action_type),
        v_action_config,
        coalesce(p_enabled, true)
    )
    returning *
    into v_rule;


    return v_rule;
end;
$$;


-- ============================================================
-- CONTROLLED EXECUTION RIGHTS
-- ============================================================

revoke all on function public.create_automation_rule(
    uuid,
    text,
    text,
    text,
    text,
    text,
    jsonb,
    boolean
)
from public;

grant execute on function public.create_automation_rule(
    uuid,
    text,
    text,
    text,
    text,
    text,
    jsonb,
    boolean
)
to authenticated;


comment on function public.create_automation_rule(
    uuid,
    text,
    text,
    text,
    text,
    text,
    jsonb,
    boolean
) is
'Creates a tenant-scoped automation rule through a governed server-side boundary. Current supported action: notification.in_app. Direct table INSERT remains prohibited.';


-- ============================================================
-- COMPLETE
-- ============================================================
