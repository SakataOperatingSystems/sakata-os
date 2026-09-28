-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — AUTOMATION
-- Migration: Internal automation execution boundary
-- ============================================================
--
-- Establishes the internal execution boundary required for
-- autonomous automation workers.
--
-- Architecture:
--
--   Authenticated operator
--        |
--        v
--   authenticated wrapper
--        |
--        v
--   internal execution core
--
-- The same internal execution core can subsequently be called
-- by a trusted database scheduler/dispatcher.
--
-- No authenticated API is weakened.
-- Tenant identity remains explicit.
-- Execution failures are returned as durable failed job state.
-- ============================================================


-- ============================================================
-- INTERNAL NOTIFICATION ENGINE
-- ============================================================

create or replace function public.create_in_app_notification_internal(
    p_organization_id uuid,
    p_recipient_user_profile_id uuid,
    p_notification_type text,
    p_title text,
    p_body text,
    p_priority text default 'normal',
    p_platform_event_id uuid default null,
    p_automation_job_id uuid default null,
    p_dedupe_key text default null,
    p_metadata jsonb default '{}'::jsonb
)
returns table (
    notification_id uuid,
    delivery_id uuid,
    created boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_notification_id uuid;
    v_delivery_id uuid;
    v_existing_notification_id uuid;
    v_created boolean := false;
begin
    if p_organization_id is null then
        raise exception 'Organization ID is required.';
    end if;

    if p_recipient_user_profile_id is null then
        raise exception 'Recipient user profile ID is required.';
    end if;

    if p_notification_type is null
       or length(trim(p_notification_type)) = 0 then
        raise exception 'Notification type is required.';
    end if;

    if p_title is null
       or length(trim(p_title)) = 0 then
        raise exception 'Notification title is required.';
    end if;

    if p_body is null
       or length(trim(p_body)) = 0 then
        raise exception 'Notification body is required.';
    end if;

    if p_priority not in ('low', 'normal', 'high', 'urgent') then
        raise exception 'Invalid notification priority.';
    end if;

    if jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' then
        raise exception 'Notification metadata must be a JSON object.';
    end if;


    -- ========================================================
    -- RECIPIENT TENANT AUTHORITY
    -- ========================================================

    if not exists (
        select 1
        from public.organization_memberships om
        join public.user_profiles up
          on up.id = om.user_profile_id
        where om.organization_id = p_organization_id
          and om.user_profile_id = p_recipient_user_profile_id
          and om.status = 'active'
          and up.status = 'active'
    ) then
        raise exception
            'Recipient is not an active member of the organization.';
    end if;


    -- ========================================================
    -- SOURCE EVENT TENANT AUTHORITY
    -- ========================================================

    if p_platform_event_id is not null
       and not exists (
           select 1
           from public.platform_events pe
           where pe.id = p_platform_event_id
             and pe.organization_id = p_organization_id
       ) then
        raise exception
            'Platform event does not belong to the organization.';
    end if;


    -- ========================================================
    -- SOURCE AUTOMATION JOB TENANT AUTHORITY
    -- ========================================================

    if p_automation_job_id is not null
       and not exists (
           select 1
           from public.automation_jobs aj
           where aj.id = p_automation_job_id
             and aj.organization_id = p_organization_id
       ) then
        raise exception
            'Automation job does not belong to the organization.';
    end if;


    -- ========================================================
    -- EXPLICIT DEDUPE
    -- ========================================================

    if p_dedupe_key is not null
       and length(trim(p_dedupe_key)) > 0 then

        select n.id
        into v_existing_notification_id
        from public.notifications n
        where n.organization_id = p_organization_id
          and n.recipient_user_profile_id = p_recipient_user_profile_id
          and n.dedupe_key = trim(p_dedupe_key)
        limit 1;

        if v_existing_notification_id is not null then

            select nd.id
            into v_delivery_id
            from public.notification_deliveries nd
            where nd.organization_id = p_organization_id
              and nd.notification_id = v_existing_notification_id
              and nd.channel = 'in_app'
            limit 1;

            return query
            select
                v_existing_notification_id,
                v_delivery_id,
                false;

            return;
        end if;
    end if;


    -- ========================================================
    -- CREATE NOTIFICATION
    -- ========================================================

    insert into public.notifications (
        organization_id,
        recipient_user_profile_id,
        platform_event_id,
        automation_job_id,
        notification_type,
        title,
        body,
        priority,
        dedupe_key,
        metadata
    )
    values (
        p_organization_id,
        p_recipient_user_profile_id,
        p_platform_event_id,
        p_automation_job_id,
        trim(p_notification_type),
        trim(p_title),
        p_body,
        p_priority,
        case
            when p_dedupe_key is null then null
            else trim(p_dedupe_key)
        end,
        coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict do nothing
    returning id
    into v_notification_id;


    -- ========================================================
    -- RESOLVE EXISTING NOTIFICATION WHEN CONFLICT OCCURS
    -- ========================================================

    if v_notification_id is null then

        if p_automation_job_id is not null then
            select n.id
            into v_notification_id
            from public.notifications n
            where n.organization_id = p_organization_id
              and n.automation_job_id = p_automation_job_id
            limit 1;
        end if;

        if v_notification_id is null
           and p_platform_event_id is not null then
            select n.id
            into v_notification_id
            from public.notifications n
            where n.organization_id = p_organization_id
              and n.platform_event_id = p_platform_event_id
            limit 1;
        end if;

        if v_notification_id is null
           and p_dedupe_key is not null then
            select n.id
            into v_notification_id
            from public.notifications n
            where n.organization_id = p_organization_id
              and n.recipient_user_profile_id = p_recipient_user_profile_id
              and n.dedupe_key = trim(p_dedupe_key)
            limit 1;
        end if;

        if v_notification_id is null then
            raise exception
                'Notification creation was prevented but existing notification could not be resolved.';
        end if;

    else
        v_created := true;
    end if;


    -- ========================================================
    -- CREATE / RESOLVE IN-APP DELIVERY
    -- ========================================================

    insert into public.notification_deliveries (
        organization_id,
        notification_id,
        channel,
        status
    )
    values (
        p_organization_id,
        v_notification_id,
        'in_app',
        'queued'
    )
    on conflict on constraint notification_deliveries_org_notification_key
    do nothing
    returning id
    into v_delivery_id;


    if v_delivery_id is null then
        select nd.id
        into v_delivery_id
        from public.notification_deliveries nd
        where nd.organization_id = p_organization_id
          and nd.notification_id = v_notification_id
          and nd.channel = 'in_app'
        limit 1;
    end if;


    return query
    select
        v_notification_id,
        v_delivery_id,
        v_created;
end;
$$;


revoke all on function public.create_in_app_notification_internal(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    uuid,
    uuid,
    text,
    jsonb
) from public;

revoke all on function public.create_in_app_notification_internal(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    uuid,
    uuid,
    text,
    jsonb
) from authenticated;


comment on function public.create_in_app_notification_internal(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    uuid,
    uuid,
    text,
    jsonb
) is
'Internal notification creation engine. Not executable by authenticated clients. Preserves tenant and recipient integrity while allowing trusted autonomous automation execution.';


-- ============================================================
-- AUTHENTICATED NOTIFICATION WRAPPER
-- ============================================================

create or replace function public.create_in_app_notification(
    p_organization_id uuid,
    p_recipient_user_profile_id uuid,
    p_notification_type text,
    p_title text,
    p_body text,
    p_priority text default 'normal',
    p_platform_event_id uuid default null,
    p_automation_job_id uuid default null,
    p_dedupe_key text default null,
    p_metadata jsonb default '{}'::jsonb
)
returns table (
    notification_id uuid,
    delivery_id uuid,
    created boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_auth_user_id uuid;
begin
    select auth.uid()
    into v_auth_user_id;

    if v_auth_user_id is null then
        raise exception 'Authentication required.';
    end if;

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

    return query
    select *
    from public.create_in_app_notification_internal(
        p_organization_id,
        p_recipient_user_profile_id,
        p_notification_type,
        p_title,
        p_body,
        p_priority,
        p_platform_event_id,
        p_automation_job_id,
        p_dedupe_key,
        p_metadata
    );
end;
$$;


revoke all on function public.create_in_app_notification(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    uuid,
    uuid,
    text,
    jsonb
) from public;

grant execute on function public.create_in_app_notification(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    uuid,
    uuid,
    text,
    jsonb
) to authenticated;


-- ============================================================
-- INTERNAL AUTOMATION EXECUTOR
-- ============================================================
--
-- Execution failures are returned as durable failed state.
-- They are not re-raised after the job has been marked failed,
-- allowing the transaction to commit the failure record.
-- ============================================================

create or replace function public.execute_automation_job_internal(
    p_automation_job_id uuid
)
returns table (
    automation_job_id uuid,
    status text,
    notification_id uuid,
    delivery_id uuid,
    executed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_job public.automation_jobs%rowtype;
    v_rule public.automation_rules%rowtype;
    v_event public.platform_events%rowtype;

    v_recipient_user_profile_id uuid;

    v_notification_type text;
    v_title text;
    v_body text;
    v_priority text;
    v_dedupe_key text;

    v_notification_id uuid;
    v_delivery_id uuid;

    v_action_config jsonb;

    v_claimed boolean := false;
    v_error_message text;
begin
    -- ========================================================
    -- LOAD JOB
    -- ========================================================

    select *
    into v_job
    from public.automation_jobs
    where public.automation_jobs.id = p_automation_job_id
    for update;

    if not found then
        raise exception 'Automation job not found.';
    end if;


    -- ========================================================
    -- JOB ELIGIBILITY
    -- ========================================================

    if v_job.status <> 'queued' then
        return query
        select
            v_job.id,
            v_job.status,
            null::uuid,
            null::uuid,
            false;

        return;
    end if;

    if v_job.available_at > now() then
        return query
        select
            v_job.id,
            v_job.status,
            null::uuid,
            null::uuid,
            false;

        return;
    end if;


    -- ========================================================
    -- CLAIM
    -- ========================================================

    update public.automation_jobs
    set
        status = 'running',
        attempt_count = attempt_count + 1,
        started_at = now(),
        last_error = null,
        updated_at = now()
    where public.automation_jobs.id = v_job.id
      and public.automation_jobs.status = 'queued';

    if not found then
        return query
        select
            v_job.id,
            'running'::text,
            null::uuid,
            null::uuid,
            false;

        return;
    end if;

    v_claimed := true;


    -- ========================================================
    -- LOAD ENABLED RULE
    -- ========================================================

    select *
    into v_rule
    from public.automation_rules
    where public.automation_rules.id = v_job.automation_rule_id
      and public.automation_rules.organization_id = v_job.organization_id
      and public.automation_rules.enabled = true;

    if not found then
        raise exception
            'Enabled automation rule for this job could not be resolved.';
    end if;


    -- ========================================================
    -- LOAD EVENT
    -- ========================================================

    select *
    into v_event
    from public.platform_events
    where public.platform_events.id = v_job.platform_event_id
      and public.platform_events.organization_id = v_job.organization_id;

    if not found then
        raise exception
            'Platform event for this automation job could not be resolved.';
    end if;


    -- ========================================================
    -- ACTION CONFIGURATION
    -- ========================================================

    v_action_config := coalesce(
        v_rule.action_config,
        '{}'::jsonb
    );

    if jsonb_typeof(v_action_config) <> 'object' then
        raise exception
            'Automation action_config must be a JSON object.';
    end if;


    -- ========================================================
    -- SUPPORTED ACTION: IN-APP NOTIFICATION
    -- ========================================================

    if v_rule.action_type = 'notification.in_app' then

        v_notification_type :=
            nullif(trim(v_action_config ->> 'notification_type'), '');

        v_title :=
            nullif(trim(v_action_config ->> 'title'), '');

        v_body :=
            nullif(v_action_config ->> 'body', '');

        v_priority :=
            coalesce(
                nullif(trim(v_action_config ->> 'priority'), ''),
                'normal'
            );

        v_dedupe_key :=
            nullif(trim(v_action_config ->> 'dedupe_key'), '');


        if v_notification_type is null then
            raise exception
                'notification.in_app requires action_config.notification_type.';
        end if;

        if v_title is null then
            raise exception
                'notification.in_app requires action_config.title.';
        end if;

        if v_body is null then
            raise exception
                'notification.in_app requires action_config.body.';
        end if;

        if v_priority not in ('low', 'normal', 'high', 'urgent') then
            raise exception
                'notification.in_app has an invalid priority.';
        end if;


        -- ====================================================
        -- RECIPIENT RESOLUTION
        -- ====================================================

        case coalesce(
            nullif(trim(v_action_config ->> 'recipient_mode'), ''),
            'configured_user'
        )

        when 'configured_user' then

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
                    'configured_user requires action_config.recipient_user_profile_id.';
            end if;


        when 'event_actor' then

            v_recipient_user_profile_id :=
                v_event.actor_user_id;

            if v_recipient_user_profile_id is null then
                raise exception
                    'event_actor recipient mode requires a platform event actor.';
            end if;


        else

            raise exception
                'Unsupported notification recipient_mode.';

        end case;


        -- ====================================================
        -- EXECUTE NOTIFICATION
        -- ====================================================

        select
            r.notification_id,
            r.delivery_id
        into
            v_notification_id,
            v_delivery_id
        from public.create_in_app_notification_internal(
            p_organization_id => v_job.organization_id,
            p_recipient_user_profile_id => v_recipient_user_profile_id,
            p_notification_type => v_notification_type,
            p_title => v_title,
            p_body => v_body,
            p_priority => v_priority,
            p_platform_event_id => v_event.id,
            p_automation_job_id => v_job.id,
            p_dedupe_key => v_dedupe_key,
            p_metadata => jsonb_build_object(
                'automation_rule_id', v_rule.id,
                'automation_action_type', v_rule.action_type,
                'source', 'automation_executor'
            )
        ) r;


        -- ====================================================
        -- COMPLETE JOB
        -- ====================================================

        update public.automation_jobs
        set
            status = 'completed',
            completed_at = now(),
            updated_at = now()
        where public.automation_jobs.id = v_job.id;

        return query
        select
            v_job.id,
            'completed'::text,
            v_notification_id,
            v_delivery_id,
            true;

        return;

    else

        raise exception
            'Unsupported automation action type: %',
            v_rule.action_type;

    end if;


exception
    when others then

        v_error_message := left(sqlerrm, 2000);

        if v_claimed then
            update public.automation_jobs
            set
                status = 'failed',
                failed_at = now(),
                completed_at = null,
                last_error = v_error_message,
                updated_at = now()
            where public.automation_jobs.id = v_job.id;

            return query
            select
                v_job.id,
                'failed'::text,
                null::uuid,
                null::uuid,
                false;

            return;
        end if;

        raise;
end;
$$;


revoke all on function public.execute_automation_job_internal(uuid)
from public;

revoke all on function public.execute_automation_job_internal(uuid)
from authenticated;


comment on function public.execute_automation_job_internal(uuid) is
'Internal automation execution engine for trusted autonomous workers. Not executable by authenticated clients. Current supported action: notification.in_app. Execution failures are persisted as failed job state.';


-- ============================================================
-- AUTHENTICATED AUTOMATION EXECUTOR WRAPPER
-- ============================================================

create or replace function public.execute_automation_job(
    p_automation_job_id uuid
)
returns table (
    automation_job_id uuid,
    status text,
    notification_id uuid,
    delivery_id uuid,
    executed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_auth_user_id uuid;
    v_organization_id uuid;
begin
    select auth.uid()
    into v_auth_user_id;

    if v_auth_user_id is null then
        raise exception 'Authentication required.';
    end if;


    select aj.organization_id
    into v_organization_id
    from public.automation_jobs aj
    where aj.id = p_automation_job_id;


    if v_organization_id is null then
        raise exception 'Automation job not found.';
    end if;


    if not exists (
        select 1
        from public.user_profiles up
        join public.organization_memberships om
          on om.user_profile_id = up.id
        where up.auth_user_id = v_auth_user_id
          and up.status = 'active'
          and om.organization_id = v_organization_id
          and om.status = 'active'
    ) then
        raise exception
            'Authenticated user is not an active member of the automation job organization.';
    end if;


    return query
    select *
    from public.execute_automation_job_internal(
        p_automation_job_id
    );
end;
$$;


revoke all on function public.execute_automation_job(uuid)
from public;

grant execute on function public.execute_automation_job(uuid)
to authenticated;


comment on function public.execute_automation_job(uuid) is
'Authenticated operator-facing automation executor. Enforces caller tenant membership, then delegates to the internal automation execution engine.';


-- ============================================================
-- COMPLETE
-- ============================================================
