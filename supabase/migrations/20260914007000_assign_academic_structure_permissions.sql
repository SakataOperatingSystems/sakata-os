-- SAKATA OS
-- Assign Academic Structure permissions to organization administrators.

insert into public.role_permissions (
    role_id,
    permission_id
)
select
    r.id,
    p.id
from public.roles r
cross join public.permissions p
where r.code = 'organization_admin'
  and p.code in (
      'school.education_levels.read',
      'school.education_levels.manage',
      'school.class_levels.read',
      'school.class_levels.manage'
  )
on conflict do nothing;