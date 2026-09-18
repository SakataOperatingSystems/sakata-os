-- ============================================================
-- SAKATA OS
-- SCHOOL OS — ATTENDANCE PERMISSIONS
-- Migration: Assign Attendance Permissions
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
      'school.attendance.read',
      'school.attendance.manage'
  )
on conflict do nothing;
