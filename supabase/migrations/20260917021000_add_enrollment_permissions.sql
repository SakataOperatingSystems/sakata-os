-- ============================================================
-- SAKATA OS
-- SCHOOL OS — ENROLLMENT PERMISSIONS
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
    'school.enrollments.read',
    'View Enrollments',
    'Allows viewing student enrollment records within the current organization.'
),
(
    'school',
    'school.enrollments.manage',
    'Manage Enrollments',
    'Allows creating and updating student enrollment records within the current organization.'
)
on conflict (code) do nothing;