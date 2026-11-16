begin;

-- ============================================================
-- F18
-- ADMISSION CONVERSION -> WORKFLOW CLOSURE
-- ============================================================

do $$
declare
    v_definition record;
    v_converted_state_id uuid;
    v_approved_state_id uuid;
    v_review_state_id uuid;
begin
    for v_definition in
        select distinct
            wi.organization_id,
            wi.workflow_definition_id
        from public.workflow_instances wi
        where wi.subject_type = 'student_admission_request'
    loop

        select ws.id
        into v_converted_state_id
        from public.workflow_states ws
        where ws.organization_id = v_definition.organization_id
          and ws.workflow_definition_id = v_definition.workflow_definition_id
          and ws.code = 'admission_converted'
        limit 1;

        if v_converted_state_id is null then
            insert into public.workflow_states (
                organization_id,
                workflow_definition_id,
                code,
                name,
                description,
                sequence,
                is_initial,
                is_terminal
            )
            values (
                v_definition.organization_id,
                v_definition.workflow_definition_id,
                'admission_converted',
                'Admission Converted',
                'Admission converted into a Student and admission workflow completed.',
                coalesce(
                    (
                        select max(ws.sequence) + 1
                        from public.workflow_states ws
                        where ws.organization_id = v_definition.organization_id
                          and ws.workflow_definition_id = v_definition.workflow_definition_id
                    ),
                    1
                ),
                false,
                true
            )
            returning id into v_converted_state_id;
        end if;

        select ws.id
        into v_approved_state_id
        from public.workflow_states ws
        where ws.organization_id = v_definition.organization_id
          and ws.workflow_definition_id = v_definition.workflow_definition_id
          and ws.code = 'admission_approved'
        limit 1;

        if v_approved_state_id is not null
           and not exists (
                select 1
                from public.workflow_transitions wt
                where wt.organization_id = v_definition.organization_id
                  and wt.workflow_definition_id = v_definition.workflow_definition_id
                  and wt.code = 'convert_admission'
           )
        then
            insert into public.workflow_transitions (
                organization_id,
                workflow_definition_id,
                from_state_id,
                to_state_id,
                code,
                name,
                description
            )
            values (
                v_definition.organization_id,
                v_definition.workflow_definition_id,
                v_approved_state_id,
                v_converted_state_id,
                'convert_admission',
                'Convert to Student',
                'Convert the approved admission into a Student and complete the admission workflow.'
            );
        end if;

        select ws.id
        into v_review_state_id
        from public.workflow_states ws
        where ws.organization_id = v_definition.organization_id
          and ws.workflow_definition_id = v_definition.workflow_definition_id
          and ws.code = 'admission_review'
        limit 1;

        if v_review_state_id is not null
           and not exists (
                select 1
                from public.workflow_transitions wt
                where wt.organization_id = v_definition.organization_id
                  and wt.workflow_definition_id = v_definition.workflow_definition_id
                  and wt.code = 'reconcile_admission_conversion'
           )
        then
            insert into public.workflow_transitions (
                organization_id,
                workflow_definition_id,
                from_state_id,
                to_state_id,
                code,
                name,
                description
            )
            values (
                v_definition.organization_id,
                v_definition.workflow_definition_id,
                v_review_state_id,
                v_converted_state_id,
                'reconcile_admission_conversion',
                'Reconcile Converted Admission',
                'System reconciliation for an admission already converted into a Student.'
            );
        end if;

    end loop;
end;
$$;


-- ============================================================
-- CORE CLOSURE FUNCTION
-- ============================================================

