-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — TASKS
-- Migration: Reusable tenant-scoped task foundation
-- ============================================================

create table public.tasks (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    title text not null,

    description text,

    status text not null default 'open',

    priority text not null default 'normal',

    assigned_to_user_id uuid,

    due_at timestamptz,

    completed_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint tasks_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint tasks_assignee_membership_fkey
        foreign key (
            organization_id,
            assigned_to_user_id
        )
        references public.organization_memberships (
            organization_id,
            user_profile_id
        )
        on delete restrict,

    constraint tasks_title_not_empty
        check (length(trim(title)) > 0),

    constraint tasks_description_not_empty
        check (
            description is null
            or length(trim(description)) > 0
        ),

    constraint tasks_status_check
        check (
            status in (
                'open',
                'in_progress',
                'completed',
                'cancelled'
            )
        ),

    constraint tasks_priority_check
        check (
            priority in (
                'low',
                'normal',
                'high',
                'urgent'
            )
        )
);

create index tasks_organization_id_idx
    on public.tasks(organization_id);

create index tasks_assigned_to_user_id_idx
    on public.tasks(
        organization_id,
        assigned_to_user_id
    );

create index tasks_status_idx
    on public.tasks(
        organization_id,
        status
    );

create index tasks_priority_idx
    on public.tasks(
        organization_id,
        priority
    );

create index tasks_due_at_idx
    on public.tasks(
        organization_id,
        due_at
    );

alter table public.tasks enable row level security;

grant select on table public.tasks to authenticated;
grant insert, update on table public.tasks to authenticated;

create policy "organization members can read tasks"
on public.tasks
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

create policy "organization members with task manage permission can insert tasks"
on public.tasks
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'core.tasks.manage'
    )
    and (
        assigned_to_user_id is null
        or exists (
            select 1
            from public.organization_memberships om
            where om.organization_id = tasks.organization_id
              and om.user_profile_id = tasks.assigned_to_user_id
              and om.status = 'active'
        )
    )
);

create policy "organization members with task manage permission can update tasks"
on public.tasks
for update
to authenticated
using (
    public.current_user_has_permission(
        organization_id,
        'core.tasks.manage'
    )
)
with check (
    public.current_user_has_permission(
        organization_id,
        'core.tasks.manage'
    )
    and (
        assigned_to_user_id is null
        or exists (
            select 1
            from public.organization_memberships om
            where om.organization_id = tasks.organization_id
              and om.user_profile_id = tasks.assigned_to_user_id
              and om.status = 'active'
        )
    )
);

create or replace function public.set_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_tasks_updated_at()
from public;

drop trigger if exists set_tasks_updated_at
on public.tasks;

create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_tasks_updated_at();

create or replace function public.set_task_completion_timestamp()
returns trigger
language plpgsql
as $$
begin
    if new.status = 'completed' then
        if tg_op = 'INSERT' or old.status <> 'completed' then
            new.completed_at = now();
        end if;
    else
        new.completed_at = null;
    end if;

    return new;
end;
$$;

revoke execute on function public.set_task_completion_timestamp()
from public;

drop trigger if exists set_task_completion_timestamp
on public.tasks;

create trigger set_task_completion_timestamp
before insert or update on public.tasks
for each row
execute function public.set_task_completion_timestamp();

create or replace function public.audit_task_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_actor_user_id uuid;
begin
    select up.id
    into v_actor_user_id
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.status = 'active';

    insert into public.audit_events (
        organization_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        previous_data,
        new_data,
        metadata
    )
    values (
        new.organization_id,
        v_actor_user_id,
        case
            when tg_op = 'INSERT'
                then 'task.created'
            else 'task.updated'
        end,
        'task',
        new.id,
        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'title', old.title,
                'description', old.description,
                'status', old.status,
                'priority', old.priority,
                'assigned_to_user_id', old.assigned_to_user_id,
                'due_at', old.due_at,
                'completed_at', old.completed_at,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,
        jsonb_build_object(
            'title', new.title,
            'description', new.description,
            'status', new.status,
            'priority', new.priority,
            'assigned_to_user_id', new.assigned_to_user_id,
            'due_at', new.due_at,
            'completed_at', new.completed_at,
            'created_at', new.created_at,
            'updated_at', new.updated_at
        ),
        jsonb_build_object(
            'operation', tg_op
        )
    );

    return new;
end;
$$;

revoke execute on function public.audit_task_change()
from public;

drop trigger if exists audit_task_change
on public.tasks;

create trigger audit_task_change
after insert or update
on public.tasks
for each row
execute function public.audit_task_change();

comment on table public.tasks is
'Re-usable tenant-scoped unit of accountable operational work.';

comment on column public.tasks.status is
'Task lifecycle state: open, in_progress, completed or cancelled.';

comment on column public.tasks.priority is
'Operational priority: low, normal, high or urgent.';

comment on column public.tasks.assigned_to_user_id is
'User accountable for executing the task and required to be an active member of the task organization when assigned.';

comment on column public.tasks.due_at is
'Optional operational deadline for the task.';

comment on column public.tasks.completed_at is
'Timestamp automatically populated when the task enters completed state and cleared when it leaves completed state.';
