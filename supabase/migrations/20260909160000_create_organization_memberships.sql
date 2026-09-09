create table public.organization_memberships (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null
        references public.organizations(id)
        on delete restrict,

    user_profile_id uuid not null
        references public.user_profiles(id)
        on delete cascade,

    status text not null default 'active'
        check (status in ('active', 'suspended', 'archived')),

    joined_at timestamptz not null default now(),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint organization_memberships_org_user_key
        unique (organization_id, user_profile_id)
);

create index organization_memberships_organization_id_idx
    on public.organization_memberships (organization_id);

create index organization_memberships_user_profile_id_idx
    on public.organization_memberships (user_profile_id);