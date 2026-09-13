insert into public.permissions (
    module,
    code,
    name,
    description
)
values
(
    'school',
    'school.academic_periods.read',
    'View Academic Periods',
    'Allows viewing academic periods within the current organization.'
),
(
    'school',
    'school.academic_periods.manage',
    'Manage Academic Periods',
    'Allows creating and updating academic periods within the current organization.'
)
on conflict (code) do nothing;