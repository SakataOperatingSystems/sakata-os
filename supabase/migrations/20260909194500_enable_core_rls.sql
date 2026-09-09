create or replace function public.is_current_user_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.organization_memberships om
        join public.user_profiles up
            on up.id = om.user_profile_id
        where om.organization_id = target_organization_id
          and om.status = 'active'
          and up.auth_user_id = auth.uid()
          and up.status = 'active'
    );
$$;


create or replace function public.can_current_user_access_profile(target_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.organization_memberships target_membership
        join public.organization_memberships current_membership
            on current_membership.organization_id = target_membership.organization_id
        join public.user_profiles current_profile
            on current_profile.id = current_membership.user_profile_id
        where target_membership.user_profile_id = target_profile_id
          and target_membership.status = 'active'
          and current_membership.status = 'active'
          and current_profile.auth_user_id = auth.uid()
          and current_profile.status = 'active'
    );
$$;


alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.roles enable row level security;
alter table public.membership_roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_events enable row level security;


create policy organizations_select_member
on public.organizations
for select
to authenticated
using (
    public.is_current_user_org_member(id)
);


create policy user_profiles_select_accessible
on public.user_profiles
for select
to authenticated
using (
    public.can_current_user_access_profile(id)
);


create policy organization_memberships_select_member
on public.organization_memberships
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);


create policy roles_select_org_member
on public.roles
for select
to authenticated
using (
    organization_id is not null
    and public.is_current_user_org_member(organization_id)
);


create policy membership_roles_select_org_member
on public.membership_roles
for select
to authenticated
using (
    exists (
        select 1
        from public.organization_memberships om
        where om.id = membership_roles.membership_id
          and public.is_current_user_org_member(om.organization_id)
    )
);


create policy permissions_select_authenticated
on public.permissions
for select
to authenticated
using (
    true
);


create policy role_permissions_select_org_member
on public.role_permissions
for select
to authenticated
using (
    exists (
        select 1
        from public.roles r
        where r.id = role_permissions.role_id
          and r.organization_id is not null
          and public.is_current_user_org_member(r.organization_id)
    )
);


create policy audit_events_select_org_member
on public.audit_events
for select
to authenticated
using (
    organization_id is not null
    and public.is_current_user_org_member(organization_id)
);