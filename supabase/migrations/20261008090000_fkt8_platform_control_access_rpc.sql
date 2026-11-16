begin;

create or replace function public.get_current_platform_control_access()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
    select exists (
        select 1
        from public.user_profiles up
        join public.platform_role_assignments pra
          on pra.user_profile_id = up.id
        join public.roles r
          on r.id = pra.role_id
        join public.role_permissions rp
          on rp.role_id = r.id
        join public.permissions p
          on p.id = rp.permission_id
        where up.auth_user_id = auth.uid()
          and up.status = 'active'
          and r.scope = 'platform'
          and r.organization_id is null
          and r.code = 'platform_administrator'
          and r.status = 'active'
          and p.code = 'platform.control.read'
    );
$$;

revoke all on function public.get_current_platform_control_access()
    from public;

revoke all on function public.get_current_platform_control_access()
    from anon;

grant execute on function public.get_current_platform_control_access()
    to authenticated;

commit;
