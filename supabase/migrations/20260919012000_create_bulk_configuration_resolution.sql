create or replace function public.resolve_organization_configurations(
    p_organization_id uuid
)
returns table (
    organization_product_id uuid,
    product_id uuid,
    product_code text,
    product_name text,
    product_description text,
    organization_product_module_id uuid,
    module_definition_id uuid,
    module_code text,
    module_name text,
    configuration_definition_id uuid,
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
    if not public.is_current_user_org_member(p_organization_id) then
        raise exception 'Current user is not a member of this organization.';
    end if;

    return query
    select
        op.id as organization_product_id,
        pd.id as product_id,
        pd.code as product_code,
        pd.name as product_name,
        pd.description as product_description,
        opm.id as organization_product_module_id,
        md.id as module_definition_id,
        md.code as module_code,
        md.name as module_name,
        mcd.id as configuration_definition_id,
        mcd.code as configuration_code,
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
    from public.organization_products op
    join public.product_definitions pd
        on pd.id = op.product_definition_id
    join public.organization_product_modules opm
        on opm.organization_product_id = op.id
       and opm.status = 'active'
    join public.product_modules pm
        on pm.id = opm.product_module_id
       and pm.status = 'active'
    join public.module_definitions md
        on md.id = pm.module_definition_id
       and md.status = 'active'
    join public.module_configuration_definitions mcd
        on mcd.module_definition_id = md.id
       and mcd.status = 'active'
    left join public.organization_module_configurations omc
        on omc.organization_product_module_id = opm.id
       and omc.configuration_definition_id = mcd.id
    where op.organization_id = p_organization_id
      and op.status = 'active'
      and pd.status = 'active'
    order by
        op.created_at,
        opm.created_at,
        mcd.code;
end;
$$;

revoke all on function public.resolve_organization_configurations(uuid)
from public;

grant execute on function public.resolve_organization_configurations(uuid)
to authenticated;
