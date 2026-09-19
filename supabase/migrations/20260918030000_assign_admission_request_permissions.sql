-- ============================================================
-- SAKATA OS
-- SCHOOL OS — ASSIGN ADMISSION REQUEST PERMISSIONS
-- ============================================================
-- Assign admission request permissions to organization
-- administrators using the existing role-permission model.
-- ============================================================

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
      'school.admission_requests.read',
      'school.admission_requests.manage'
  )
on conflict do nothing;
