-- FKT8.23 — Dedicated Platform Authority
--
-- Platform roles are SAKATA-internal authority.
-- They are deliberately NOT assigned through organization_memberships
-- or membership_roles.

begin;

create table if not exists public.platform_role_assignments (
    id uuid primary key default gen_random_uuid(),
    user_profile_id uuid not null
        references public.user_profiles(id) on delete cascade,
    role_id uuid not null
        references public.roles(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (user_profile_id, role_id)
);

alter table public.platform_role_assignments enable row level security;

revoke all on public.platform_role_assignments from public;
revoke all on public.platform_role_assignments from anon;
revoke all on public.platform_role_assignments from authenticated;

create policy platform_role_assignments_self_read
on public.platform_role_assignments
for select
to authenticated
using (
    exists (
        select 1
        from public.user_profiles up
        where up.id = platform_role_assignments.user_profile_id
          and up.auth_user_id = auth.uid()
          and up.status = 'active'
    )
);

insert into public.platform_role_assignments
    (user_profile_id, role_id)
select
    up.id,
    r.id
from auth.users au
join public.user_profiles up
    on up.auth_user_id = au.id
join public.roles r
    on r.code = 'platform_administrator'
   and r.scope = 'platform'
   and r.organization_id is null
   and r.status = 'active'
where lower(au.email) = lower('sakataoperatingsystems@gmail.com')
  and up.status = 'active'
on conflict (user_profile_id, role_id) do nothing;

commit;