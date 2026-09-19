-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — WORKFLOW RUNTIME FOUNDATION
-- Migration: Reusable Workflow Runtime
-- ============================================================

-- ============================================================
-- WORKFLOW INSTANCES
-- ============================================================

create table public.workflow_instances (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    workflow_definition_id uuid not null,

    current_state_id uuid not null,

    subject_type text not null,

    subject_id uuid not null,

    status text not null default 'active',

    started_at timestamptz not null default now(),

    completed_at timestamptz,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint workflow_instances_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint workflow_instances_workflow_definition_fkey
        foreign key (
            organization_id,
            workflow_definition_id
        )
        references public.workflow_definitions (
            organization_id,
            id
        )
        on delete restrict,

    constraint workflow_instances_current_state_fkey
        foreign key (
            organization_id,
            workflow_definition_id,
            current_state_id
        )
        references public.workflow_states (
            organization_id,
            workflow_definition_id,
            id
        )
        on delete restrict,

    constraint workflow_instances_subject_type_not_empty
        check (length(trim(subject_type)) > 0),

    constraint workflow_instances_status_check
        check (
            status in (
                'active',
                'completed',
                'cancelled'
            )
        ),

    constraint workflow_instances_metadata_object
        check (jsonb_typeof(metadata) = 'object'),

    constraint workflow_instances_completed_at_check
        check (
            status = 'active'
            or completed_at is not null
        ),

    constraint workflow_instances_organization_id_id_unique
        unique (
            organization_id,
            id
        )
);

-- ============================================================
-- INDEXES
-- ============================================================

create index workflow_instances_organization_id_idx
    on public.workflow_instances(organization_id);

create index workflow_instances_workflow_definition_id_idx
    on public.workflow_instances(
        organization_id,
        workflow_definition_id
    );

create index workflow_instances_current_state_id_idx
    on public.workflow_instances(
        organization_id,
        current_state_id
    );

create index workflow_instances_subject_idx
    on public.workflow_instances(
        organization_id,
        subject_type,
        subject_id
    );

create index workflow_instances_status_idx
    on public.workflow_instances(
        organization_id,
        status
    );

-- ============================================================
-- WORKFLOW INSTANCE TRANSITION HISTORY
-- ============================================================

create table public.workflow_instance_transitions (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    workflow_instance_id uuid not null,

    workflow_transition_id uuid not null,

    from_state_id uuid not null,

    to_state_id uuid not null,

    actor_user_id uuid,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint workflow_instance_transitions_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint workflow_instance_transitions_instance_fkey
        foreign key (
            organization_id,
            workflow_instance_id
        )
        references public.workflow_instances (
            organization_id,
            id
        )
        on delete cascade,

    constraint workflow_instance_transitions_transition_fkey
        foreign key (
            organization_id,
            workflow_transition_id
        )
        references public.workflow_transitions (
            organization_id,
            id
        )
        on delete restrict,

    constraint workflow_instance_transitions_from_state_fkey
        foreign key (
            organization_id,
            from_state_id
        )
        references public.workflow_states (
            organization_id,
            id
        )
        on delete restrict,

    constraint workflow_instance_transitions_to_state_fkey
        foreign key (
            organization_id,
            to_state_id
        )
        references public.workflow_states (
            organization_id,
            id
        )
        on delete restrict,

    constraint workflow_instance_transitions_metadata_object
        check (jsonb_typeof(metadata) = 'object'),

    constraint workflow_instance_transitions_organization_id_id_unique
        unique (
            organization_id,
            id
        )
);

-- ============================================================
-- INDEXES
-- ============================================================

create index workflow_instance_transitions_instance_id_idx
    on public.workflow_instance_transitions(
        organization_id,
        workflow_instance_id,
        created_at
    );

create index workflow_instance_transitions_transition_id_idx
    on public.workflow_instance_transitions(
        organization_id,
        workflow_transition_id
    );

create index workflow_instance_transitions_actor_user_id_idx
    on public.workflow_instance_transitions(
        organization_id,
        actor_user_id
    );

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.workflow_instances enable row level security;

alter table public.workflow_instance_transitions enable row level security;

grant select on table public.workflow_instances
to authenticated;

grant select on table public.workflow_instance_transitions
to authenticated;

grant insert, update on table public.workflow_instances
to authenticated;

grant insert on table public.workflow_instance_transitions
to authenticated;

-- ============================================================
-- READ ACCESS
-- ============================================================

