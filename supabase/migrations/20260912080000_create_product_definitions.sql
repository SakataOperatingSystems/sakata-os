-- SAKATA OS
-- Product Definitions
-- Canonical migration for the product registry.

create table public.product_definitions (
    id uuid primary key default gen_random_uuid(),

    code text not null,
    name text not null,
    description text,

    status text not null default 'active',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint product_definitions_code_unique
        unique (code),

    constraint product_definitions_status_check
        check (status in ('active', 'suspended', 'archived')),

    constraint product_definitions_code_check
        check (
            code ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'
        ),

    constraint product_definitions_name_check
        check (length(trim(name)) > 0)
);


create index product_definitions_status_idx
    on public.product_definitions (status);


create index product_definitions_updated_idx
    on public.product_definitions (updated_at desc);


create or replace function public.set_product_definitions_updated_at()
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


create trigger product_definitions_set_updated_at
before update
on public.product_definitions
for each row
execute function public.set_product_definitions_updated_at();


alter table public.product_definitions
enable row level security;