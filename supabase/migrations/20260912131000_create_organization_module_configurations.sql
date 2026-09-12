create table if not exists public.organization_module_configurations (
    id uuid primary key default gen_random_uuid(),

    organization_product_module_id uuid not null
        references public.organization_product_modules(id)
        on delete cascade,

    configuration_definition_id uuid not null
        references public.module_configuration_definitions(id)
        on delete restrict,

    value jsonb,

    status text not null default 'active'
        check (status in ('active', 'suspended', 'archived')),

    configured_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint organization_module_configurations_unique
        unique (
            organization_product_module_id,
            configuration_definition_id
        )
);

create index if not exists idx_org_module_configurations_product_module
    on public.organization_module_configurations (organization_product_module_id);

create index if not exists idx_org_module_configurations_definition
    on public.organization_module_configurations (configuration_definition_id);

create index if not exists idx_org_module_configurations_status
    on public.organization_module_configurations (status);

create or replace function public.set_organization_module_configurations_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_organization_module_configurations_updated_at
on public.organization_module_configurations;

create trigger trg_organization_module_configurations_updated_at
before update on public.organization_module_configurations
for each row
execute function public.set_organization_module_configurations_updated_at();

alter table public.organization_module_configurations enable row level security;

grant select on public.organization_module_configurations to authenticated;

drop policy if exists "organization members can read organization module configurations"
on public.organization_module_configurations;

create policy "organization members can read organization module configurations"
on public.organization_module_configurations
for select
to authenticated
using (
    exists (
        select 1
        from public.organization_product_modules opm
        join public.organization_products op
            on op.id = opm.organization_product_id
        where opm.id = organization_module_configurations.organization_product_module_id
          and public.is_current_user_org_member(op.organization_id)
    )
);
