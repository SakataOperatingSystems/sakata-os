-- SAKATA OS
-- Academic Structure: Education Levels and Class Levels
-- Tenant-configurable academic hierarchy for School OS.

create table public.education_levels (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null
        references public.organizations(id) on delete cascade,

    code text not null,
    name text not null,
    display_order integer not null default 0,
    status text not null default 'active',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint education_levels_code_check
        check (code ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'),

    constraint education_levels_name_check
        check (length(trim(name)) > 0),

    constraint education_levels_display_order_check
        check (display_order >= 0),

    constraint education_levels_status_check
        check (status in ('active', 'inactive', 'archived')),

    constraint education_levels_org_code_unique
        unique (organization_id, code),

    constraint education_levels_org_name_unique
        unique (organization_id, name),

    constraint education_levels_org_id_unique
        unique (organization_id, id)
);

create index education_levels_org_status_idx
    on public.education_levels (organization_id, status);

create index education_levels_org_order_idx
    on public.education_levels (organization_id, display_order);


create table public.class_levels (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    education_level_id uuid not null,

    code text not null,
    name text not null,
    display_order integer not null default 0,
    status text not null default 'active',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint class_levels_education_level_fk
        foreign key (organization_id, education_level_id)
        references public.education_levels (organization_id, id)
        on delete cascade,

    constraint class_levels_code_check
        check (code ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'),

    constraint class_levels_name_check
        check (length(trim(name)) > 0),

    constraint class_levels_display_order_check
        check (display_order >= 0),

    constraint class_levels_status_check
        check (status in ('active', 'inactive', 'archived')),

    constraint class_levels_org_code_unique
        unique (organization_id, code),

    constraint class_levels_org_name_unique
        unique (organization_id, name),

    constraint class_levels_org_id_unique
        unique (organization_id, id)
);

create index class_levels_org_status_idx
    on public.class_levels (organization_id, status);

create index class_levels_education_level_idx
    on public.class_levels (organization_id, education_level_id);

create index class_levels_org_order_idx
    on public.class_levels (organization_id, display_order);


create or replace function public.set_education_levels_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger education_levels_set_updated_at
before update
on public.education_levels
for each row
execute function public.set_education_levels_updated_at();


create or replace function public.set_class_levels_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger class_levels_set_updated_at
before update
on public.class_levels
for each row
execute function public.set_class_levels_updated_at();


alter table public.education_levels
enable row level security;

alter table public.class_levels
enable row level security;


grant select on public.education_levels to authenticated;
grant select on public.class_levels to authenticated;

create policy "organization members can read education levels"
on public.education_levels
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

create policy "organization members can read class levels"
on public.class_levels
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);