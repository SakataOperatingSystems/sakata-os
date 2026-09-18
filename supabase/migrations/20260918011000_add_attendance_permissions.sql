-- ============================================================
-- SAKATA OS
-- SCHOOL OS — ATTENDANCE PERMISSIONS
-- Migration: Attendance Permissions
-- ============================================================

insert into public.permissions (
    module,
    code,
    name,
    description
)
values
(
    'school',
    'school.attendance.read',
    'View Attendance',
    'Allows viewing student attendance records within the current organization.'
),
(
    'school',
    'school.attendance.manage',
    'Manage Attendance',
    'Allows creating and updating student attendance records within the current organization.'
)
on conflict (code) do nothing;
