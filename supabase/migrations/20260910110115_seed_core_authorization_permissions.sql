insert into public.permissions (
    code,
    name,
    description,
    module
)
values
(
    'organization.read',
    'View Organization',
    'View organization configuration and basic organization information.',
    'organization'
),
(
    'organization.update',
    'Update Organization',
    'Update organization configuration and basic organization information.',
    'organization'
),
(
    'memberships.read',
    'View Memberships',
    'View users and their organization memberships.',
    'identity'
),
(
    'memberships.manage',
    'Manage Memberships',
    'Create, update, suspend, and manage organization memberships.',
    'identity'
),
(
    'roles.read',
    'View Roles',
    'View organization roles and their assignments.',
    'authorization'
),
(
    'roles.manage',
    'Manage Roles',
    'Create, update, suspend, and manage organization roles.',
    'authorization'
),
(
    'permissions.read',
    'View Permissions',
    'View available SAKATA OS permissions.',
    'authorization'
),
(
    'audit.read',
    'View Audit Records',
    'View immutable audit records for organization activity.',
    'audit'
)
on conflict (code)
do update set
    name = excluded.name,
    description = excluded.description,
    module = excluded.module;


insert into public.role_permissions (
    role_id,
    permission_id
)
select
    r.id,
    p.id
from public.roles r
cross join public.permissions p
where r.organization_id = (
    select id
    from public.organizations
    where slug = 'sakata-operating-systems'
)
  and r.code = 'organization_admin'
  and r.scope = 'organization'
  and p.code in (
      'organization.read',
      'organization.update',
      'memberships.read',
      'memberships.manage',
      'roles.read',
      'roles.manage',
      'permissions.read',
      'audit.read'
  )
on conflict (role_id, permission_id)
do nothing;