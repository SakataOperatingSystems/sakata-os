-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — WORKFLOW / STATE
-- Migration: Reusable workflow definition and state foundation
-- ============================================================

-- ============================================================
-- WORKFLOW DEFINITIONS
-- ============================================================

create table public.workflow_definitions (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    code text not null,

    name text not null,

    description text,

    status text not null default 'active',

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint workflow_definitions_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint workflow_definitions_code_not_empty
        check (length(trim(code)) > 0),

    constraint workflow_definitions_name_not_empty
        check (length(trim(name)) > 0),

    constraint workflow_definitions_description_not_empty
        check (
            description is null
            or length(trim(description)) > 0
        ),

    constraint workflow_definitions_status_check
        check (
            status in (
                'active',
                'suspended',
                'archived'
            )
        ),

    constraint workflow_definitions_organization_code_key
        unique (
            organization_id,
            code
        ),

    constraint workflow_definitions_organization_id_id_unique
        unique (
            organization_id,
            id
        )
);

create index workflow_definitions_organization_id_idx
    on public.workflow_definitions(organization_id);

create index workflow_definitions_status_idx
    on public.workflow_definitions(
        organization_id,
        status
    );

-- ============================================================
-- WORKFLOW STATES
-- ============================================================

create table public.workflow_states (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    workflow_definition_id uuid not null,

    code text not null,

    name text not null,

    description text,

    sequence integer not null default 0,

    is_initial boolean not null default false,

    is_terminal boolean not null default false,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint workflow_states_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint workflow_states_workflow_definition_fkey
        foreign key (
            organization_id,
            workflow_definition_id
        )
        references public.workflow_definitions (
            organization_id,
            id
        )
        on delete cascade,

    constraint workflow_states_code_not_empty
        check (length(trim(code)) > 0),

    constraint workflow_states_name_not_empty
        check (length(trim(name)) > 0),

    constraint workflow_states_description_not_empty
        check (
            description is null
            or length(trim(description)) > 0
        ),

    constraint workflow_states_sequence_check
        check (sequence >= 0),

    constraint workflow_states_workflow_code_key
        unique (
            organization_id,
            workflow_definition_id,
            code
        ),

    constraint workflow_states_workflow_sequence_key
        unique (
            organization_id,
            workflow_definition_id,
            sequence
        ),

    constraint workflow_states_organization_id_id_unique
        unique (
            organization_id,
            id
        ),

    constraint workflow_states_workflow_id_id_unique
        unique (
            organization_id,
            workflow_definition_id,
            id
        )
);

create index workflow_states_organization_id_idx
    on public.workflow_states(organization_id);

create index workflow_states_workflow_definition_id_idx
    on public.workflow_states(
        organization_id,
        workflow_definition_id
    );

create index workflow_states_initial_idx
    on public.workflow_states(
        organization_id,
        workflow_definition_id,
        is_initial
    );

create index workflow_states_terminal_idx
    on public.workflow_states(
        organization_id,
        workflow_definition_id,
        is_terminal
    );

create unique index workflow_states_single_initial_idx
    on public.workflow_states(
        organization_id,
        workflow_definition_id
    )
    where is_initial = true;

-- ============================================================
-- WORKFLOW TRANSITIONS
-- ============================================================

create table public.workflow_transitions (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    workflow_definition_id uuid not null,

    from_state_id uuid not null,

    to_state_id uuid not null,

    code text not null,

    name text not null,

    description text,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint workflow_transitions_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint workflow_transitions_workflow_definition_fkey
        foreign key (
            organization_id,
            workflow_definition_id
        )
        references public.workflow_definitions (
            organization_id,
            id
        )
        on delete cascade,

    constraint workflow_transitions_from_state_fkey
        foreign key (
            organization_id,
            workflow_definition_id,
            from_state_id
        )
        references public.workflow_states (
            organization_id,
            workflow_definition_id,
            id
        )
        on delete restrict,

    constraint workflow_transitions_to_state_fkey
        foreign key (
            organization_id,
            workflow_definition_id,
            to_state_id
        )
        references public.workflow_states (
            organization_id,
            workflow_definition_id,
            id
        )
        on delete restrict,

    constraint workflow_transitions_code_not_empty
        check (length(trim(code)) > 0),

    constraint workflow_transitions_name_not_empty
        check (length(trim(name)) > 0),

    constraint workflow_transitions_description_not_empty
        check (
            description is null
            or length(trim(description)) > 0
        ),

    constraint workflow_transitions_from_to_different
        check (from_state_id <> to_state_id),

    constraint workflow_transitions_workflow_code_key
        unique (
            organization_id,
            workflow_definition_id,
            code
        ),

    constraint workflow_transitions_workflow_route_key
        unique (
            organization_id,
            workflow_definition_id,
            from_state_id,
            to_state_id
        )
);

create index workflow_transitions_organization_id_idx
    on public.workflow_transitions(organization_id);

