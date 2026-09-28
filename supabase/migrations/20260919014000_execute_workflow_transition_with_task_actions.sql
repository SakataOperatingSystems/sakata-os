-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — WORKFLOW RUNTIME
-- Migration: Execute workflow transitions with configured task actions
-- ============================================================

-- ============================================================
-- WORKFLOW TASK LINKS
-- ============================================================

create table public.workflow_task_links (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    workflow_instance_id uuid not null,

    workflow_instance_transition_id uuid not null,

    workflow_transition_action_id uuid not null,

    task_id uuid not null,

    created_at timestamptz not null default now(),

    constraint workflow_task_links_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint workflow_task_links_instance_fkey
        foreign key (
            organization_id,
            workflow_instance_id
        )
        references public.workflow_instances (
            organization_id,
            id
        )
        on delete cascade,

    constraint workflow_task_links_instance_transition_fkey
        foreign key (
            organization_id,
            workflow_instance_transition_id
        )
        references public.workflow_instance_transitions (
            organization_id,
            id
        )
        on delete cascade,

    constraint workflow_task_links_action_fkey
        foreign key (
            organization_id,
            workflow_transition_action_id
        )
        references public.workflow_transition_actions (
            organization_id,
            id
        )
        on delete restrict,

    constraint workflow_task_links_task_fkey
        foreign key (task_id)
        references public.tasks(id)
        on delete restrict,

    constraint workflow_task_links_organization_id_id_unique
        unique (
            organization_id,
            id
        ),

    constraint workflow_task_links_transition_action_unique
        unique (
            organization_id,
            workflow_instance_transition_id,
            workflow_transition_action_id
        )
);

create index workflow_task_links_instance_idx
    on public.workflow_task_links(
        organization_id,
        workflow_instance_id,
        created_at
    );

create index workflow_task_links_transition_idx
    on public.workflow_task_links(
        organization_id,
        workflow_instance_transition_id
    );

create index workflow_task_links_action_idx
    on public.workflow_task_links(
        organization_id,
        workflow_transition_action_id
    );

create index workflow_task_links_task_idx
    on public.workflow_task_links(
        organization_id,
        task_id
    );

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.workflow_task_links enable row level security;

grant select on table public.workflow_task_links
to authenticated;

grant insert on table public.workflow_task_links
to authenticated;

create policy "organization members can read workflow task links"
on public.workflow_task_links
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

create policy "organization members with workflow manage permission can insert workflow task links"
on public.workflow_task_links
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'core.workflows.manage'
    )
);

-- ============================================================
-- CONTEXT IMMUTABILITY
-- ============================================================

create or replace function public.prevent_workflow_task_link_context_change()
returns trigger
language plpgsql
as $$
begin
    if new.organization_id <> old.organization_id then
        raise exception
            'Workflow task link organization cannot be changed.';
    end if;

    if new.workflow_instance_id <> old.workflow_instance_id then
        raise exception
            'Workflow task link workflow instance cannot be changed.';
    end if;

    if new.workflow_instance_transition_id <> old.workflow_instance_transition_id then
        raise exception
            'Workflow task link transition history cannot be changed.';
    end if;

    if new.workflow_transition_action_id <> old.workflow_transition_action_id then
        raise exception
            'Workflow task link action cannot be changed.';
    end if;

    if new.task_id <> old.task_id then
        raise exception
            'Workflow task link task cannot be changed.';
    end if;

    return new;
end;
$$;

revoke execute on function public.prevent_workflow_task_link_context_change()
from public;

drop trigger if exists prevent_workflow_task_link_context_change
on public.workflow_task_links;

create trigger prevent_workflow_task_link_context_change
before update on public.workflow_task_links
for each row
execute function public.prevent_workflow_task_link_context_change();

-- ============================================================
-- AUDIT
-- ============================================================

create or replace function public.audit_workflow_task_link()
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
        'workflow_task_link.created',
        'workflow_task_link',
        new.id,
        null,
        jsonb_build_object(
            'workflow_instance_id', new.workflow_instance_id,
            'workflow_instance_transition_id', new.workflow_instance_transition_id,
            'workflow_transition_action_id', new.workflow_transition_action_id,
            'task_id', new.task_id,
            'created_at', new.created_at
        ),
        jsonb_build_object(
            'operation', tg_op
        )
    );

    return new;
end;
$$;

revoke execute on function public.audit_workflow_task_link()
from public;

drop trigger if exists audit_workflow_task_link
on public.workflow_task_links;

create trigger audit_workflow_task_link
after insert
on public.workflow_task_links
for each row
execute function public.audit_workflow_task_link();

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.workflow_task_links is
'Durable tenant-scoped relationship between a workflow transition execution and a task created by a configured workflow task action.';

comment on column public.workflow_task_links.workflow_instance_transition_id is
'Immutable runtime transition execution that caused the task to be created.';

comment on column public.workflow_task_links.workflow_transition_action_id is
'Configured workflow action responsible for creating the task.';

comment on column public.workflow_task_links.task_id is
'Task Engine record created by the workflow action.';

-- ============================================================
-- WORKFLOW TRANSITION EXECUTION
-- ============================================================

