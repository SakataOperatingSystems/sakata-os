-- SAKATA OS
-- Product Module Assignments
-- Defines which reusable modules belong to each SAKATA product.

create table public.product_modules (
    id uuid primary key default gen_random_uuid(),

    product_definition_id uuid not null,
    module_definition_id uuid not null,

    status text not null default 'active',

    display_order integer not null default 0,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint product_modules_product_fkey
        foreign key (product_definition_id)
        references public.product_definitions(id)
        on delete cascade,

    constraint product_modules_module_fkey
        foreign key (module_definition_id)
        references public.module_definitions(id)
        on delete restrict,

    constraint product_modules_unique
        unique (product_definition_id, module_definition_id),

    constraint product_modules_status_check
        check (status in ('active', 'suspended', 'archived')),

    constraint product_modules_display_order_check
        check (display_order >= 0)
);


create index product_modules_product_idx
    on public.product_modules (product_definition_id, display_order);


create index product_modules_module_idx
    on public.product_modules (module_definition_id);


create index product_modules_status_idx
    on public.product_modules (status);


create index product_modules_updated_idx
    on public.product_modules (updated_at desc);


create or replace function public.set_product_modules_updated_at()
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


create trigger product_modules_set_updated_at
before update
on public.product_modules
for each row
execute function public.set_product_modules_updated_at();


alter table public.product_modules
enable row level security;