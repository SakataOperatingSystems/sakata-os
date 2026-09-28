-- ============================================================
-- SAKATA OS
-- CORE PLATFORM ? WORKFLOW TASK ASSIGNMENT
-- Migration: Assign workflow-generated tasks to transition actor
-- ============================================================

-- ============================================================
-- SAKATA OS
-- SCHOOL OS — ADMISSION WORKFLOW STATUS SYNCHRONIZATION
-- Migration: Synchronize admission operational status with
--            student_admission workflow transitions
-- ============================================================
-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — WORKFLOW RUNTIME
-- Migration: Route workflow tasks through governed authenticated boundary
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
    v_admission_status text;
    v_target_state_code text;
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
    -- SCHOOL OS ADMISSION STATUS SYNCHRONIZATION
    -- ========================================================

    if v_instance.subject_type = 'student_admission_request' then
        if not public.current_user_has_permission(
            p_organization_id,
            'school.admission_requests.manage'
        ) then
            raise exception
                'Admission manage permission is required to transition a student admission workflow';
        end if;

        select ws.code
        into v_target_state_code
        from public.workflow_states ws
        where ws.organization_id = p_organization_id
          and ws.workflow_definition_id = v_instance.workflow_definition_id
          and ws.id = v_transition.to_state_id;

        if v_target_state_code in (
            'admission_requested',
            'admission_review',
            'admission_approved',
            'admission_rejected'
        ) then
            select sar.status
            into v_admission_status
            from public.student_admission_requests sar
            where sar.organization_id = p_organization_id
              and sar.id = v_instance.subject_id
            for update;

            if not found then
                raise exception
                    'Student admission request subject was not found for workflow instance';
            end if;

            v_admission_status :=
                case v_target_state_code
                    when 'admission_requested' then 'open'
                    when 'admission_review' then 'open'
                    when 'admission_approved' then 'approved'
                    when 'admission_rejected' then 'rejected'
                end;

            update public.student_admission_requests
            set
                status = v_admission_status
            where organization_id = p_organization_id
              and id = v_instance.subject_id;
        end if;
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

        v_task_id := public.create_task_for_current_user(
            p_organization_id,
            trim(v_task_action.task_title_template),
            nullif(
                trim(v_task_action.task_description_template),
                ''
            ),
            v_task_action.task_priority,
            v_actor_user_id,
            v_due_at
        );

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




-- ============================================================
-- BACKFILL EXISTING WORKFLOW-GENERATED TASKS
-- ============================================================

update public.tasks t
set assigned_to_user_id = wit.actor_user_id
from public.workflow_task_links wtl
join public.workflow_instance_transitions wit
  on wit.organization_id = wtl.organization_id
 and wit.id = wtl.workflow_instance_transition_id
join public.organization_memberships om
  on om.organization_id = wit.organization_id
 and om.user_profile_id = wit.actor_user_id
 and om.status = 'active'
where t.id = wtl.task_id
  and t.organization_id = wtl.organization_id
  and t.assigned_to_user_id is null
  and wit.actor_user_id is not null;

