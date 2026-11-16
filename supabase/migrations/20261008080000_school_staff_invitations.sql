begin;

create table if not exists public.organization_staff_invitations (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    role_id uuid not null references public.roles(id) on delete restrict,
    email text not null,
    invited_by_user_profile_id uuid not null references public.user_profiles(id) on delete restrict,
    status text not null default 'pending',
    expires_at timestamptz not null default (now() + interval '7 days'),
    accepted_at timestamptz,
    accepted_user_profile_id uuid references public.user_profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint organization_staff_invitations_status_check
        check (status in ('pending', 'accepted', 'expired', 'cancelled'))
);

create index if not exists organization_staff_invitations_email_idx
    on public.organization_staff_invitations (lower(email));

create index if not exists organization_staff_invitations_org_status_idx
    on public.organization_staff_invitations (organization_id, status);

alter table public.organization_staff_invitations enable row level security;

revoke all on public.organization_staff_invitations from public;
revoke all on public.organization_staff_invitations from anon;
revoke all on public.organization_staff_invitations from authenticated;

create or replace function public.create_organization_staff_invitation(
    p_organization_id uuid,
    p_role_id uuid,
    p_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_auth_user_id uuid;
    v_caller_profile_id uuid;
    v_role_id uuid;
    v_email text;
    v_invitation_id uuid;
begin
    v_auth_user_id := auth.uid();

    if v_auth_user_id is null then
        raise exception 'Authentication required';
    end if;

    v_email := lower(trim(p_email));

    if v_email = '' then
        raise exception 'Email address is required';
    end if;

    select up.id
    into v_caller_profile_id
    from public.user_profiles up
    where up.auth_user_id = v_auth_user_id
      and up.status = 'active';

    if v_caller_profile_id is null then
        raise exception 'Active user profile required';
    end if;

    if not exists (
        select 1
        from public.organization_memberships om
        join public.membership_roles mr
          on mr.membership_id = om.id
        join public.role_permissions rp
          on rp.role_id = mr.role_id
        join public.permissions p
          on p.id = rp.permission_id
        where om.organization_id = p_organization_id
          and om.user_profile_id = v_caller_profile_id
          and om.status = 'active'
          and mr.is_primary = true
          and p.code = 'memberships.manage'
    ) then
        raise exception 'You do not have permission to invite organization staff';
    end if;

    select r.id
    into v_role_id
    from public.roles r
    where r.id = p_role_id
      and r.organization_id = p_organization_id
      and r.scope = 'organization'
      and r.status = 'active'
      and r.code in (
          'school_administrator',
          'head_teacher',
          'academic_officer',
          'bursar',
          'teacher',
          'class_teacher'
      );

    if v_role_id is null then
        raise exception 'Invalid School OS organization role';
    end if;

    if not exists (
        select 1
        from public.organizations o
        where o.id = p_organization_id
          and o.status = 'active'
    ) then
        raise exception 'Organization is not active';
    end if;

    if exists (
        select 1
        from auth.users au
        join public.user_profiles up
          on up.auth_user_id = au.id
        join public.organization_memberships om
          on om.user_profile_id = up.id
        where lower(au.email) = v_email
          and om.organization_id = p_organization_id
          and om.status = 'active'
    ) then
        raise exception 'This email already has active organization access';
    end if;

    update public.organization_staff_invitations
    set
        status = 'cancelled',
        updated_at = now()
    where organization_id = p_organization_id
      and lower(email) = v_email
      and status = 'pending';

    insert into public.organization_staff_invitations (
        organization_id,
        role_id,
        email,
        invited_by_user_profile_id
    )
    values (
        p_organization_id,
        v_role_id,
        v_email,
        v_caller_profile_id
    )
    returning id into v_invitation_id;

    return v_invitation_id;
end;
$$;

create or replace function public.accept_organization_staff_invitation()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_auth_user_id uuid;
    v_email text;
    v_profile_id uuid;
    v_invitation public.organization_staff_invitations%rowtype;
    v_membership_id uuid;
begin
    v_auth_user_id := auth.uid();

    if v_auth_user_id is null then
        raise exception 'Authentication required';
    end if;

    select
        lower(au.email)
    into v_email
    from auth.users au
    where au.id = v_auth_user_id;

    if v_email is null then
        raise exception 'Authenticated email could not be resolved';
    end if;

    select up.id
    into v_profile_id
    from public.user_profiles up
    where up.auth_user_id = v_auth_user_id
      and up.status = 'active';

    if v_profile_id is null then
        raise exception 'Active user profile required';
    end if;

    select *
    into v_invitation
    from public.organization_staff_invitations i
    where lower(i.email) = v_email
      and i.status = 'pending'
      and i.expires_at > now()
    order by i.created_at desc
    limit 1
    for update;

    if not found then
        return null;
    end if;

    if not exists (
        select 1
        from public.organizations o
        where o.id = v_invitation.organization_id
          and o.status = 'active'
    ) then
        raise exception 'Invited organization is no longer active';
    end if;

    if not exists (
        select 1
        from public.roles r
        where r.id = v_invitation.role_id
          and r.organization_id = v_invitation.organization_id
          and r.scope = 'organization'
          and r.status = 'active'
          and r.code in (
              'school_administrator',
              'head_teacher',
              'academic_officer',
              'bursar',
              'teacher',
              'class_teacher'
          )
    ) then
        raise exception 'Invited School OS role is no longer active';
    end if;

    select om.id
    into v_membership_id
    from public.organization_memberships om
    where om.organization_id = v_invitation.organization_id
      and om.user_profile_id = v_profile_id
      and om.status = 'active'
    limit 1;

    if v_membership_id is null then
        insert into public.organization_memberships (
            organization_id,
            user_profile_id,
            status
        )
        values (
            v_invitation.organization_id,
            v_profile_id,
            'active'
        )
        returning id into v_membership_id;
    end if;

    if not exists (
        select 1
        from public.membership_roles mr
        where mr.membership_id = v_membership_id
          and mr.role_id = v_invitation.role_id
    ) then
        insert into public.membership_roles (
            membership_id,
            role_id,
            is_primary
        )
        values (
            v_membership_id,
            v_invitation.role_id,
            not exists (
                select 1
                from public.membership_roles existing_primary
                where existing_primary.membership_id = v_membership_id
                  and existing_primary.is_primary = true
            )
        );
    end if;

    update public.organization_staff_invitations
    set
        status = 'accepted',
        accepted_at = now(),
        accepted_user_profile_id = v_profile_id,
        updated_at = now()
    where id = v_invitation.id;

    return v_invitation.id;
end;
$$;

revoke all on function public.create_organization_staff_invitation(uuid, uuid, text)
    from public, anon;

revoke all on function public.accept_organization_staff_invitation()
    from public, anon;

grant execute on function public.create_organization_staff_invitation(uuid, uuid, text)
    to authenticated;

grant execute on function public.accept_organization_staff_invitation()
    to authenticated;

commit;

