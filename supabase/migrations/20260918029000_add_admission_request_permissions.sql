-- ============================================================
-- SAKATA OS
-- SCHOOL OS — ADMISSION REQUEST PERMISSIONS
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
    'school.admission_requests.read',
    'View Admission Requests',
    'Allows viewing student admission requests within the current organization.'
),
(
    'school',
    'school.admission_requests.manage',
    'Manage Admission Requests',
    'Allows creating and updating student admission requests within the current organization.'
)
on conflict (code) do nothing;
