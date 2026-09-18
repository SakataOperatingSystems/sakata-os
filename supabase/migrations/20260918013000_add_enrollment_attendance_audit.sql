-- ============================================================
-- SAKATA OS
-- SCHOOL OS — AUDIT HARDENING
-- Migration: Audit Student Enrollment and Attendance Changes
-- ============================================================

-- ============================================================
-- STUDENT ENROLLMENT AUDIT
-- ============================================================

create or replace function public.audit_student_enrollment_change()
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
                then 'student_enrollment.created'
            else 'student_enrollment.updated'
        end,

        'student_enrollment',

        new.id,

        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'student_id', old.student_id,
                'class_id', old.class_id,
                'academic_period_id', old.academic_period_id,
                'enrollment_date', old.enrollment_date,
                'exit_date', old.exit_date,
                'status', old.status,
                'notes', old.notes,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,

        jsonb_build_object(
            'student_id', new.student_id,
            'class_id', new.class_id,
            'academic_period_id', new.academic_period_id,
            'enrollment_date', new.enrollment_date,
            'exit_date', new.exit_date,
            'status', new.status,
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

revoke execute on function public.audit_student_enrollment_change()
from public;

drop trigger if exists audit_student_enrollment_change
on public.student_enrollments;

create trigger audit_student_enrollment_change
after insert or update
on public.student_enrollments
for each row
execute function public.audit_student_enrollment_change();


-- ============================================================
-- STUDENT ATTENDANCE AUDIT
-- ============================================================

create or replace function public.audit_student_attendance_change()
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
                then 'student_attendance.created'
            else 'student_attendance.updated'
        end,

        'student_attendance',

        new.id,

        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'enrollment_id', old.enrollment_id,
                'attendance_date', old.attendance_date,
                'status', old.status,
                'notes', old.notes,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,

        jsonb_build_object(
            'enrollment_id', new.enrollment_id,
            'attendance_date', new.attendance_date,
            'status', new.status,
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

revoke execute on function public.audit_student_attendance_change()
from public;

drop trigger if exists audit_student_attendance_change
on public.student_attendance;

create trigger audit_student_attendance_change
after insert or update
on public.student_attendance
for each row
execute function public.audit_student_attendance_change();


-- ============================================================
-- COMMENTS
-- ============================================================

comment on function public.audit_student_enrollment_change()
is 'Writes immutable audit events for student enrollment creation and updates.';

comment on function public.audit_student_attendance_change()
is 'Writes immutable audit events for student attendance creation and updates.';
