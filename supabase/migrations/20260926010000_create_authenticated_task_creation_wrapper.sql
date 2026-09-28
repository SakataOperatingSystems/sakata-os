-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — TASKS
-- Migration: Governed authenticated task creation wrapper
-- ============================================================

create or replace function public.create_task_for_current_user(
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
begin
    if auth.uid() is null then
        raise exception 'Authenticated user is required';
    end if;

    if not public.is_current_user_org_member(p_organization_id) then
        raise exception
            'Current user is not a member of this organization';
    end if;

    if not public.current_user_has_permission(
        p_organization_id,
        'core.tasks.manage'
    ) then
        raise exception
            'Task manage permission is required';
    end if;

    return public.create_task_internal(
        p_organization_id,
        p_title,
        p_description,
        p_priority,
        p_assigned_to_user_id,
        p_due_at
    );
end;
$function$;

revoke all on function public.create_task_for_current_user(
    uuid,
    text,
    text,
    text,
    uuid,
    timestamptz
) from public;

grant execute on function public.create_task_for_current_user(
    uuid,
    text,
    text,
    text,
    uuid,
    timestamptz
) to authenticated;

comment on function public.create_task_for_current_user(
    uuid,
    text,
    text,
    text,
    uuid,
    timestamptz
) is
'Governed authenticated task creation boundary. Validates organization membership and task management permission before delegating to the trusted internal task creation primitive.';
