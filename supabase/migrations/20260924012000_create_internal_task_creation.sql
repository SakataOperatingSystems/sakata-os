-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — TASKS
-- Migration: Trusted internal task creation boundary
-- ============================================================

create or replace function public.create_task_internal(
    p_organization_id uuid,
    p_title text,
    p_description text default null,
    p_priority text default 'normal',
    p_assigned_to_user_id uuid default null,
    p_due_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    v_task_id uuid;
begin
    if p_organization_id is null then
        raise exception 'Organization ID is required';
    end if;

    if nullif(trim(p_title), '') is null then
        raise exception 'Task title is required';
    end if;

    if p_description is not null
       and nullif(trim(p_description), '') is null then
        raise exception 'Task description cannot be empty';
    end if;

    if p_priority not in (
        'low',
        'normal',
        'high',
        'urgent'
    ) then
        raise exception 'Invalid task priority';
    end if;

    if not exists (
        select 1
        from public.organizations o
        where o.id = p_organization_id
    ) then
        raise exception 'Organization was not found';
    end if;

    if p_assigned_to_user_id is not null
       and not exists (
            select 1
            from public.organization_memberships om
            where om.organization_id = p_organization_id
              and om.user_profile_id = p_assigned_to_user_id
              and om.status = 'active'
       ) then
        raise exception
            'The task assignee must be an active organization member';
    end if;

    insert into public.tasks (
        organization_id,
        title,
        description,
        status,
        priority,
        assigned_to_user_id,
        due_at
    )
    values (
        p_organization_id,
        trim(p_title),
        nullif(trim(p_description), ''),
        'open',
        p_priority,
        p_assigned_to_user_id,
        p_due_at
    )
    returning id into v_task_id;

    return v_task_id;
end;
$function$;

revoke all on function public.create_task_internal(
    uuid,
    text,
    text,
    text,
    uuid,
    timestamptz
) from public;

revoke all on function public.create_task_internal(
    uuid,
    text,
    text,
    text,
    uuid,
    timestamptz
) from authenticated;

comment on function public.create_task_internal(
    uuid,
    text,
    text,
    text,
    uuid,
    timestamptz
) is
'Trusted internal task creation boundary for platform runtimes such as workflow and automation. Not directly callable by authenticated clients.';
