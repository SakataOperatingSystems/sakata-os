create table public.membership_roles (
    id uuid primary key default gen_random_uuid(),

    membership_id uuid not null
        references public.organization_memberships(id)
        on delete cascade,

    role_id uuid not null
        references public.roles(id)
        on delete cascade,

    is_primary boolean not null default false,

    created_at timestamptz not null default now(),

    constraint membership_roles_membership_role_key
        unique (membership_id, role_id)
);

create index membership_roles_membership_id_idx
    on public.membership_roles (membership_id);

create index membership_roles_role_id_idx
    on public.membership_roles (role_id);