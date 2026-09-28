-- ============================================================
-- SAKATA OS
-- Migration: Fix Notification Creation Ambiguity
-- ============================================================
--
-- Corrects PL/pgSQL ambiguity between the notification_id
-- output parameter and the notification_deliveries column
-- used by the ON CONFLICT target.
--
-- No schema change.
-- No product-data.sql change.
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
    v_notification_id uuid;
    v_delivery_id uuid;
    v_existing_notification_id uuid;
    v_created boolean := false;
begin
    select auth.uid()
    into v_auth_user_id;

    if v_auth_user_id is null then
        raise exception 'Authentication required.';
    end if;

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

    -- Authenticated caller must belong to the organization.
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

    -- Recipient must be an active member of the same organization.
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

    -- Source event must belong to the same organization.
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

    -- Source automation job must belong to the same organization.
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

    -- Explicit dedupe key prevents duplicate notification intent.
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
    returning id into v_notification_id;

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
    returning id into v_delivery_id;

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
-- COMPLETE
-- ============================================================
