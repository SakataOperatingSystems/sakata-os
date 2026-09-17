-- ============================================================
-- SAKATA OS
-- SCHOOL OS — STUDENT ENROLLMENT
-- Migration: Student Enrollment Foundation
-- ============================================================

-- ============================================================
-- TENANT-SAFE REFERENCE KEYS
-- ============================================================

alter table public.students
    add constraint students_organization_id_id_unique
    unique (organization_id, id);

alter table public.classes
    add constraint classes_organization_id_id_unique
    unique (organization_id, id);

-- ============================================================
-- STUDENT ENROLLMENTS
-- ============================================================

create table public.student_enrollments (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    student_id uuid not null,

    class_id uuid not null,

    academic_period_id uuid not null,

    enrollment_date date not null default current_date,

    exit_date date,

    status text not null default 'active',

    notes text,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint student_enrollments_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint student_enrollments_student_fkey
        foreign key (
            organization_id,
            student_id
        )
        references public.students (
            organization_id,
            id
        )
        on delete restrict,

    constraint student_enrollments_class_fkey
        foreign key (
            organization_id,
            class_id
        )
        references public.classes (
            organization_id,
            id
        )
        on delete restrict,

    constraint student_enrollments_academic_period_fkey
        foreign key (
            organization_id,
            academic_period_id
        )
        references public.academic_periods (
            organization_id,
            id
        )
        on delete restrict,

    constraint student_enrollments_status_check
        check (
            status in (
                'active',
                'completed',
                'withdrawn',
                'transferred',
                'cancelled'
            )
        ),

    constraint student_enrollments_dates_check
        check (
            exit_date is null
            or exit_date >= enrollment_date
        ),

    constraint student_enrollments_notes_not_empty
        check (
            notes is null
            or length(trim(notes)) > 0
        ),

    constraint student_enrollments_unique_student_class_period
        unique (
            organization_id,
            student_id,
            class_id,
            academic_period_id
        )
);

-- ============================================================
-- INDEXES
-- ============================================================

create index student_enrollments_organization_id_idx
    on public.student_enrollments(organization_id);

create index student_enrollments_student_id_idx
    on public.student_enrollments(
        organization_id,
        student_id
    );

create index student_enrollments_class_id_idx
    on public.student_enrollments(
        organization_id,
        class_id
    );

create index student_enrollments_academic_period_id_idx
    on public.student_enrollments(
        organization_id,
        academic_period_id
    );

create index student_enrollments_status_idx
    on public.student_enrollments(
        organization_id,
        status
    );

create index student_enrollments_active_student_idx
    on public.student_enrollments(
        organization_id,
        student_id,
        status
    )
    where status = 'active';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.student_enrollments enable row level security;

grant select on table public.student_enrollments
to authenticated;

grant insert, update on table public.student_enrollments
to authenticated;

-- ============================================================
-- READ ACCESS
-- ============================================================

create policy "organization members can read student enrollments"
on public.student_enrollments
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

-- ============================================================
-- WRITE ACCESS
-- ============================================================

create policy "organization members with manage permission can insert student enrollments"
on public.student_enrollments
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'school.enrollments.manage'
    )
);

create policy "organization members with manage permission can update student enrollments"
on public.student_enrollments
for update
to authenticated
using (
    public.current_user_has_permission(
        organization_id,
        'school.enrollments.manage'
    )
)
with check (
    public.current_user_has_permission(
        organization_id,
        'school.enrollments.manage'
    )
);

-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function public.set_student_enrollment_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_student_enrollment_updated_at()
from public;

drop trigger if exists set_student_enrollment_updated_at
on public.student_enrollments;

create trigger set_student_enrollment_updated_at
before update on public.student_enrollments
for each row
execute function public.set_student_enrollment_updated_at();

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.student_enrollments is
'Historical link between a canonical student, class and academic period.';

comment on column public.student_enrollments.student_id is
'Reference to the canonical student master entity.';

comment on column public.student_enrollments.class_id is
'Reference to the academic class containing this enrollment.';

comment on column public.student_enrollments.academic_period_id is
'Academic period governing this enrollment.';

comment on column public.student_enrollments.enrollment_date is
'Date the student entered this enrollment.';

comment on column public.student_enrollments.exit_date is
'Optional date the student exited this enrollment.';

comment on column public.student_enrollments.status is
'Lifecycle status of this enrollment record.';