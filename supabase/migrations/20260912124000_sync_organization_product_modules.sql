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
  and not exists (
      select 1
      from public.organization_product_modules existing
      where existing.organization_product_id = op.id
        and existing.product_module_id = pm.id
  );
