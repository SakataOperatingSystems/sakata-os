-- SAKATA OS
-- Module Definitions
-- Reusable operational capability registry for SAKATA products.

create table public.module_definitions (
    id uuid primary key default gen_random_uuid(),

    code text not null,
    name text not null,
    description text,
    category text,

    status text not null default 'active',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint module_definitions_code_unique
        unique (code),

    constraint module_definitions_code_check
        check (
            code ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'
        ),

    constraint module_definitions_name_check
        check (length(trim(name)) > 0),

    constraint module_definitions_status_check
        check (status in ('active', 'suspended', 'archived')),

    constraint module_definitions_category_check
        check (
            category is null
            or length(trim(category)) > 0
        )
);


create index module_definitions_status_idx
    on public.module_definitions (status);


create index module_definitions_category_idx
    on public.module_definitions (category);


create index module_definitions_updated_idx
    on public.module_definitions (updated_at desc);


create or replace function public.set_module_definitions_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


create trigger module_definitions_set_updated_at
before update
on public.module_definitions
for each row
execute function public.set_module_definitions_updated_at();


alter table public.module_definitions
enable row level security;