create index workflow_transitions_workflow_definition_id_idx
    on public.workflow_transitions(
        organization_id,
        workflow_definition_id
    );

create index workflow_transitions_from_state_id_idx
    on public.workflow_transitions(
        organization_id,
        workflow_definition_id,
        from_state_id
    );

create index workflow_transitions_to_state_id_idx
    on public.workflow_transitions(
        organization_id,
        workflow_definition_id,
        to_state_id
    );

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.workflow_definitions enable row level security;

alter table public.workflow_states enable row level security;

alter table public.workflow_transitions enable row level security;

grant select on table public.workflow_definitions
to authenticated;

grant insert, update on table public.workflow_definitions
to authenticated;

grant select on table public.workflow_states
to authenticated;

grant insert, update on table public.workflow_states
to authenticated;

grant select on table public.workflow_transitions
to authenticated;

grant insert, update on table public.workflow_transitions
to authenticated;

-- ============================================================
-- READ ACCESS
-- ============================================================

create policy "organization members can read workflow definitions"
on public.workflow_definitions
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

create policy "organization members can read workflow states"
on public.workflow_states
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

create policy "organization members can read workflow transitions"
on public.workflow_transitions
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

-- ============================================================
-- WRITE ACCESS
-- ============================================================

create policy "organization members with workflow manage permission can insert workflow definitions"
on public.workflow_definitions
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'core.workflows.manage'
    )
);

create policy "organization members with workflow manage permission can update workflow definitions"
on public.workflow_definitions
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
);

create policy "organization members with workflow manage permission can insert workflow states"
on public.workflow_states
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'core.workflows.manage'
    )
    and exists (
        select 1
        from public.workflow_definitions wd
        where wd.organization_id = workflow_states.organization_id
          and wd.id = workflow_states.workflow_definition_id
    )
);

create policy "organization members with workflow manage permission can update workflow states"
on public.workflow_states
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
        from public.workflow_definitions wd
        where wd.organization_id = workflow_states.organization_id
          and wd.id = workflow_states.workflow_definition_id
    )
);

create policy "organization members with workflow manage permission can insert workflow transitions"
on public.workflow_transitions
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'core.workflows.manage'
    )
    and exists (
        select 1
        from public.workflow_states from_state
        where from_state.organization_id = workflow_transitions.organization_id
          and from_state.workflow_definition_id = workflow_transitions.workflow_definition_id
          and from_state.id = workflow_transitions.from_state_id
    )
    and exists (
        select 1
        from public.workflow_states to_state
        where to_state.organization_id = workflow_transitions.organization_id
          and to_state.workflow_definition_id = workflow_transitions.workflow_definition_id
          and to_state.id = workflow_transitions.to_state_id
    )
);

create policy "organization members with workflow manage permission can update workflow transitions"
on public.workflow_transitions
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
        from public.workflow_states from_state
        where from_state.organization_id = workflow_transitions.organization_id
          and from_state.workflow_definition_id = workflow_transitions.workflow_definition_id
          and from_state.id = workflow_transitions.from_state_id
    )
    and exists (
        select 1
        from public.workflow_states to_state
        where to_state.organization_id = workflow_transitions.organization_id
          and to_state.workflow_definition_id = workflow_transitions.workflow_definition_id
          and to_state.id = workflow_transitions.to_state_id
    )
);

-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function public.set_workflow_definitions_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_workflow_definitions_updated_at()
from public;

drop trigger if exists set_workflow_definitions_updated_at
on public.workflow_definitions;

create trigger set_workflow_definitions_updated_at
before update on public.workflow_definitions
for each row
execute function public.set_workflow_definitions_updated_at();


create or replace function public.set_workflow_states_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_workflow_states_updated_at()
from public;

drop trigger if exists set_workflow_states_updated_at
on public.workflow_states;

create trigger set_workflow_states_updated_at
before update on public.workflow_states
for each row
execute function public.set_workflow_states_updated_at();


create or replace function public.set_workflow_transitions_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_workflow_transitions_updated_at()
from public;

drop trigger if exists set_workflow_transitions_updated_at
on public.workflow_transitions;

create trigger set_workflow_transitions_updated_at
before update on public.workflow_transitions
for each row
execute function public.set_workflow_transitions_updated_at();

-- ============================================================
-- TENANT AND WORKFLOW OWNERSHIP IMMUTABILITY
-- ============================================================

create or replace function public.prevent_workflow_definition_organization_change()
returns trigger
language plpgsql
as $$
begin
    if new.organization_id <> old.organization_id then
        raise exception 'Workflow definition organization cannot be changed.';
    end if;

    return new;
end;
$$;

revoke execute on function public.prevent_workflow_definition_organization_change()
from public;

drop trigger if exists prevent_workflow_definition_organization_change
on public.workflow_definitions;

create trigger prevent_workflow_definition_organization_change
before update on public.workflow_definitions
for each row
execute function public.prevent_workflow_definition_organization_change();


