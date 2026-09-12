create table if not exists public.organization_product_modules (
    id uuid primary key default gen_random_uuid(),
    organization_product_id uuid not null references public.organization_products(id) on delete cascade,
    product_module_id uuid not null references public.product_modules(id) on delete restrict,
    status text not null default 'active'
        check (status in ('active', 'suspended', 'archived')),
    enabled_at timestamptz not null default now(),
    disabled_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint organization_product_modules_unique
        unique (organization_product_id, product_module_id),
    constraint organization_product_modules_dates_check
        check (disabled_at is null or disabled_at >= enabled_at)
);

create index if not exists idx_organization_product_modules_org_product
    on public.organization_product_modules (organization_product_id);

create index if not exists idx_organization_product_modules_product_module
    on public.organization_product_modules (product_module_id);

create index if not exists idx_organization_product_modules_status
    on public.organization_product_modules (status);

create or replace function public.set_organization_product_modules_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_organization_product_modules_updated_at
on public.organization_product_modules;

create trigger trg_organization_product_modules_updated_at
before update on public.organization_product_modules
for each row
execute function public.set_organization_product_modules_updated_at();

alter table public.organization_product_modules enable row level security;

grant select on public.organization_product_modules to authenticated;

drop policy if exists "organization members can read organization product modules"
on public.organization_product_modules;

create policy "organization members can read organization product modules"
on public.organization_product_modules
for select
to authenticated
using (
    exists (
        select 1
        from public.organization_products op
        where op.id = organization_product_modules.organization_product_id
          and public.is_current_user_org_member(op.organization_id)
    )
);

insert into public.organization_product_modules (
    organization_product_id,
    product_module_id,
    status
)
select
    op.id,
    pm.id,
    'active'
from public.organization_products op
join public.product_modules pm
    on pm.product_definition_id = op.product_definition_id
where op.status = 'active'
  and pm.status = 'active'
on conflict (organization_product_id, product_module_id)
do nothing;
