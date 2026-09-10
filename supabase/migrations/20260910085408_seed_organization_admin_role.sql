insert into public.roles (
    organization_id,
    scope,
    code,
    name,
    description,
    is_system_role,
    status
)
select
    id,
    'organization',
    'organization_admin',
    'Organization Administrator',
    'Administrative role for managing an organization within SAKATA OS.',
    true,
    'active'
from public.organizations
where slug = 'sakata-operating-systems'
on conflict (organization_id, code)
do update set
    name = excluded.name,
    description = excluded.description,
    is_system_role = excluded.is_system_role,
    status = excluded.status,
    updated_at = now();


insert into public.membership_roles (
    membership_id,
    role_id
)
select
    om.id,
    r.id
from public.organization_memberships om
join public.user_profiles up
    on up.id = om.user_profile_id
join public.organizations o
    on o.id = om.organization_id
join public.roles r
    on r.organization_id = o.id
where o.slug = 'sakata-operating-systems'
  and om.status = 'active'
  and up.status = 'active'
  and r.code = 'organization_admin'
  and r.scope = 'organization'
on conflict (membership_id, role_id)
do nothing;