create or replace function public.prevent_workflow_state_context_change()
returns trigger
language plpgsql
as $$
begin
    if new.organization_id <> old.organization_id then
        raise exception 'Workflow state organization cannot be changed.';
    end if;

    if new.workflow_definition_id <> old.workflow_definition_id then
        raise exception 'Workflow state workflow definition cannot be changed.';
    end if;

    return new;
end;
$$;

revoke execute on function public.prevent_workflow_state_context_change()
from public;

drop trigger if exists prevent_workflow_state_context_change
on public.workflow_states;

create trigger prevent_workflow_state_context_change
before update on public.workflow_states
for each row
execute function public.prevent_workflow_state_context_change();


create or replace function public.prevent_workflow_transition_context_change()
returns trigger
language plpgsql
as $$
begin
    if new.organization_id <> old.organization_id then
        raise exception 'Workflow transition organization cannot be changed.';
    end if;

    if new.workflow_definition_id <> old.workflow_definition_id then
        raise exception 'Workflow transition workflow definition cannot be changed.';
    end if;

    return new;
end;
$$;

revoke execute on function public.prevent_workflow_transition_context_change()
from public;

drop trigger if exists prevent_workflow_transition_context_change
on public.workflow_transitions;

create trigger prevent_workflow_transition_context_change
before update on public.workflow_transitions
for each row
execute function public.prevent_workflow_transition_context_change();

-- ============================================================
-- CONFIGURATION AUDIT
-- ============================================================

create or replace function public.audit_workflow_definition_change()
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
                then 'workflow_definition.created'
            else 'workflow_definition.updated'
        end,
        'workflow_definition',
        new.id,
        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'code', old.code,
                'name', old.name,
                'description', old.description,
                'status', old.status,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,
        jsonb_build_object(
            'code', new.code,
            'name', new.name,
            'description', new.description,
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

revoke execute on function public.audit_workflow_definition_change()
from public;

drop trigger if exists audit_workflow_definition_change
on public.workflow_definitions;

create trigger audit_workflow_definition_change
after insert or update
on public.workflow_definitions
for each row
execute function public.audit_workflow_definition_change();


create or replace function public.audit_workflow_state_change()
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
                then 'workflow_state.created'
            else 'workflow_state.updated'
        end,
        'workflow_state',
        new.id,
        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'workflow_definition_id', old.workflow_definition_id,
                'code', old.code,
                'name', old.name,
                'description', old.description,
                'sequence', old.sequence,
                'is_initial', old.is_initial,
                'is_terminal', old.is_terminal,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,
        jsonb_build_object(
            'workflow_definition_id', new.workflow_definition_id,
            'code', new.code,
            'name', new.name,
            'description', new.description,
            'sequence', new.sequence,
            'is_initial', new.is_initial,
            'is_terminal', new.is_terminal,
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

revoke execute on function public.audit_workflow_state_change()
from public;

drop trigger if exists audit_workflow_state_change
on public.workflow_states;

create trigger audit_workflow_state_change
after insert or update
on public.workflow_states
for each row
execute function public.audit_workflow_state_change();


create or replace function public.audit_workflow_transition_change()
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
                then 'workflow_transition.created'
            else 'workflow_transition.updated'
        end,
        'workflow_transition',
        new.id,
        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'workflow_definition_id', old.workflow_definition_id,
                'from_state_id', old.from_state_id,
                'to_state_id', old.to_state_id,
                'code', old.code,
                'name', old.name,
                'description', old.description,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,
        jsonb_build_object(
            'workflow_definition_id', new.workflow_definition_id,
            'from_state_id', new.from_state_id,
            'to_state_id', new.to_state_id,
            'code', new.code,
            'name', new.name,
            'description', new.description,
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

revoke execute on function public.audit_workflow_transition_change()
from public;

drop trigger if exists audit_workflow_transition_change
on public.workflow_transitions;

create trigger audit_workflow_transition_change
after insert or update
on public.workflow_transitions
for each row
execute function public.audit_workflow_transition_change();

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.workflow_definitions is
'Re-usable tenant-scoped workflow definition describing a governed operational lifecycle.';

comment on column public.workflow_definitions.code is
'Stable organization-scoped identifier for the workflow definition.';

comment on column public.workflow_definitions.status is
'Workflow definition lifecycle: active, suspended or archived.';

comment on table public.workflow_states is
'Re-usable state belonging to a tenant-scoped workflow definition.';

comment on column public.workflow_states.sequence is
'Deterministic display/order position within the workflow definition.';

comment on column public.workflow_states.is_initial is
'Marks the state intended as the workflow entry state. Runtime instance creation is a future capability.';

comment on column public.workflow_states.is_terminal is
'Marks the state as terminal for future workflow runtime validation.';

comment on table public.workflow_transitions is
'Governed route between two states in a workflow definition.';

comment on column public.workflow_transitions.from_state_id is
'State from which this transition may begin.';

comment on column public.workflow_transitions.to_state_id is
'State reached by this transition.';
