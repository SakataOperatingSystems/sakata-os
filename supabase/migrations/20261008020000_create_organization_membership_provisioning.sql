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
    v_membership_id uuid;
    v_actor_profile_id uuid;
begin
    if (auth.uid() is null) then
        raise exception 'Authentication required';
    end if;

    select up.id
      into v_actor_profile_id
      from public.user_profiles up
     where up.auth_user_id = auth.uid()
       and up.status = 'active';

    if v_actor_profile_id is null then
        raise exception 'Active user profile not found';
    end if;

    if not exists (
        select 1
          from public.organization_memberships om
          join public.membership_roles mr
            on mr.membership_id = om.id
          join public.roles r
            on r.id = mr.role_id
          join public.role_permissions rp
            on rp.role_id = r.id
          join public.permissions p
            on p.id = rp.permission_id
         where om.organization_id = p_organization_id
           and om.user_profile_id = v_actor_profile_id
           and om.status = 'active'
           and r.status = 'active'
           and p.code = 'memberships.manage'
    ) then
        raise exception 'Caller is not authorized to manage organization memberships';
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

    if not exists (
        select 1
          from public.roles r
         where r.id = p_role_id
           and r.status = 'active'
           and r.scope = 'organization'
           and r.organization_id = p_organization_id
    ) then
        raise exception 'Role is not an active role for this organization';
    end if;

    if exists (
        select 1
          from public.organization_memberships om
         where om.organization_id = p_organization_id
           and om.user_profile_id = p_user_profile_id
           and om.status = 'active'
    ) then
        raise exception 'User is already an active member of this organization';
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
    returning id into v_membership_id;

    insert into public.membership_roles (
        membership_id,
        role_id,
        is_primary
    )
    values (
        v_membership_id,
        p_role_id,
        true
    );

    return v_membership_id;
end;
$$;

revoke execute on function public.provision_organization_member(uuid, uuid, uuid) from public;
revoke execute on function public.provision_organization_member(uuid, uuid, uuid) from anon;
grant execute on function public.provision_organization_member(uuid, uuid, uuid) to authenticated;