create policy "organization members can read workflow instances"
on public.workflow_instances
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

create policy "organization members can read workflow instance transitions"
on public.workflow_instance_transitions
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

-- ============================================================
-- WRITE ACCESS
-- ============================================================

create policy "organization members with workflow manage permission can insert workflow instances"
on public.workflow_instances
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'core.workflows.manage'
    )
);

create policy "organization members with workflow manage permission can update workflow instances"
on public.workflow_instances
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

create policy "organization members with workflow manage permission can insert workflow instance transitions"
on public.workflow_instance_transitions
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'core.workflows.manage'
    )
);

-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function public.set_workflow_instance_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_workflow_instance_updated_at()
from public;

drop trigger if exists set_workflow_instance_updated_at
on public.workflow_instances;

create trigger set_workflow_instance_updated_at
before update on public.workflow_instances
for each row
execute function public.set_workflow_instance_updated_at();

-- ============================================================
-- CONTEXT IMMUTABILITY
-- ============================================================

create or replace function public.prevent_workflow_instance_context_change()
returns trigger
language plpgsql
as $$
begin
    if new.organization_id <> old.organization_id
       or new.workflow_definition_id <> old.workflow_definition_id
       or new.subject_type <> old.subject_type
       or new.subject_id <> old.subject_id
    then
        raise exception
            'Workflow instance organization, workflow, or subject cannot be changed';
    end if;

    return new;
end;
$$;

revoke execute on function public.prevent_workflow_instance_context_change()
from public;

drop trigger if exists prevent_workflow_instance_context_change
on public.workflow_instances;

create trigger prevent_workflow_instance_context_change
before update on public.workflow_instances
for each row
execute function public.prevent_workflow_instance_context_change();

-- ============================================================
-- AUDIT
-- ============================================================

create or replace function public.audit_workflow_instance_change()
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
                then 'workflow_instance.created'
            else 'workflow_instance.updated'
        end,

        'workflow_instance',

        new.id,

        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'workflow_definition_id', old.workflow_definition_id,
                'current_state_id', old.current_state_id,
                'subject_type', old.subject_type,
                'subject_id', old.subject_id,
                'status', old.status,
                'started_at', old.started_at,
                'completed_at', old.completed_at,
                'metadata', old.metadata,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,

        jsonb_build_object(
            'workflow_definition_id', new.workflow_definition_id,
            'current_state_id', new.current_state_id,
            'subject_type', new.subject_type,
            'subject_id', new.subject_id,
            'status', new.status,
            'started_at', new.started_at,
            'completed_at', new.completed_at,
            'metadata', new.metadata,
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

revoke execute on function public.audit_workflow_instance_change()
from public;

drop trigger if exists audit_workflow_instance_change
on public.workflow_instances;

create trigger audit_workflow_instance_change
after insert or update
on public.workflow_instances
for each row
execute function public.audit_workflow_instance_change();

create or replace function public.audit_workflow_instance_transition()
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
        coalesce(new.actor_user_id, v_actor_user_id),
        'workflow_instance_transition.created',
        'workflow_instance_transition',
        new.id,
        null,
        jsonb_build_object(
            'workflow_instance_id', new.workflow_instance_id,
            'workflow_transition_id', new.workflow_transition_id,
            'from_state_id', new.from_state_id,
            'to_state_id', new.to_state_id,
            'actor_user_id', new.actor_user_id,
            'metadata', new.metadata,
            'created_at', new.created_at
        ),
        jsonb_build_object(
            'operation', tg_op
        )
    );

    return new;
end;
$$;

revoke execute on function public.audit_workflow_instance_transition()
from public;

drop trigger if exists audit_workflow_instance_transition
on public.workflow_instance_transitions;

create trigger audit_workflow_instance_transition
after insert
on public.workflow_instance_transitions
for each row
execute function public.audit_workflow_instance_transition();

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.workflow_instances is
'Re-usable runtime instance of a configured workflow definition attached to an operational subject.';

comment on column public.workflow_instances.subject_type is
'Canonical type identifier for the operational record governed by this workflow instance.';

comment on column public.workflow_instances.subject_id is
'Identifier of the operational record governed by this workflow instance.';

comment on column public.workflow_instances.current_state_id is
'Current governed state of the workflow instance.';

comment on table public.workflow_instance_transitions is
'Immutable runtime history of transitions executed against workflow instances.';

comment on column public.workflow_instance_transitions.actor_user_id is
'User responsible for executing the runtime transition where known.';
