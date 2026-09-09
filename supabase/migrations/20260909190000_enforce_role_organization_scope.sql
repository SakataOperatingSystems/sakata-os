create or replace function public.enforce_membership_role_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    membership_org_id uuid;
    role_org_id uuid;
    role_scope text;
begin
    select organization_id
    into membership_org_id
    from public.organization_memberships
    where id = new.membership_id;

    select organization_id, scope
    into role_org_id, role_scope
    from public.roles
    where id = new.role_id;

    if membership_org_id is null then
        raise exception 'Cannot assign role: organization membership does not exist';
    end if;

    if role_scope is null then
        raise exception 'Cannot assign role: role does not exist';
    end if;

    if role_scope = 'platform' then
        raise exception 'Platform roles cannot be assigned through membership_roles';
    end if;

    if role_scope = 'organization'
       and role_org_id <> membership_org_id then
        raise exception 'Organization role must belong to the same organization as the membership';
    end if;

    return new;
end;
$$;

create trigger membership_roles_enforce_scope
before insert or update of membership_id, role_id
on public.membership_roles
for each row
execute function public.enforce_membership_role_scope();


create or replace function public.prevent_role_scope_change_with_assignments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if old.scope <> new.scope
       or old.organization_id is distinct from new.organization_id then

        if exists (
            select 1
            from public.membership_roles mr
            where mr.role_id = old.id
        ) then
            raise exception 'Role scope or organization cannot change while the role has assignments';
        end if;

    end if;

    return new;
end;
$$;

create trigger roles_prevent_scope_change_with_assignments
before update of scope, organization_id
on public.roles
for each row
execute function public.prevent_role_scope_change_with_assignments();


create or replace function public.prevent_membership_organization_change_with_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if old.organization_id is distinct from new.organization_id then

        if exists (
            select 1
            from public.membership_roles mr
            where mr.membership_id = old.id
        ) then
            raise exception 'Membership organization cannot change while the membership has role assignments';
        end if;

    end if;

    return new;
end;
$$;

create trigger organization_memberships_prevent_org_change_with_roles
before update of organization_id
on public.organization_memberships
for each row
execute function public.prevent_membership_organization_change_with_roles();