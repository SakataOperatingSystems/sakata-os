-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — TASKS
-- Migration: Assign Task permissions
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
      'core.tasks.read',
      'core.tasks.manage'
  )
on conflict do nothing;
