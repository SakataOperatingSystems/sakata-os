begin;

create or replace function public.convert_student_admission_request(
  p_organization_id uuid,
  p_admission_id uuid
)
returns table (
  student_id uuid,
  student_reference text,
  admission_id uuid,
  admission_reference text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_admission public.student_admission_requests%rowtype;
  v_student public.students%rowtype;
  v_user_profile_id uuid;
begin
  if p_organization_id is null then
    raise exception 'Organization ID is required.';
  end if;

  if p_admission_id is null then
    raise exception 'Admission request ID is required.';
  end if;

  select um.user_profile_id
    into v_user_profile_id
  from public.user_profiles up
  join public.organization_memberships um
    on um.user_profile_id = up.id
   and um.organization_id = p_organization_id
  where up.auth_user_id = auth.uid()
    and um.status = 'active'
  limit 1;

  if v_user_profile_id is null then
    raise exception 'You are not an active member of this organization.';
  end if;

  select *
    into v_admission
  from public.student_admission_requests
  where organization_id = p_organization_id
    and id = p_admission_id
  for update;

  if not found then
    raise exception 'Admission request not found.';
  end if;

  if v_admission.status in ('rejected', 'withdrawn') then
    raise exception 'This admission request cannot be converted because its status is %.',
      v_admission.status;
  end if;

  select *
    into v_student
  from public.students
  where organization_id = p_organization_id
    and admission_request_id = p_admission_id
  limit 1
  for update;

  if found then
    if v_admission.status <> 'converted' then
      update public.student_admission_requests
      set
        status = 'converted',
        metadata = jsonb_set(
          jsonb_set(
            coalesce(metadata, '{}'::jsonb),
            '{converted_student_id}',
            to_jsonb(v_student.id),
            true
          ),
          '{converted_student_reference}',
          to_jsonb(v_student.student_id),
          true
        ),
        updated_at = now()
      where organization_id = p_organization_id
        and id = p_admission_id;
    end if;

    return query
    select
      v_student.id,
      v_student.student_id,
      v_admission.id,
      v_admission.admission_request_id;

    return;
  end if;

  insert into public.students (
    organization_id,
    full_name,
    gender,
    date_of_birth,
    admission_date,
    status,
    welfare_status,
    location,
    notes,
    admission_request_id
  )
  values (
    p_organization_id,
    trim(v_admission.applicant_name),
    v_admission.applicant_gender,
    v_admission.applicant_date_of_birth,
    v_admission.requested_admission_date,
    'active',
    null,
    null,
    v_admission.notes,
    v_admission.id
  )
  returning *
  into v_student;

  update public.student_admission_requests
  set
    status = 'converted',
    metadata = jsonb_set(
      jsonb_set(
        coalesce(metadata, '{}'::jsonb),
        '{converted_student_id}',
        to_jsonb(v_student.id),
        true
      ),
      '{converted_student_reference}',
      to_jsonb(v_student.student_id),
      true
    ),
    updated_at = now()
  where organization_id = p_organization_id
    and id = p_admission_id;

  perform public.emit_platform_event(
    p_organization_id,
    'admission.converted',
    'student_admission_request',
    v_admission.id,
    now(),
    jsonb_build_object(
      'admission_request_id', v_admission.admission_request_id,
      'admission_id', v_admission.id,
      'student_id', v_student.id,
      'student_reference', v_student.student_id,
      'applicant_name', v_student.full_name
    )
  );

  return query
  select
    v_student.id,
    v_student.student_id,
    v_admission.id,
    v_admission.admission_request_id;
end;
$function$;

revoke all on function public.convert_student_admission_request(uuid, uuid)
from public;

grant execute on function public.convert_student_admission_request(uuid, uuid)
to authenticated;

comment on function public.convert_student_admission_request(uuid, uuid)
is 'Atomically converts an organization admission request into its durable Student identity, reconciles existing admission-to-student links, preserves the admission relationship, and emits the admission.converted platform event for new conversions.';

update public.student_admission_requests a
set
  status = 'converted',
  metadata = jsonb_set(
    jsonb_set(
      coalesce(a.metadata, '{}'::jsonb),
      '{converted_student_id}',
      to_jsonb(s.id),
      true
    ),
    '{converted_student_reference}',
    to_jsonb(s.student_id),
    true
  ),
  updated_at = now()
from public.students s
where s.organization_id = a.organization_id
  and s.admission_request_id = a.id
  and a.status in ('open', 'approved');

commit;