create or replace function public.close_converted_student_admission_workflow(
    p_organization_id uuid,
    p_admission_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_instance public.workflow_instances%rowtype;
    v_current_state public.workflow_states%rowtype;
    v_target_state public.workflow_states%rowtype;
    v_transition public.workflow_transitions%rowtype;
    v_actor_user_id uuid;
    v_action text;
    v_metadata jsonb;
begin
    select wi.*
    into v_instance
    from public.workflow_instances wi
    where wi.organization_id = p_organization_id
      and wi.subject_type = 'student_admission_request'
      and wi.subject_id = p_admission_id
      and wi.status = 'active'
    order by wi.created_at desc
    limit 1
    for update;

    if not found then
        return;
    end if;

    select ws.*
    into v_current_state
    from public.workflow_states ws
    where ws.organization_id = v_instance.organization_id
      and ws.id = v_instance.current_state_id;

    select ws.*
    into v_target_state
    from public.workflow_states ws
    where ws.organization_id = v_instance.organization_id
      and ws.workflow_definition_id = v_instance.workflow_definition_id
      and ws.code = 'admission_converted'
    limit 1;

    if v_target_state.id is null then
        raise exception 'Admission conversion workflow target state is not configured.';
    end if;

    if v_current_state.code = 'admission_approved' then

        select wt.*
        into v_transition
        from public.workflow_transitions wt
        where wt.organization_id = v_instance.organization_id
          and wt.workflow_definition_id = v_instance.workflow_definition_id
          and wt.code = 'convert_admission'
          and wt.from_state_id = v_current_state.id
          and wt.to_state_id = v_target_state.id
        limit 1;

        v_action := 'convert_admission';

    elsif v_current_state.code = 'admission_review' then

        select wt.*
        into v_transition
        from public.workflow_transitions wt
        where wt.organization_id = v_instance.organization_id
          and wt.workflow_definition_id = v_instance.workflow_definition_id
          and wt.code = 'reconcile_admission_conversion'
          and wt.from_state_id = v_current_state.id
          and wt.to_state_id = v_target_state.id
        limit 1;

        v_action := 'reconcile_admission_conversion';

    elsif v_current_state.code = 'admission_converted' then

        update public.workflow_instances
        set
            status = 'completed',
            completed_at = coalesce(completed_at, now()),
            updated_at = now()
        where organization_id = v_instance.organization_id
          and id = v_instance.id;

        return;

    else
        raise exception
            'Converted admission cannot close workflow from state %.',
            v_current_state.code;
    end if;

    if v_transition.id is null then
        raise exception
            'Admission conversion workflow transition % is not configured.',
            v_action;
    end if;

    select up.id
    into v_actor_user_id
    from public.user_profiles up
    join public.organization_memberships om
      on om.user_profile_id = up.id
     and om.organization_id = p_organization_id
     and om.status = 'active'
    where up.auth_user_id = auth.uid()
      and up.status = 'active'
    limit 1;

    v_metadata := jsonb_build_object(
        'source', 'student_admission_conversion',
        'action', v_action,
        'admission_id', p_admission_id
    );

    if v_action = 'reconcile_admission_conversion' then
        v_metadata := v_metadata || jsonb_build_object(
            'reason',
            'Admission was already converted before workflow closure was implemented.'
        );
    end if;

    update public.workflow_instances
    set
        current_state_id = v_target_state.id,
        status = 'completed',
        completed_at = coalesce(completed_at, now()),
        metadata = coalesce(metadata, '{}'::jsonb) || v_metadata,
        updated_at = now()
    where organization_id = v_instance.organization_id
      and id = v_instance.id;

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
        v_instance.organization_id,
        v_instance.id,
        v_transition.id,
        v_current_state.id,
        v_target_state.id,
        v_actor_user_id,
        v_metadata
    );
end;
$$;

revoke execute on function public.close_converted_student_admission_workflow(
    uuid,
    uuid
) from public;


-- ============================================================
-- TRIGGER WRAPPER
-- ============================================================

create or replace function public.close_converted_student_admission_workflow_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if new.status = 'converted'
       and old.status is distinct from new.status
    then
        perform public.close_converted_student_admission_workflow(
            new.organization_id,
            new.id
        );
    end if;

    return new;
end;
$$;

revoke execute on function public.close_converted_student_admission_workflow_trigger()
from public;

drop trigger if exists close_converted_student_admission_workflow
on public.student_admission_requests;

create trigger close_converted_student_admission_workflow
after update of status
on public.student_admission_requests
for each row
execute function public.close_converted_student_admission_workflow_trigger();


-- ============================================================
-- RECONCILE EXISTING BROKEN RECORDS
-- ============================================================

do $$
declare
    v_row record;
begin
    for v_row in
        select
            sar.organization_id,
            sar.id
        from public.student_admission_requests sar
        join public.workflow_instances wi
          on wi.organization_id = sar.organization_id
         and wi.subject_type = 'student_admission_request'
         and wi.subject_id = sar.id
         and wi.status = 'active'
        where sar.status = 'converted'
    loop
        perform public.close_converted_student_admission_workflow(
            v_row.organization_id,
            v_row.id
        );
    end loop;
end;
$$;


comment on function public.close_converted_student_admission_workflow(
    uuid,
    uuid
) is
'Closes an active student admission workflow when its admission has been converted into a Student.';

commit;
