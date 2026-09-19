-- ============================================================
-- SAKATA OS
-- SCHOOL OS — STUDENT ADMISSION REQUESTS
-- ============================================================
-- Purpose:
-- Represents the operational admission process separately from
-- the canonical student master and historical enrollment records.
--
-- Lifecycle:
-- Admission Request → Workflow Instance → Student → Enrollment
-- ============================================================

create table public.student_admission_requests (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null
        references public.organizations(id) on delete cascade,

    admission_request_id text not null,

    applicant_name text not null,
    applicant_gender text,
    applicant_date_of_birth date,

    requested_admission_date date,

    status text not null default 'open',

    notes text,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint student_admission_requests_organization_id_id_unique
        unique (organization_id, id),

    constraint student_admission_requests_admission_request_id_unique
        unique (organization_id, admission_request_id),

    constraint student_admission_requests_admission_request_id_not_empty
        check (length(trim(admission_request_id)) > 0),

    constraint student_admission_requests_applicant_name_not_empty
        check (length(trim(applicant_name)) > 0),

    constraint student_admission_requests_applicant_gender_check
        check (
            applicant_gender is null
            or applicant_gender in ('male', 'female', 'other')
        ),

    constraint student_admission_requests_status_check
        check (
            status in ('open', 'approved', 'rejected', 'withdrawn', 'converted')
        ),

    constraint student_admission_requests_metadata_object
        check (jsonb_typeof(metadata) = 'object')
);

create index student_admission_requests_organization_id_idx
    on public.student_admission_requests (organization_id);

create index student_admission_requests_status_idx
    on public.student_admission_requests (organization_id, status);

create index student_admission_requests_created_at_idx
    on public.student_admission_requests (organization_id, created_at desc);

alter table public.student_admission_requests enable row level security;

create policy "student admission requests read access"
on public.student_admission_requests
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

create policy "student admission requests manage insert access"
on public.student_admission_requests
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'school.admission_requests.manage'
    )
);

create policy "student admission requests manage update access"
on public.student_admission_requests
for update
to authenticated
using (
    public.current_user_has_permission(
        organization_id,
        'school.admission_requests.manage'
    )
)
with check (
    public.current_user_has_permission(
        organization_id,
        'school.admission_requests.manage'
    )
);

grant select, insert, update
on public.student_admission_requests
to authenticated;

create or replace function public.set_student_admission_request_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger set_student_admission_request_updated_at
before update on public.student_admission_requests
for each row
execute function public.set_student_admission_request_updated_at();

create or replace function public.audit_student_admission_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.audit_events (
        organization_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        previous_data,
        new_data
    )
    values (
        coalesce(new.organization_id, old.organization_id),
        auth.uid(),
        case
            when tg_op = 'INSERT' then 'student_admission_request.created'
            when tg_op = 'UPDATE' then 'student_admission_request.updated'
        end,
        'student_admission_request',
        coalesce(new.id, old.id),
        case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
        case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
    );

    return coalesce(new, old);
end;
$$;

create trigger audit_student_admission_request
after insert or update on public.student_admission_requests
for each row
execute function public.audit_student_admission_request_change();

comment on table public.student_admission_requests is
'Operational School OS admission requests. Kept separate from the canonical students master and student_enrollments history.';

comment on column public.student_admission_requests.admission_request_id is
'Human-readable admission request identifier unique within the organization.';

comment on column public.student_admission_requests.status is
'Operational request status. Workflow state is held by the Core Platform workflow instance.';
