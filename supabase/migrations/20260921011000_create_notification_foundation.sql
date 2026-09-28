-- ============================================================
-- SAKATA OS
-- Migration: Core Notification Foundation
-- ============================================================
--
-- Purpose:
--   Establish the reusable notification intent + delivery
--   foundation for the Core Platform.
--
-- Current supported delivery channel:
--   in_app
--
-- Provider channels such as email, SMS and WhatsApp are NOT
-- implemented here. They can be added later without changing
-- the notification intent model.
--
-- Architecture:
--
--   Platform Event
--        ?
--   Automation Rule
--        ?
--   Automation Job
--        ?
--   Notification
--        ?
--   Notification Delivery
--        ?
--   Recipient
--
-- ============================================================


-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table public.notifications (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null
        references public.organizations(id)
        on delete restrict,

    recipient_user_profile_id uuid not null
        references public.user_profiles(id)
        on delete restrict,

    platform_event_id uuid
        references public.platform_events(id)
        on delete restrict,

    automation_job_id uuid
        references public.automation_jobs(id)
        on delete restrict,

    notification_type text not null,

    title text not null,

    body text not null,

    priority text not null default 'normal'
        check (priority in ('low', 'normal', 'high', 'urgent')),

    status text not null default 'unread'
        check (status in ('unread', 'read', 'archived')),

    dedupe_key text,

    metadata jsonb not null default '{}'::jsonb
        check (jsonb_typeof(metadata) = 'object'::text),

    created_at timestamptz not null default now(),

    read_at timestamptz,

    archived_at timestamptz,

    updated_at timestamptz not null default now(),

    constraint notifications_notification_type_nonempty
        check (length(trim(notification_type)) > 0),

    constraint notifications_title_nonempty
        check (length(trim(title)) > 0),

    constraint notifications_body_nonempty
        check (length(trim(body)) > 0),

    constraint notifications_dedupe_key_nonempty
        check (
            dedupe_key is null
            or length(trim(dedupe_key)) > 0
        ),

    constraint notifications_read_state_consistency
        check (
            (status = 'unread' and read_at is null)
            or
            (status = 'read' and read_at is not null)
            or
            (status = 'archived')
        ),

    constraint notifications_archive_state_consistency
        check (
            status <> 'archived'
            or archived_at is not null
        ),

    constraint notifications_platform_event_org_key
        unique (organization_id, platform_event_id),

    constraint notifications_automation_job_org_key
        unique (organization_id, automation_job_id)
);


-- The unique source constraints above intentionally allow only
-- one notification per organization + source event/job.
--
-- This prevents repeated automation execution from generating
-- duplicate notification intent for the same source.


create index notifications_organization_id_idx
    on public.notifications (organization_id);

create index notifications_recipient_user_profile_id_idx
    on public.notifications (recipient_user_profile_id);

create index notifications_recipient_status_idx
    on public.notifications (
        organization_id,
        recipient_user_profile_id,
        status,
        created_at desc
    );

create index notifications_created_at_idx
    on public.notifications (
        organization_id,
        created_at desc
    );

create index notifications_notification_type_idx
    on public.notifications (
        organization_id,
        notification_type
    );


-- ============================================================
-- NOTIFICATION DELIVERIES
-- ============================================================
--
-- A notification represents intent.
--
-- A delivery represents an attempt/state on a concrete channel.
--
-- This separation allows one notification to eventually have:
--
--   in_app
--   email
--   sms
--   whatsapp
--   future channels
--
-- without duplicating notification intent.
-- ============================================================

create table public.notification_deliveries (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null
        references public.organizations(id)
        on delete restrict,

    notification_id uuid not null
        references public.notifications(id)
        on delete restrict,

    channel text not null
        check (channel in ('in_app')),

    status text not null default 'queued'
        check (
            status in (
                'queued',
                'processing',
                'delivered',
                'failed',
                'cancelled'
            )
        ),

    attempt_count integer not null default 0
        check (attempt_count >= 0),

    available_at timestamptz not null default now(),

    started_at timestamptz,

    delivered_at timestamptz,

    failed_at timestamptz,

    last_error text,

    provider text,

    provider_message_id text,

    metadata jsonb not null default '{}'::jsonb
        check (jsonb_typeof(metadata) = 'object'::text),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint notification_deliveries_org_notification_key
        unique (organization_id, notification_id, channel),

    constraint notification_deliveries_status_consistency
        check (
            (status <> 'delivered' or delivered_at is not null)
            and
            (status <> 'failed' or failed_at is not null)
        )
);


create index notification_deliveries_organization_id_idx
    on public.notification_deliveries (organization_id);

create index notification_deliveries_notification_id_idx
    on public.notification_deliveries (notification_id);

create index notification_deliveries_queue_idx
    on public.notification_deliveries (
        organization_id,
        status,
        available_at
    );


-- ============================================================
-- TENANT INTEGRITY
-- ============================================================
--
-- PostgreSQL foreign keys cannot by themselves guarantee that
-- organization_id matches the organization of:
--
--   recipient_user_profile_id
--   platform_event_id
--   automation_job_id
--   notification_id
--
-- These triggers enforce that boundary.
-- ============================================================

