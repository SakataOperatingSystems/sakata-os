begin;

create or replace function public.deploy_product_to_organization(
    p_organization_id uuid,
    p_product_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_actor_auth_id uuid;
    v_actor_profile_id uuid;
    v_product_id uuid;
    v_product_name text;
    v_organization_product_id uuid;
    v_existing_status text;
    v_module_count integer;
    v_inserted_module_count integer;
begin
    v_actor_auth_id := auth.uid();

    if v_actor_auth_id is null then
        raise exception 'Authentication required';
    end if;

    if not coalesce(
        public.get_current_platform_control_access(),
        false
    ) then
        raise exception 'Platform control access required';
    end if;

    if p_organization_id is null then
        raise exception 'Organization ID is required';
    end if;

    if p_product_code is null
       or length(trim(p_product_code)) = 0 then
        raise exception 'Product code is required';
    end if;

    select up.id
      into v_actor_profile_id
    from public.user_profiles up
    where up.auth_user_id = v_actor_auth_id
      and up.status = 'active';

    if v_actor_profile_id is null then
        raise exception 'Active user profile not found';
    end if;

    perform 1
    from public.organizations o
    where o.id = p_organization_id
    for update;

    if not found then
        raise exception 'Organization not found';
    end if;

    select pd.id, pd.name
      into v_product_id, v_product_name
    from public.product_definitions pd
    where pd.code = trim(p_product_code)
      and pd.status = 'active'
    for share;

    if v_product_id is null then
        raise exception 'Active product definition not found';
    end if;

    select count(*)::integer
      into v_module_count
    from public.product_modules pm
    join public.module_definitions md
      on md.id = pm.module_definition_id
    where pm.product_definition_id = v_product_id
      and pm.status = 'active'
      and md.status = 'active';

    if v_module_count = 0 then
        raise exception 'Product has no active modules available for deployment';
    end if;

    select op.id, op.status
      into v_organization_product_id, v_existing_status
    from public.organization_products op
    where op.organization_id = p_organization_id
      and op.product_definition_id = v_product_id
    for update;

    if v_organization_product_id is not null then
        if v_existing_status <> 'active' then
            raise exception
                'Product already has a non-active assignment; review its status before deploying again';
        end if;

        select count(*)::integer
          into v_inserted_module_count
        from public.organization_product_modules opm
        join public.product_modules pm
          on pm.id = opm.product_module_id
        join public.module_definitions md
          on md.id = pm.module_definition_id
        where opm.organization_product_id = v_organization_product_id
          and opm.status = 'active'
          and pm.status = 'active'
          and md.status = 'active';

        return jsonb_build_object(
            'success', true,
            'already_deployed', true,
            'organization_product_id', v_organization_product_id,
            'product_code', trim(p_product_code),
            'product_name', v_product_name,
            'active_module_count', v_inserted_module_count
        );
    end if;

    insert into public.organization_products (
        organization_id,
        product_definition_id,
        status
    )
    values (
        p_organization_id,
        v_product_id,
        'active'
    )
    returning id into v_organization_product_id;

    insert into public.organization_product_modules (
        organization_product_id,
        product_module_id,
        status
    )
    select
        v_organization_product_id,
        pm.id,
        'active'
    from public.product_modules pm
    join public.module_definitions md
      on md.id = pm.module_definition_id
    where pm.product_definition_id = v_product_id
      and pm.status = 'active'
      and md.status = 'active'
    on conflict (organization_product_id, product_module_id)
    do nothing;

    get diagnostics v_inserted_module_count = row_count;

    if v_inserted_module_count <> v_module_count then
        raise exception
            'Module assignment count mismatch; deployment rolled back';
    end if;

    insert into public.audit_events (
        organization_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        previous_data,
        new_data,
        reason,
        metadata
    )
    values (
        p_organization_id,
        v_actor_profile_id,
        'organization.product.deployed',
        'organization_product',
        v_organization_product_id,
        null,
        jsonb_build_object(
            'status', 'active',
            'product_definition_id', v_product_id,
            'product_code', trim(p_product_code),
            'product_name', v_product_name,
            'active_module_count', v_inserted_module_count
        ),
        'Platform-authorized product deployment',
        jsonb_build_object(
            'deployment_method', 'deploy_product_to_organization',
            'actor_auth_user_id', v_actor_auth_id
        )
    );

    return jsonb_build_object(
        'success', true,
        'already_deployed', false,
        'organization_product_id', v_organization_product_id,
        'product_code', trim(p_product_code),
        'product_name', v_product_name,
        'active_module_count', v_inserted_module_count
    );
end;
$$;

revoke all on function public.deploy_product_to_organization(uuid, text)
    from public;

revoke all on function public.deploy_product_to_organization(uuid, text)
    from anon;

grant execute on function public.deploy_product_to_organization(uuid, text)
    to authenticated;

commit;
