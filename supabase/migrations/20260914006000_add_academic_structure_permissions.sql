-- SAKATA OS
-- Academic Structure permissions
-- Controls management of tenant-configurable education levels and class levels.

insert into public.permissions (
    module,
    code,
    name,
    description
)
values
(
    'school',
    'school.education_levels.read',
    'View Education Levels',
    'Allows viewing education levels within the current organization.'
),
(
    'school',
    'school.education_levels.manage',
    'Manage Education Levels',
    'Allows creating and updating education levels within the current organization.'
),
(
    'school',
    'school.class_levels.read',
    'View Class Levels',
    'Allows viewing class levels within the current organization.'
),
(
    'school',
    'school.class_levels.manage',
    'Manage Class Levels',
    'Allows creating and updating class levels within the current organization.'
)
on conflict (code) do nothing;