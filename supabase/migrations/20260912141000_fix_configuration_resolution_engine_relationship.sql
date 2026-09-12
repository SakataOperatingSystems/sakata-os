create or replace function public.resolve_module_configuration(
    p_organization_product_module_id uuid,
    p_configuration_code text
)
returns table (
    configuration_definition_id uuid,
    module_code text,
    configuration_code text,
    value_type text,
    effective_value jsonb,
    value_source text,
    is_required boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    return query
    select
        mcd.id,
        md.code,
        mcd.code,
        mcd.value_type,
        case
            when omc.status = 'active'
             and omc.value is not null
                then omc.value
            else mcd.default_value
        end as effective_value,
        case
            when omc.status = 'active'
             and omc.value is not null
                then 'organization'
            else 'default'
        end as value_source,
        mcd.is_required
    from public.organization_product_modules opm
    join public.organization_products op
        on op.id = opm.organization_product_id
    join public.product_definitions pd
        on pd.id = op.product_definition_id
    join public.product_modules pm
        on pm.id = opm.product_module_id
       and pm.status = 'active'
    join public.module_definitions md
        on md.id = pm.module_definition_id
    join public.module_configuration_definitions mcd
        on mcd.module_definition_id = md.id
       and mcd.code = p_configuration_code
       and mcd.status = 'active'
    left join public.organization_module_configurations omc
        on omc.organization_product_module_id = opm.id
       and omc.configuration_definition_id = mcd.id
    where opm.id = p_organization_product_module_id
      and opm.status = 'active'
      and op.status = 'active'
      and pd.status = 'active'
      and md.status = 'active'
      and public.is_current_user_org_member(op.organization_id);
end;
$$;

grant execute on function public.resolve_module_configuration(uuid, text)
to authenticated;

revoke execute on function public.resolve_module_configuration(uuid, text)
from public;