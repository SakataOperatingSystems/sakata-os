-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — AUTOMATION
-- Migration: Automation permissions
-- ============================================================
--
-- Establishes authorization permissions for the reusable
-- automation capability.
--
-- Permissions:
--   core.automation.read
--   core.automation.manage
--   core.automation.execute
--
-- organization_admin receives all three permissions.
-- ============================================================


insert into public.permissions (
    module,
    code,
    name,
    description
)
values
(
    'core',
    'core.automation.read',
    'View Automation',
    'Allows viewing tenant-scoped automation rules and automation jobs within the current organization.'
),
(
    'core',
    'core.automation.manage',
    'Manage Automation',
    'Allows creating and managing tenant-scoped automation rules within the current organization.'
),
(
    'core',
    'core.automation.execute',
    'Execute Automation',
    'Allows executing eligible tenant-scoped automation jobs within the current organization.'
)
on conflict (code) do nothing;


-- ============================================================
-- ASSIGN TO ORGANIZATION ADMIN
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
      'core.automation.read',
      'core.automation.manage',
      'core.automation.execute'
  )
on conflict do nothing;


-- ============================================================
-- COMPLETE
-- ============================================================
