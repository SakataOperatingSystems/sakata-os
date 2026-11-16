insert into public.permissions (
    module,
    code,
    name,
    description
)
values
(
    'school',
    'school.fees.read',
    'View Fee Structures',
    'Allows viewing school fee structures within the current organization.'
),
(
    'school',
    'school.fees.manage',
    'Manage Fee Structures',
    'Allows creating and updating school fee structures within the current organization.'
)
on conflict (code) do nothing;
