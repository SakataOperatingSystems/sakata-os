create or replace function public.list_provisionable_organization_users(
    p_organization_id uuid
)
returns table (
    id uuid,
    display_name text,
    phone text,
    status text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_actor_profile_id uuid;
begin
    if auth.uid() is null then
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

    return query
    select
        up.id,
        up.display_name,
        up.phone,
        up.status
    from public.user_profiles up
    where up.status = 'active'
      and not exists (
          select 1
            from public.organization_memberships om
           where om.organization_id = p_organization_id
             and om.user_profile_id = up.id
             and om.status = 'active'
      )
    order by up.display_name;
end;
$function$;

revoke execute
on function public.list_provisionable_organization_users(uuid)
from public, anon;

grant execute
on function public.list_provisionable_organization_users(uuid)
to authenticated;