create or replace function public.execute_workflow_transition(
    p_organization_id uuid,
    p_workflow_instance_id uuid,
    p_workflow_transition_id uuid,
    p_metadata jsonb default '{}'::jsonb
)
returns table (
    workflow_instance_id uuid,
    workflow_transition_history_id uuid,
    current_state_id uuid,
    status text,
    completed_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $function$
declare
    v_instance public.workflow_instances%rowtype;
    v_transition public.workflow_transitions%rowtype;
    v_actor_user_id uuid;
    v_history_id uuid;
    v_next_status text;
    v_completed_at timestamptz;
    v_task_action record;
    v_task_action_count integer := 0;
    v_task_id uuid;
    v_due_at timestamptz;
begin
    if not public.is_current_user_org_member(p_organization_id) then
        raise exception 'Current user is not a member of this organization';
    end if;

    if not public.current_user_has_permission(
        p_organization_id,
        'core.workflows.manage'
    ) then
        raise exception 'Workflow manage permission is required';
    end if;

    if p_metadata is null then
        p_metadata := '{}'::jsonb;
    end if;

    if jsonb_typeof(p_metadata) <> 'object' then
        raise exception 'Transition metadata must be a JSON object';
    end if;

    select up.id
    into v_actor_user_id
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.status = 'active';

    if v_actor_user_id is null then
        raise exception 'Active user profile was not found for the current user';
    end if;

    select *
    into v_instance
    from public.workflow_instances wi
    where wi.organization_id = p_organization_id
      and wi.id = p_workflow_instance_id
    for update;

    if not found then
        raise exception 'Workflow instance was not found in this organization';
    end if;

    if v_instance.status <> 'active' then
        raise exception 'Workflow instance is not active';
    end if;

    select *
    into v_transition
    from public.workflow_transitions wt
    where wt.organization_id = p_organization_id
      and wt.id = p_workflow_transition_id
    for update;

    if not found then
        raise exception 'Workflow transition was not found in this organization';
    end if;

    if v_transition.workflow_definition_id <> v_instance.workflow_definition_id then
        raise exception 'Workflow transition does not belong to the workflow instance workflow';
    end if;

    if v_transition.from_state_id <> v_instance.current_state_id then
        raise exception 'Workflow transition is not valid from the instance current state';
    end if;

    select
        case
            when ws.is_terminal then 'completed'
            else 'active'
        end,
        case
            when ws.is_terminal then now()
            else null
        end
    into
        v_next_status,
        v_completed_at
    from public.workflow_states ws
    where ws.organization_id = p_organization_id
      and ws.workflow_definition_id = v_instance.workflow_definition_id
      and ws.id = v_transition.to_state_id;

    if not found then
        raise exception 'Workflow transition target state was not found in this workflow';
    end if;

    -- ========================================================
    -- TASK ACTION AUTHORIZATION
    -- ========================================================

    if exists (
        select 1
        from public.workflow_transition_actions wta
        where wta.organization_id = p_organization_id
          and wta.workflow_transition_id = v_transition.id
          and wta.action_type = 'task'
          and wta.status = 'active'
    ) then
        if not public.current_user_has_permission(
            p_organization_id,
            'core.tasks.manage'
        ) then
            raise exception
                'Task manage permission is required to execute configured task actions';
        end if;
    end if;

    -- ========================================================
    -- WORKFLOW STATE UPDATE
    -- ========================================================

    update public.workflow_instances
    set
        current_state_id = v_transition.to_state_id,
        status = v_next_status,
        completed_at = v_completed_at,
        metadata = p_metadata
    where organization_id = p_organization_id
      and id = p_workflow_instance_id;

    -- ========================================================
    -- TRANSITION HISTORY
    -- ========================================================

    insert into public.workflow_instance_transitions (
        organization_id,
        workflow_instance_id,
        workflow_transition_id,
        from_state_id,
        to_state_id,
        actor_user_id,
        metadata
    )
    values (
        p_organization_id,
        v_instance.id,
        v_transition.id,
        v_instance.current_state_id,
        v_transition.to_state_id,
        v_actor_user_id,
        p_metadata
    )
    returning id into v_history_id;

    -- ========================================================
    -- CONFIGURED TASK ACTIONS
    -- ========================================================

    for v_task_action in
        select
            wta.id as workflow_transition_action_id,
            wtta.task_title_template,
            wtta.task_description_template,
            wtta.task_priority,
            wtta.due_after_minutes
        from public.workflow_transition_actions wta
        join public.workflow_transition_task_actions wtta
          on wtta.organization_id = wta.organization_id
         and wtta.workflow_transition_action_id = wta.id
        where wta.organization_id = p_organization_id
          and wta.workflow_transition_id = v_transition.id
          and wta.action_type = 'task'
          and wta.status = 'active'
        order by wta.created_at, wta.id
    loop
        v_task_action_count := v_task_action_count + 1;

        if nullif(trim(v_task_action.task_title_template), '') is null then
            raise exception
                'Configured workflow task action has an empty task title template';
        end if;

        if v_task_action.due_after_minutes is null then
            v_due_at := null;
        else
            v_due_at :=
                now()
                + make_interval(
                    mins => v_task_action.due_after_minutes
                );
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
            trim(v_task_action.task_title_template),
            nullif(
                trim(v_task_action.task_description_template),
                ''
            ),
            'open',
            v_task_action.task_priority,
            null,
            v_due_at
        )
        returning id into v_task_id;

        insert into public.workflow_task_links (
            organization_id,
            workflow_instance_id,
            workflow_instance_transition_id,
            workflow_transition_action_id,
            task_id
        )
        values (
            p_organization_id,
            v_instance.id,
            v_history_id,
            v_task_action.workflow_transition_action_id,
            v_task_id
        );
    end loop;

    return query
    select
        wi.id,
        v_history_id,
        wi.current_state_id,
        wi.status,
        wi.completed_at
    from public.workflow_instances wi
    where wi.organization_id = p_organization_id
      and wi.id = p_workflow_instance_id;
end;
$function$;

revoke all on function public.execute_workflow_transition(
    uuid,
    uuid,
    uuid,
    jsonb
) from public;

grant execute on function public.execute_workflow_transition(
    uuid,
    uuid,
    uuid,
    jsonb
) to authenticated;
