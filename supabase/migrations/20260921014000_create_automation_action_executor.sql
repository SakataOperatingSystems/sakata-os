-- ============================================================
-- SAKATA OS
-- Migration: Automation Action Executor
-- ============================================================
--
-- Connects the existing automation job queue to reusable
-- operational actions.
--
-- Current supported action:
--   notification.in_app
--
-- Recipient modes:
--   configured_user
--   event_actor
--
-- Architecture:
--
--   Platform Event
--        ?
--   Automation Rule
--        ?
--   Automation Job
--        ?
--   Action Executor
--        ?
--   Notification
--
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
    -- LOAD JOB
    -- ========================================================

    select *
    into v_job
    from public.automation_jobs
    where id = p_automation_job_id
    for update;

    if not found then
        raise exception 'Automation job not found.';
    end if;


    -- ========================================================
    -- CALLER MUST BELONG TO JOB TENANT
    -- ========================================================

    if not exists (
        select 1
        from public.user_profiles up
        join public.organization_memberships om
          on om.user_profile_id = up.id
        where up.auth_user_id = v_auth_user_id
          and up.status = 'active'
          and om.organization_id = v_job.organization_id
          and om.status = 'active'
    ) then
        raise exception
            'Authenticated user is not an active member of the automation job organization.';
    end if;


    -- ========================================================
    -- JOB CLAIM
    -- ========================================================
    --
    -- Only queued jobs whose available_at has arrived may be
    -- executed.
    --
    -- Already completed/failed/cancelled jobs are not silently
    -- executed again.
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


    update public.automation_jobs
    set
        status = 'running',
        attempt_count = attempt_count + 1,
        started_at = now(),
        last_error = null,
        updated_at = now()
    where id = v_job.id
      and status = 'queued';

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
    -- LOAD AUTOMATION RULE
    -- ========================================================

    select *
    into v_rule
    from public.automation_rules
    where id = v_job.automation_rule_id
      and organization_id = v_job.organization_id
      and enabled = true;

    if not found then
        raise exception
            'Enabled automation rule for this job could not be resolved.';
    end if;


    -- ========================================================
    -- LOAD PLATFORM EVENT
    -- ========================================================

    select *
    into v_event
    from public.platform_events
    where id = v_job.platform_event_id
      and organization_id = v_job.organization_id;

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
        from public.create_in_app_notification(
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
        where id = v_job.id;

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

        if v_claimed then
            update public.automation_jobs
            set
                status = 'failed',
                failed_at = now(),
                last_error = left(sqlerrm, 2000),
                updated_at = now()
            where id = v_job.id;
        end if;

        raise;
end;
$$;


-- ============================================================
-- CONTROLLED EXECUTION RIGHTS
-- ============================================================

revoke all on function public.execute_automation_job(uuid)
from public;

grant execute on function public.execute_automation_job(uuid)
to authenticated;


-- ============================================================
-- DOCUMENTATION
-- ============================================================

comment on function public.execute_automation_job(uuid) is
'Executes one queued tenant-scoped automation job through a bounded action executor. Current supported action: notification.in_app.';


-- ============================================================
-- COMPLETE
-- ============================================================
