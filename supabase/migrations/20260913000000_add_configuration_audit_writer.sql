create or replace function public.audit_configuration_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_organization_id uuid;
    v_actor_user_id uuid;
begin
    select op.organization_id
    into v_organization_id
    from public.organization_product_modules opm
    join public.organization_products op
        on op.id = opm.organization_product_id
    where opm.id = new.organization_product_module_id;

    select up.id
    into v_actor_user_id
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.status = 'active';

    insert into public.audit_events (
        organization_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        previous_data,
        new_data,
        metadata
    )
    values (
        v_organization_id,
        v_actor_user_id,
        case
            when tg_op = 'INSERT'
                then 'configuration.override.created'
            else 'configuration.override.updated'
        end,
        'organization_module_configuration',
        new.id,
        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'value', old.value,
                'status', old.status,
                'configured_at', old.configured_at
            )
        end,
        jsonb_build_object(
            'value', new.value,
            'status', new.status,
            'configured_at', new.configured_at
        ),
        jsonb_build_object(
            'configuration_definition_id',
            new.configuration_definition_id,
            'organization_product_module_id',
            new.organization_product_module_id
        )
    );

    return new;
end;
$$;

revoke execute on function public.audit_configuration_change() from public;

drop trigger if exists audit_configuration_change
on public.organization_module_configurations;

create trigger audit_configuration_change
after insert or update
on public.organization_module_configurations
for each row
execute function public.audit_configuration_change();