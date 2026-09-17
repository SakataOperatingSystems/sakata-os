-- SAKATA OS
-- School OS — Student permissions
-- Controls viewing and management of tenant-scoped student master records.

insert into public.permissions (
    module,
    code,
    name,
    description
)
values
(
    'school',
    'school.students.read',
    'View Students',
    'Allows viewing student master records within the current organization.'
),
(
    'school',
    'school.students.manage',
    'Manage Students',
    'Allows creating and updating student master records within the current organization.'
)
on conflict (code) do nothing;