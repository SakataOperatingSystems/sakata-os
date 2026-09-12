-- SAKATA OS
-- Organization Product Assignments
-- Connects organizations to the SAKATA products they operate.

create table public.organization_products (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,
    product_definition_id uuid not null,

    status text not null default 'active',

    activated_at timestamptz not null default now(),
    deactivated_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint organization_products_organization_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint organization_products_product_fkey
        foreign key (product_definition_id)
        references public.product_definitions(id)
        on delete restrict,

    constraint organization_products_unique
        unique (organization_id, product_definition_id),

    constraint organization_products_status_check
        check (status in ('active', 'suspended', 'archived')),

    constraint organization_products_dates_check
        check (
            deactivated_at is null
            or deactivated_at >= activated_at
        )
);


create index organization_products_organization_idx
    on public.organization_products (organization_id);


create index organization_products_product_idx
    on public.organization_products (product_definition_id);


create index organization_products_status_idx
    on public.organization_products (status);


create index organization_products_updated_idx
    on public.organization_products (updated_at desc);


create or replace function public.set_organization_products_updated_at()
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


create trigger organization_products_set_updated_at
before update
on public.organization_products
for each row
execute function public.set_organization_products_updated_at();


alter table public.organization_products
enable row level security;