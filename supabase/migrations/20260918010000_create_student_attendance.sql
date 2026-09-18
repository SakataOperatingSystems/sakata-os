-- ============================================================
-- SAKATA OS
-- SCHOOL OS — ATTENDANCE
-- Migration: Student Attendance Foundation
-- ============================================================

-- ============================================================
-- TENANT-SAFE REFERENCE KEY
-- ============================================================

alter table public.student_enrollments
    add constraint student_enrollments_organization_id_id_unique
    unique (organization_id, id);

-- ============================================================
-- STUDENT ATTENDANCE
-- ============================================================

create table public.student_attendance (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    enrollment_id uuid not null,

    attendance_date date not null default current_date,

    status text not null default 'present',

    notes text,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint student_attendance_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint student_attendance_enrollment_fkey
        foreign key (
            organization_id,
            enrollment_id
        )
        references public.student_enrollments (
            organization_id,
            id
        )
        on delete restrict,

    constraint student_attendance_status_check
        check (
            status in (
                'present',
                'absent',
                'late',
                'excused'
            )
        ),

    constraint student_attendance_notes_not_empty
        check (
            notes is null
            or length(trim(notes)) > 0
        ),

    constraint student_attendance_unique_enrollment_date
        unique (
            organization_id,
            enrollment_id,
            attendance_date
        )
);

-- ============================================================
-- INDEXES
-- ============================================================

create index student_attendance_organization_id_idx
    on public.student_attendance(organization_id);

create index student_attendance_enrollment_id_idx
    on public.student_attendance(
        organization_id,
        enrollment_id
    );

create index student_attendance_date_idx
    on public.student_attendance(
        organization_id,
        attendance_date
    );

create index student_attendance_status_idx
    on public.student_attendance(
        organization_id,
        status
    );

create index student_attendance_enrollment_date_idx
    on public.student_attendance(
        organization_id,
        enrollment_id,
        attendance_date
    );

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.student_attendance enable row level security;

grant select on table public.student_attendance
to authenticated;

grant insert, update on table public.student_attendance
to authenticated;

-- ============================================================
-- READ ACCESS
-- ============================================================

create policy "organization members can read student attendance"
on public.student_attendance
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

-- ============================================================
-- WRITE ACCESS
-- ============================================================

create policy "organization members with attendance manage permission can insert student attendance"
on public.student_attendance
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'school.attendance.manage'
    )
);

create policy "organization members with attendance manage permission can update student attendance"
on public.student_attendance
for update
to authenticated
using (
    public.current_user_has_permission(
        organization_id,
        'school.attendance.manage'
    )
)
with check (
    public.current_user_has_permission(
        organization_id,
        'school.attendance.manage'
    )
);

-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function public.set_student_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_student_attendance_updated_at()
from public;

drop trigger if exists set_student_attendance_updated_at
on public.student_attendance;

create trigger set_student_attendance_updated_at
before update on public.student_attendance
for each row
execute function public.set_student_attendance_updated_at();

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.student_attendance is
'Daily attendance record anchored to a canonical student enrollment.';

comment on column public.student_attendance.enrollment_id is
'Reference to the canonical student enrollment that determines student, class and academic period context.';

comment on column public.student_attendance.attendance_date is
'Calendar date on which attendance was recorded.';

comment on column public.student_attendance.status is
'Attendance state: present, absent, late or excused.';

comment on column public.student_attendance.notes is
'Optional operational note associated with the attendance record.';
