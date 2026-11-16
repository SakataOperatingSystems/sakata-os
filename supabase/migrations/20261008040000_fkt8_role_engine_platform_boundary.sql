-- FKT8 — Role Engine + Platform Boundary
--
-- Rules:
--   PLATFORM role => SAKATA internal Control Plane
--   ORGANIZATION role => customer organization/application operations
--
-- This migration deliberately does NOT:
--   * delete existing organization memberships
--   * delete Organization Administrator
--   * identify users by display name
--   * rewrite application layouts
--
-- It creates the role boundary and default School OS role catalogue.

begin;

-- -------------------------------------------------------------------------
-- PLATFORM CONTROL PERMISSION
-- -------------------------------------------------------------------------

insert into public.permissions
    (code, name, description, module)
values
    (
        'platform.control.read',
        'Read Control Plane',
        'Access the SAKATA internal Control Plane.',
        'platform'
    )
on conflict (code) do nothing;


-- -------------------------------------------------------------------------
-- PLATFORM ADMINISTRATOR
-- -------------------------------------------------------------------------

insert into public.roles
    (name, code, description, is_system_role, scope, organization_id, status)
values
    (
        'Platform Administrator',
        'platform_administrator',
        'Internal SAKATA platform operator with access to the Control Plane.',
        true,
        'platform',
        null,
        'active'
    )
on conflict do nothing;


insert into public.role_permissions
    (role_id, permission_id)
select
    r.id,
    p.id
from public.roles r
cross join public.permissions p
where r.code = 'platform_administrator'
  and r.scope = 'platform'
  and r.organization_id is null
  and p.code = 'platform.control.read'
on conflict do nothing;


-- -------------------------------------------------------------------------
-- DEFAULT SCHOOL OS ORGANIZATION ROLES
-- -------------------------------------------------------------------------

create or replace function public.ensure_school_os_roles(
    p_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if p_organization_id is null then
        raise exception 'Organization is required';
    end if;

    if not exists (
        select 1
        from public.organizations
        where id = p_organization_id
          and status = 'active'
    ) then
        raise exception 'Organization is not active';
    end if;

    insert into public.roles
        (name, code, description, is_system_role, scope, organization_id, status)
    values
        (
            'School Administrator',
            'school_administrator',
            'Full operational administration of a school organization without SAKATA platform control.',
            true,
            'organization',
            p_organization_id,
            'active'
        )
    on conflict do nothing;

    insert into public.roles
        (name, code, description, is_system_role, scope, organization_id, status)
    values
        (
            'Head Teacher',
            'head_teacher',
            'School leadership role for academic and operational oversight.',
            true,
            'organization',
            p_organization_id,
            'active'
        )
    on conflict do nothing;

    insert into public.roles
        (name, code, description, is_system_role, scope, organization_id, status)
    values
        (
            'Academic Officer',
            'academic_officer',
            'Academic structure, admissions, enrolment, student and attendance operations.',
            true,
            'organization',
            p_organization_id,
            'active'
        )
    on conflict do nothing;

    insert into public.roles
        (name, code, description, is_system_role, scope, organization_id, status)
    values
        (
            'Bursar',
            'bursar',
            'School finance and student account operations.',
            true,
            'organization',
            p_organization_id,
            'active'
        )
    on conflict do nothing;

    insert into public.roles
        (name, code, description, is_system_role, scope, organization_id, status)
    values
        (
            'Teacher',
            'teacher',
            'Teaching, class, student and attendance operations.',
            true,
            'organization',
            p_organization_id,
            'active'
        )
    on conflict do nothing;

    insert into public.roles
        (name, code, description, is_system_role, scope, organization_id, status)
    values
        (
            'Class Teacher',
            'class_teacher',
            'Class-level teaching and attendance operations.',
            true,
            'organization',
            p_organization_id,
            'active'
        )
    on conflict do nothing;
end;
$$;

revoke all on function public.ensure_school_os_roles(uuid) from public;
revoke all on function public.ensure_school_os_roles(uuid) from anon;
grant execute on function public.ensure_school_os_roles(uuid) to authenticated;


-- -------------------------------------------------------------------------
-- INSTALL DEFAULT SCHOOL ROLE CATALOGUE FOR ACTIVE ORGANIZATIONS
-- -------------------------------------------------------------------------

select public.ensure_school_os_roles(o.id)
from public.organizations o
where o.status = 'active';



commit;
