-- ============================================================
-- SAKATA OS
-- SCHOOL OS — STUDENT MASTER ENTITY
-- Migration: Student Foundation
-- ============================================================

-- ============================================================
-- STUDENTS
-- ============================================================

create table public.students (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    student_id text not null,

    full_name text not null,

    gender text,

    date_of_birth date,

    admission_date date,

    nin text,

    status text not null default 'active',

    welfare_status text,

    location text,

    notes text,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint students_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint students_student_id_not_empty
        check (length(trim(student_id)) > 0),

    constraint students_full_name_not_empty
        check (length(trim(full_name)) > 0),

    constraint students_gender_check
        check (
            gender is null
            or gender in (
                'male',
                'female',
                'other',
                'unspecified'
            )
        ),

    constraint students_status_check
        check (
            status in (
                'active',
                'inactive',
                'graduated',
                'withdrawn',
                'transferred',
                'deceased'
            )
        ),

    constraint students_welfare_status_not_empty
        check (
            welfare_status is null
            or length(trim(welfare_status)) > 0
        ),

    constraint students_location_not_empty
        check (
            location is null
            or length(trim(location)) > 0
        ),

    constraint students_student_id_unique_per_organization
        unique (
            organization_id,
            student_id
        )
);

-- ============================================================
-- INDEXES
-- ============================================================

create index students_organization_id_idx
    on public.students(organization_id);

create index students_status_idx
    on public.students(status);

create index students_full_name_idx
    on public.students(full_name);

create index students_admission_date_idx
    on public.students(admission_date);

create index students_nin_idx
    on public.students(nin);

create index students_organization_status_idx
    on public.students(
        organization_id,
        status
    );

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.students enable row level security;

-- ============================================================
-- READ ACCESS
-- ============================================================

grant select on table public.students
to authenticated;

create policy "organization members can read students"
on public.students
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

-- ============================================================
-- WRITE ACCESS
-- ============================================================

grant insert, update on table public.students
to authenticated;

create policy "organization members with manage permission can insert students"
on public.students
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'school.students.manage'
    )
);

create policy "organization members with manage permission can update students"
on public.students
for update
to authenticated
using (
    public.current_user_has_permission(
        organization_id,
        'school.students.manage'
    )
)
with check (
    public.current_user_has_permission(
        organization_id,
        'school.students.manage'
    )
);

-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function public.set_student_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_student_updated_at()
from public;

drop trigger if exists set_student_updated_at
on public.students;

create trigger set_student_updated_at
before update on public.students
for each row
execute function public.set_student_updated_at();

-- ============================================================
-- AUDIT
-- ============================================================

create or replace function public.audit_student_change()
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
                then 'student.created'
            else 'student.updated'
        end,

        'student',

        new.id,

        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'student_id', old.student_id,
                'full_name', old.full_name,
                'gender', old.gender,
                'date_of_birth', old.date_of_birth,
                'admission_date', old.admission_date,
                'nin', old.nin,
                'status', old.status,
                'welfare_status', old.welfare_status,
                'location', old.location,
                'notes', old.notes,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,

        jsonb_build_object(
            'student_id', new.student_id,
            'full_name', new.full_name,
            'gender', new.gender,
            'date_of_birth', new.date_of_birth,
            'admission_date', new.admission_date,
            'nin', new.nin,
            'status', new.status,
            'welfare_status', new.welfare_status,
            'location', new.location,
            'notes', new.notes,
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

revoke execute on function public.audit_student_change()
from public;

drop trigger if exists audit_student_change
on public.students;

create trigger audit_student_change
after insert or update
on public.students
for each row
execute function public.audit_student_change();

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.students is
'Master student entity for School OS. Student identity is independent of enrollment, class and academic period.';

comment on column public.students.organization_id is
'Tenant organization owning the student record.';

comment on column public.students.student_id is
'Stable organization-defined student identifier.';

comment on column public.students.full_name is
'Human-readable student name.';

comment on column public.students.gender is
'Student gender classification where recorded.';

comment on column public.students.date_of_birth is
'Student date of birth where recorded.';

comment on column public.students.admission_date is
'Date the student was admitted to the organization.';

comment on column public.students.nin is
'National Identification Number where applicable.';

comment on column public.students.status is
'Student lifecycle status.';

comment on column public.students.welfare_status is
'Student welfare or support classification where applicable.';

comment on column public.students.location is
'Student location information where applicable.';

comment on column public.students.notes is
'Additional controlled operational notes.';

comment on column public.students.created_at is
'Timestamp when the student record was created.';

comment on column public.students.updated_at is
'Timestamp when the student record was last updated.';