-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — WORKFLOW ACTIONS
-- Migration: Reusable workflow-to-task action foundation
-- ============================================================

-- ============================================================
-- WORKFLOW TRANSITION ACTIONS
-- ============================================================

create table public.workflow_transition_actions (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    workflow_transition_id uuid not null,

    code text not null,

    name text not null,

    action_type text not null,

    status text not null default 'active',

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint workflow_transition_actions_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint workflow_transition_actions_transition_fkey
        foreign key (
            organization_id,
            workflow_transition_id
        )
        references public.workflow_transitions (
            organization_id,
            id
        )
        on delete cascade,

    constraint workflow_transition_actions_code_not_empty
        check (length(trim(code)) > 0),

    constraint workflow_transition_actions_name_not_empty
        check (length(trim(name)) > 0),

    constraint workflow_transition_actions_type_check
        check (
            action_type in (
                'task'
            )
        ),

    constraint workflow_transition_actions_status_check
        check (
            status in (
                'active',
                'disabled'
            )
        ),

    constraint workflow_transition_actions_organization_code_key
        unique (
            organization_id,
            workflow_transition_id,
            code
        ),

    constraint workflow_transition_actions_organization_id_id_unique
        unique (
            organization_id,
            id
        )
);

create index workflow_transition_actions_organization_id_idx
    on public.workflow_transition_actions(
        organization_id
    );

create index workflow_transition_actions_transition_id_idx
    on public.workflow_transition_actions(
        organization_id,
        workflow_transition_id
    );

create index workflow_transition_actions_status_idx
    on public.workflow_transition_actions(
        organization_id,
        status
    );

-- ============================================================
-- TASK ACTION CONFIGURATION
-- ============================================================

create table public.workflow_transition_task_actions (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    workflow_transition_action_id uuid not null,

    task_title_template text not null,

    task_description_template text,

    task_priority text not null default 'normal',

    due_after_minutes integer,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint workflow_transition_task_actions_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint workflow_transition_task_actions_action_fkey
        foreign key (
            organization_id,
            workflow_transition_action_id
        )
        references public.workflow_transition_actions (
            organization_id,
            id
        )
        on delete cascade,

    constraint workflow_transition_task_actions_title_not_empty
        check (
            length(trim(task_title_template)) > 0
        ),

    constraint workflow_transition_task_actions_description_not_empty
        check (
            task_description_template is null
            or length(trim(task_description_template)) > 0
        ),

    constraint workflow_transition_task_actions_priority_check
        check (
            task_priority in (
                'low',
                'normal',
                'high',
                'urgent'
            )
        ),

    constraint workflow_transition_task_actions_due_check
        check (
            due_after_minutes is null
            or due_after_minutes >= 0
        ),

    constraint workflow_transition_task_actions_organization_action_key
        unique (
            organization_id,
            workflow_transition_action_id
        ),

    constraint workflow_transition_task_actions_organization_id_id_unique
        unique (
            organization_id,
            id
        )
);

create index workflow_transition_task_actions_organization_id_idx
    on public.workflow_transition_task_actions(
        organization_id
    );

create index workflow_transition_task_actions_action_id_idx
    on public.workflow_transition_task_actions(
        organization_id,
        workflow_transition_action_id
    );

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.workflow_transition_actions enable row level security;

alter table public.workflow_transition_task_actions enable row level security;

grant select on table public.workflow_transition_actions
to authenticated;

grant insert, update on table public.workflow_transition_actions
to authenticated;

grant select on table public.workflow_transition_task_actions
to authenticated;

grant insert, update on table public.workflow_transition_task_actions
to authenticated;

-- ============================================================
-- READ ACCESS
-- ============================================================

create policy "organization members can read workflow transition actions"
on public.workflow_transition_actions
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

create policy "organization members can read workflow transition task actions"
on public.workflow_transition_task_actions
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

-- ============================================================
-- WRITE ACCESS
-- ============================================================

create policy "organization members with workflow manage permission can insert workflow transition actions"
on public.workflow_transition_actions
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'core.workflows.manage'
    )
    and exists (
        select 1
        from public.workflow_transitions wt
        where wt.organization_id = workflow_transition_actions.organization_id
          and wt.id = workflow_transition_actions.workflow_transition_id
    )
);

create policy "organization members with workflow manage permission can update workflow transition actions"
on public.workflow_transition_actions
for update
to authenticated
using (
    public.current_user_has_permission(
        organization_id,
        'core.workflows.manage'
    )
)
with check (
    public.current_user_has_permission(
        organization_id,
        'core.workflows.manage'
    )
    and exists (
        select 1
        from public.workflow_transitions wt
        where wt.organization_id = workflow_transition_actions.organization_id
          and wt.id = workflow_transition_actions.workflow_transition_id
    )
);

create policy "organization members with workflow manage permission can insert workflow transition task actions"
on public.workflow_transition_task_actions
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'core.workflows.manage'
    )
    and exists (
        select 1
        from public.workflow_transition_actions wta
        where wta.organization_id = workflow_transition_task_actions.organization_id
          and wta.id = workflow_transition_task_actions.workflow_transition_action_id
          and wta.action_type = 'task'
    )
);

create policy "organization members with workflow manage permission can update workflow transition task actions"
on public.workflow_transition_task_actions
for update
to authenticated
using (
    public.current_user_has_permission(
        organization_id,
        'core.workflows.manage'
    )
)
with check (
    public.current_user_has_permission(
        organization_id,
        'core.workflows.manage'
    )
    and exists (
        select 1
        from public.workflow_transition_actions wta
        where wta.organization_id = workflow_transition_task_actions.organization_id
          and wta.id = workflow_transition_task_actions.workflow_transition_action_id
          and wta.action_type = 'task'
    )
);

