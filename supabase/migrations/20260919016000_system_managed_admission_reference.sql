drop function if exists public.create_student_admission_with_workflow(
    uuid,
    text,
    text,
    text,
    date,
    date,
    text,
    text,
    jsonb
);

create function public.create_student_admission_with_workflow(
    p_organization_id uuid,
    p_applicant_name text,
    p_applicant_gender text default null,
    p_applicant_date_of_birth date default null,
    p_requested_admission_date date default null,
    p_status text default 'open',
    p_notes text default null,
    p_metadata jsonb default '{}'::jsonb
)
returns table (
    admission_request_id uuid,
    admission_request_reference text,
    workflow_instance_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_admission_id uuid;
    v_workflow_definition_id uuid;
    v_initial_state_id uuid;
    v_workflow_instance_id uuid;
    v_sequence_number integer;
    v_sequence_year integer;
    v_admission_reference text;
begin
    if p_organization_id is null then
        raise exception 'Organization ID is required.';
    end if;

    if not public.is_current_user_org_member(
        p_organization_id
    ) then
        raise exception 'The current user is not an active member of the requested organization.';
    end if;

    if not public.current_user_has_permission(
        p_organization_id,
        'school.admission_requests.manage'
    ) then
        raise exception 'The current user does not have permission to manage student admission requests.';
    end if;

    if not public.current_user_has_permission(
        p_organization_id,
        'core.workflows.manage'
    ) then
        raise exception 'The current user does not have permission to manage workflows.';
    end if;

    if nullif(trim(p_applicant_name), '') is null then
        raise exception 'Applicant name is required.';
    end if;

    if length(trim(p_applicant_name)) > 200 then
        raise exception 'Applicant name must be 200 characters or fewer.';
    end if;

    select wd.id
    into v_workflow_definition_id
    from public.workflow_definitions wd
    where wd.organization_id = p_organization_id
      and wd.code = 'student_admission'
      and wd.status = 'active';

    if v_workflow_definition_id is null then
        raise exception 'The active student_admission workflow is not configured for this organization.';
    end if;

    select ws.id
    into v_initial_state_id
    from public.workflow_states ws
    where ws.organization_id = p_organization_id
      and ws.workflow_definition_id = v_workflow_definition_id
      and ws.code = 'admission_requested'
      and ws.is_initial = true;

    if v_initial_state_id is null then
        raise exception 'The admission_requested initial workflow state is not configured.';
    end if;

    v_sequence_year := extract(year from current_date)::integer;

    v_sequence_number := public.next_organization_number(
        p_organization_id,
        'admission_request',
        v_sequence_year
    );

    v_admission_reference := format(
        'ADM-%s-%s',
        v_sequence_year,
        lpad(v_sequence_number::text, 4, '0')
    );

    insert into public.student_admission_requests (
        organization_id,
        admission_request_id,
        applicant_name,
        applicant_gender,
        applicant_date_of_birth,
        requested_admission_date,
        status,
        notes,
        metadata
    )
    values (
        p_organization_id,
        v_admission_reference,
        trim(p_applicant_name),
        p_applicant_gender,
        p_applicant_date_of_birth,
        p_requested_admission_date,
        coalesce(nullif(trim(p_status), ''), 'open'),
        p_notes,
        coalesce(p_metadata, '{}'::jsonb)
    )
    returning id
    into v_admission_id;

    insert into public.workflow_instances (
        organization_id,
        workflow_definition_id,
        current_state_id,
        subject_type,
        subject_id,
        status,
        metadata
    )
    values (
        p_organization_id,
        v_workflow_definition_id,
        v_initial_state_id,
        'student_admission_request',
        v_admission_id,
        'active',
        jsonb_build_object(
            'admission_request_id',
            v_admission_reference
        )
    )
    returning id
    into v_workflow_instance_id;

    admission_request_id := v_admission_id;
    admission_request_reference := v_admission_reference;
    workflow_instance_id := v_workflow_instance_id;

    return next;
end;
$$;

comment on function public.create_student_admission_with_workflow(
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    jsonb
) is
    'Creates a student admission request with a system-generated organization-scoped yearly business reference and its initial workflow instance atomically.';

grant execute on function public.create_student_admission_with_workflow(
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    jsonb
) to authenticated;
