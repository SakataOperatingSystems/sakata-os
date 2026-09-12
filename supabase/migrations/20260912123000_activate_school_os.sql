insert into public.organization_products (
    organization_id,
    product_definition_id,
    status
)
select
    o.id,
    pd.id,
    'active'
from public.organizations o
join public.product_definitions pd
    on pd.code = 'school_os'
where o.name = 'SAKATA Operating Systems'
on conflict (organization_id, product_definition_id)
do update
set
    status = 'active',
    deactivated_at = null;
