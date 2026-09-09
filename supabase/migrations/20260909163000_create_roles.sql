create table public.roles (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid
        references public.organizations(id)
        on delete restrict,

    scope text not null default 'organization'
        check (scope in ('organization', 'platform')),

    code text not null,

    name text not null,

    description text,

    is_system_role boolean not null default false,

    status text not null default 'active'
        check (status in ('active', 'suspended', 'archived')),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint roles_scope_organization_check
        check (
            (scope = 'organization' and organization_id is not null)
            or
            (scope = 'platform' and organization_id is null)
        ),

    constraint roles_organization_code_key
        unique (organization_id, code)
);

create unique index roles_platform_code_key
    on public.roles (code)
    where scope = 'platform';

create index roles_organization_id_idx
    on public.roles (organization_id);

create index roles_scope_idx
    on public.roles (scope);