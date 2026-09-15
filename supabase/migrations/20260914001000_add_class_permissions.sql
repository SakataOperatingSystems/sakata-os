insert into public.permissions (
    module,
    code,
    name,
    description
)
values
(
    'school',
    'school.classes.read',
    'View Classes',
    'Allows viewing classes within the current organization.'
),
(
    'school',
    'school.classes.manage',
    'Manage Classes',
    'Allows creating and updating classes within the current organization.'
)
on conflict (code) do nothing;
