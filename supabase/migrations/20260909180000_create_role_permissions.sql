create table public.role_permissions (
    role_id uuid not null,
    permission_id uuid not null,
    created_at timestamptz not null default now(),

    constraint role_permissions_pkey
        primary key (role_id, permission_id),

    constraint role_permissions_role_id_fkey
        foreign key (role_id)
        references public.roles(id)
        on delete cascade,

    constraint role_permissions_permission_id_fkey
        foreign key (permission_id)
        references public.permissions(id)
        on delete cascade
);

create index role_permissions_permission_id_idx
    on public.role_permissions (permission_id);