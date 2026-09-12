create or replace function public.validate_organization_module_configuration()
returns trigger
language plpgsql
as $$
declare
    configured_module_id uuid;
    definition_module_id uuid;
begin
    select md.module_definition_id
    into configured_module_id
    from public.organization_product_modules opm
    join public.product_modules pm
        on pm.id = opm.product_module_id
    join public.module_definitions md
        on md.id = pm.module_definition_id
    where opm.id = new.organization_product_module_id;

    select mcd.module_definition_id
    into definition_module_id
    from public.module_configuration_definitions mcd
    where mcd.id = new.configuration_definition_id;

    if configured_module_id is null then
        raise exception 'Organization product module does not resolve to a valid module definition.';
    end if;

    if definition_module_id is null then
        raise exception 'Configuration definition does not resolve to a valid module definition.';
    end if;

    if configured_module_id <> definition_module_id then
        raise exception 'Configuration definition belongs to a different module.';
    end if;

    return new;
end;
$$;

drop trigger if exists trg_validate_organization_module_configuration
on public.organization_module_configurations;

create trigger trg_validate_organization_module_configuration
before insert or update
on public.organization_module_configurations
for each row
execute function public.validate_organization_module_configuration();