create or replace function public.validate_notification_tenant_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_exists boolean;
begin
    select exists (
        select 1
        from public.organization_memberships om
        where om.organization_id = new.organization_id
          and om.user_profile_id = new.recipient_user_profile_id
          and om.status = 'active'
    )
    into v_exists;

    if not v_exists then
        raise exception
            'Notification recipient is not an active member of the organization.';
    end if;

    if new.platform_event_id is not null then
        select exists (
            select 1
            from public.platform_events pe
            where pe.id = new.platform_event_id
              and pe.organization_id = new.organization_id
        )
        into v_exists;

        if not v_exists then
            raise exception
                'Notification platform event does not belong to the organization.';
        end if;
    end if;

    if new.automation_job_id is not null then
        select exists (
            select 1
            from public.automation_jobs aj
            where aj.id = new.automation_job_id
              and aj.organization_id = new.organization_id
        )
        into v_exists;

        if not v_exists then
            raise exception
                'Notification automation job does not belong to the organization.';
        end if;
    end if;

    return new;
end;
$$;


drop trigger if exists notifications_tenant_identity_trigger
    on public.notifications;

create trigger notifications_tenant_identity_trigger
before insert or update
on public.notifications
for each row
execute function public.validate_notification_tenant_identity();


create or replace function public.validate_notification_delivery_tenant_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_notification_organization_id uuid;
begin
    select organization_id
    into v_notification_organization_id
    from public.notifications
    where id = new.notification_id;

    if v_notification_organization_id is null then
        raise exception
            'Notification delivery references an unknown notification.';
    end if;

    if v_notification_organization_id <> new.organization_id then
        raise exception
            'Notification delivery organization does not match notification organization.';
    end if;

    return new;
end;
$$;


drop trigger if exists notification_deliveries_tenant_identity_trigger
    on public.notification_deliveries;

create trigger notification_deliveries_tenant_identity_trigger
before insert or update
on public.notification_deliveries
for each row
execute function public.validate_notification_delivery_tenant_identity();


-- ============================================================
-- NOTIFICATION CREATION RPC
-- ============================================================
--
-- This is the controlled server-side entry point.
--
-- It:
--   1. verifies organization membership
--   2. verifies recipient membership
--   3. optionally verifies source event/job tenancy
--   4. creates notification intent
--   5. creates the in-app delivery
--   6. is idempotent through source/dedupe constraints
--
-- This does NOT send email/SMS/WhatsApp.
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

    -- Resolve the authenticated user to an active membership.
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

    -- Recipient must belong to the same organization.
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

    -- Dedupe by explicit key when supplied.
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

        if v_notification_id is null and p_platform_event_id is not null then
            select n.id
            into v_notification_id
            from public.notifications n
            where n.organization_id = p_organization_id
              and n.platform_event_id = p_platform_event_id
            limit 1;
        end if;

        if v_notification_id is null and p_dedupe_key is not null then
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
    on conflict (
        organization_id,
        notification_id,
        channel
    )
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


-- ============================================================
-- CONTROLLED EXECUTION RIGHTS
-- ============================================================

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
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.notifications enable row level security;

alter table public.notification_deliveries enable row level security;


-- ============================================================
-- READ ACCESS
-- ============================================================
--
-- Organization members can see notifications addressed to
-- their own user profile.
--
-- Delivery records follow the same recipient boundary.
-- ============================================================

create policy notifications_select_own
on public.notifications
for select
to authenticated
using (
    exists (
        select 1
        from public.organization_memberships om
        join public.user_profiles up
          on up.id = om.user_profile_id
        where om.organization_id = notifications.organization_id
          and om.user_profile_id = notifications.recipient_user_profile_id
          and om.status = 'active'
          and up.auth_user_id = auth.uid()
          and up.status = 'active'
    )
);


create policy notification_deliveries_select_own
on public.notification_deliveries
for select
to authenticated
using (
    exists (
        select 1
        from public.notifications n
        join public.organization_memberships om
          on om.organization_id = n.organization_id
         and om.user_profile_id = n.recipient_user_profile_id
        join public.user_profiles up
          on up.id = om.user_profile_id
        where n.id = notification_deliveries.notification_id
          and om.status = 'active'
          and up.auth_user_id = auth.uid()
          and up.status = 'active'
    )
);


-- No direct authenticated INSERT/UPDATE/DELETE rights.
-- Controlled mutation happens through server-side functions
-- and future notification delivery workers.


revoke insert, update, delete
on public.notifications
from authenticated;

revoke insert, update, delete
on public.notification_deliveries
from authenticated;


-- ============================================================
-- IMMUTABILITY / AUDITABLE DELIVERY HISTORY
-- ============================================================
--
-- Notification intent is operational state and can move:
-- unread ? read ? archived.
--
-- Delivery records are operational state and can move through
-- the delivery lifecycle.
--
-- The underlying source platform events remain immutable.
-- ============================================================

comment on table public.notifications is
'Tenant-scoped notification intent. Represents what the platform wants a recipient to know or act upon.';

comment on table public.notification_deliveries is
'Tenant-scoped delivery state for notification intent. Currently supports in-app delivery; external providers may be added later.';

comment on column public.notifications.recipient_user_profile_id is
'Organization-scoped recipient identity. External contacts are intentionally not coupled into this first Core Platform slice.';

comment on column public.notifications.platform_event_id is
'Optional immutable platform event that caused the notification.';

comment on column public.notifications.automation_job_id is
'Optional automation job that produced the notification.';

comment on column public.notifications.dedupe_key is
'Optional business idempotency key preventing duplicate notification intent for the same recipient and organization.';

comment on column public.notification_deliveries.channel is
'Concrete delivery channel. Current implementation supports in_app only.';


-- ============================================================
-- COMPLETE
-- ============================================================