-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function public.set_workflow_transition_actions_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_workflow_transition_actions_updated_at()
from public;

drop trigger if exists set_workflow_transition_actions_updated_at
on public.workflow_transition_actions;

create trigger set_workflow_transition_actions_updated_at
before update on public.workflow_transition_actions
for each row
execute function public.set_workflow_transition_actions_updated_at();


create or replace function public.set_workflow_transition_task_actions_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_workflow_transition_task_actions_updated_at()
from public;

drop trigger if exists set_workflow_transition_task_actions_updated_at
on public.workflow_transition_task_actions;

create trigger set_workflow_transition_task_actions_updated_at
before update on public.workflow_transition_task_actions
for each row
execute function public.set_workflow_transition_task_actions_updated_at();

-- ============================================================
-- CONTEXT IMMUTABILITY
-- ============================================================

create or replace function public.prevent_workflow_transition_action_context_change()
returns trigger
language plpgsql
as $$
begin
    if new.organization_id <> old.organization_id then
        raise exception
            'Workflow transition action organization cannot be changed.';
    end if;

    if new.workflow_transition_id <> old.workflow_transition_id then
        raise exception
            'Workflow transition action transition cannot be changed.';
    end if;

    if new.action_type <> old.action_type then
        raise exception
            'Workflow transition action type cannot be changed.';
    end if;

    return new;
end;
$$;

revoke execute on function public.prevent_workflow_transition_action_context_change()
from public;

drop trigger if exists prevent_workflow_transition_action_context_change
on public.workflow_transition_actions;

create trigger prevent_workflow_transition_action_context_change
before update on public.workflow_transition_actions
for each row
execute function public.prevent_workflow_transition_action_context_change();


create or replace function public.prevent_workflow_transition_task_action_context_change()
returns trigger
language plpgsql
as $$
begin
    if new.organization_id <> old.organization_id then
        raise exception
            'Workflow transition task action organization cannot be changed.';
    end if;

    if new.workflow_transition_action_id <> old.workflow_transition_action_id then
        raise exception
            'Workflow transition task action binding cannot be changed.';
    end if;

    return new;
end;
$$;

revoke execute on function public.prevent_workflow_transition_task_action_context_change()
from public;

drop trigger if exists prevent_workflow_transition_task_action_context_change
on public.workflow_transition_task_actions;

create trigger prevent_workflow_transition_task_action_context_change
before update on public.workflow_transition_task_actions
for each row
execute function public.prevent_workflow_transition_task_action_context_change();

-- ============================================================
-- AUDIT
-- ============================================================

create or replace function public.audit_workflow_transition_action_change()
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
                then 'workflow_transition_action.created'
            else 'workflow_transition_action.updated'
        end,
        'workflow_transition_action',
        new.id,
        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'workflow_transition_id', old.workflow_transition_id,
                'code', old.code,
                'name', old.name,
                'action_type', old.action_type,
                'status', old.status,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,
        jsonb_build_object(
            'workflow_transition_id', new.workflow_transition_id,
            'code', new.code,
            'name', new.name,
            'action_type', new.action_type,
            'status', new.status,
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

revoke execute on function public.audit_workflow_transition_action_change()
from public;

drop trigger if exists audit_workflow_transition_action_change
on public.workflow_transition_actions;

create trigger audit_workflow_transition_action_change
after insert or update
on public.workflow_transition_actions
for each row
execute function public.audit_workflow_transition_action_change();


create or replace function public.audit_workflow_transition_task_action_change()
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
                then 'workflow_transition_task_action.created'
            else 'workflow_transition_task_action.updated'
        end,
        'workflow_transition_task_action',
        new.id,
        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'workflow_transition_action_id', old.workflow_transition_action_id,
                'task_title_template', old.task_title_template,
                'task_description_template', old.task_description_template,
                'task_priority', old.task_priority,
                'due_after_minutes', old.due_after_minutes,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,
        jsonb_build_object(
            'workflow_transition_action_id', new.workflow_transition_action_id,
            'task_title_template', new.task_title_template,
            'task_description_template', new.task_description_template,
            'task_priority', new.task_priority,
            'due_after_minutes', new.due_after_minutes,
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

revoke execute on function public.audit_workflow_transition_task_action_change()
from public;

drop trigger if exists audit_workflow_transition_task_action_change
on public.workflow_transition_task_actions;

create trigger audit_workflow_transition_task_action_change
after insert or update
on public.workflow_transition_task_actions
for each row
execute function public.audit_workflow_transition_task_action_change();

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.workflow_transition_actions is
'Re-usable tenant-scoped actions configured against workflow transitions. Action execution is handled by the workflow runtime.';

comment on column public.workflow_transition_actions.action_type is
'Action implementation type. The current platform action type is task; additional action types may be introduced without changing workflow transition structure.';

comment on column public.workflow_transition_actions.status is
'Action lifecycle: active or disabled. Disabled actions remain configured but are not eligible for future runtime execution.';

comment on table public.workflow_transition_task_actions is
'Configuration for task-producing workflow transition actions, including task templates, priority and optional relative due time.';

comment on column public.workflow_transition_task_actions.task_title_template is
'Template used by the runtime when constructing a task title. Template resolution is a runtime concern and is not embedded in workflow transition definitions.';

comment on column public.workflow_transition_task_actions.due_after_minutes is
'Optional relative number of minutes after action execution from which the generated task becomes due.';
