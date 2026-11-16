begin;

create or replace function public.provision_organization_member(
    p_organization_id uuid,
    p_user_profile_id uuid,
    p_role_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    caller_profile_id uuid;
    caller_membership_id uuid;
    target_role_code text;
    membership_id uuid;
begin
    select up.id
    into caller_profile_id
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.status = 'active';

    if caller_profile_id is null then
        raise exception 'Authenticated active user profile is required';
    end if;

    select om.id
    into caller_membership_id
    from public.organization_memberships om
    where om.organization_id = p_organization_id
      and om.user_profile_id = caller_profile_id
      and om.status = 'active';

    if caller_membership_id is null then
        raise exception 'Active organization membership is required';
    end if;

    if not exists (
        select 1
        from public.membership_roles mr
        join public.roles r
          on r.id = mr.role_id
        join public.role_permissions rp
          on rp.role_id = r.id
        join public.permissions p
          on p.id = rp.permission_id
        where mr.membership_id = caller_membership_id
          and mr.is_primary = true
          and r.scope = 'organization'
          and r.organization_id = p_organization_id
          and r.status = 'active'
          and p.code = 'memberships.manage'
    ) then
        raise exception 'Membership management permission is required';
    end if;

    select r.code
    into target_role_code
    from public.roles r
    where r.id = p_role_id
      and r.scope = 'organization'
      and r.organization_id = p_organization_id
      and r.status = 'active';

    if target_role_code is null then
        raise exception 'Target organization role is invalid';
    end if;

    if target_role_code = 'organization_admin'
       and not exists (
           select 1
           from public.membership_roles mr
           join public.roles r
             on r.id = mr.role_id
           where mr.membership_id = caller_membership_id
             and mr.is_primary = true
             and r.code = 'organization_admin'
             and r.scope = 'organization'
             and r.organization_id = p_organization_id
             and r.status = 'active'
       )
    then
        raise exception 'Only an Organization Administrator may assign Organization Administrator';
    end if;

    if not exists (
        select 1
        from public.organizations o
        where o.id = p_organization_id
          and o.status = 'active'
    ) then
        raise exception 'Organization is not active';
    end if;

    if not exists (
        select 1
        from public.user_profiles up
        where up.id = p_user_profile_id
          and up.status = 'active'
    ) then
        raise exception 'Target user profile is not active';
    end if;

    if exists (
        select 1
        from public.organization_memberships om
        where om.organization_id = p_organization_id
          and om.user_profile_id = p_user_profile_id
    ) then
        raise exception 'User is already a member of this organization';
    end if;

    insert into public.organization_memberships (
        organization_id,
        user_profile_id,
        status
    )
    values (
        p_organization_id,
        p_user_profile_id,
        'active'
    )
    returning id into membership_id;

    insert into public.membership_roles (
        membership_id,
        role_id,
        is_primary
    )
    values (
        membership_id,
        p_role_id,
        true
    );

    return membership_id;
end;
$$;

revoke all on function public.provision_organization_member(uuid, uuid, uuid)
from public, anon;

grant execute on function public.provision_organization_member(uuid, uuid, uuid)
to authenticated;

commit;
