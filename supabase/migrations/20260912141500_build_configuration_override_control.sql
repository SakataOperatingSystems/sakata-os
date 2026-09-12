-- SAKATA OS
-- Configuration Override Control
-- Enforces authorization, module integrity, and configuration value validation.


-- ============================================================
-- CONFIGURATION MANAGEMENT PERMISSION
-- ============================================================

insert into public.permissions (
    code,
    name,
    description,
    module
)
values (
    'organization.configuration.manage',
    'Manage Organization Configuration',
    'Allows authorized organization members to create and update organization-level configuration overrides.',
    'organization'
)
on conflict (code) do nothing;


-- ============================================================
-- PERMISSION RESOLUTION HELPER
-- ============================================================

create or replace function public.current_user_has_permission(
    p_organization_id uuid,
    p_permission_code text
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
    select exists (
        select 1
        from public.organization_memberships om
        join public.membership_roles mr
            on mr.membership_id = om.id
        join public.roles r
            on r.id = mr.role_id
        join public.role_permissions rp
            on rp.role_id = r.id
        join public.permissions p
            on p.id = rp.permission_id
        where om.organization_id = p_organization_id
          and om.status = 'active'
          and r.organization_id = p_organization_id
          and r.scope = 'organization'
          and r.status = 'active'
          and p.code = p_permission_code
          and om.user_profile_id = (
              select up.id
              from public.user_profiles up
              where up.auth_user_id = auth.uid()
                and up.status = 'active'
              limit 1
          )
    );
$$;

revoke all on function public.current_user_has_permission(uuid, text)
from public;

grant execute on function public.current_user_has_permission(uuid, text)
to authenticated;


-- ============================================================
-- VALIDATION FUNCTION
-- ============================================================

create or replace function public.validate_configuration_value(
    p_configuration_definition_id uuid,
    p_value jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_definition public.module_configuration_definitions%rowtype;
    v_min numeric;
    v_max numeric;
    v_max_length integer;
begin
    select *
    into v_definition
    from public.module_configuration_definitions
    where id = p_configuration_definition_id
      and status = 'active';

    if not found then
        raise exception 'Configuration definition is not active.';
    end if;

    if p_value is null then
        if v_definition.is_required then
            raise exception
                'Configuration "%" is required and cannot be null.',
                v_definition.code;
        end if;

        return true;
    end if;


    -- ========================================================
    -- TYPE VALIDATION
    -- ========================================================

    case v_definition.value_type

        when 'text' then
            if jsonb_typeof(p_value) <> 'string' then
                raise exception
                    'Configuration "%" requires a text value.',
                    v_definition.code;
            end if;

        when 'integer' then
            if jsonb_typeof(p_value) <> 'number'
               or (p_value::text)::numeric <> trunc((p_value::text)::numeric)
            then
                raise exception
                    'Configuration "%" requires an integer value.',
                    v_definition.code;
            end if;

        when 'decimal' then
            if jsonb_typeof(p_value) <> 'number' then
                raise exception
                    'Configuration "%" requires a numeric value.',
                    v_definition.code;
            end if;

        when 'boolean' then
            if jsonb_typeof(p_value) <> 'boolean' then
                raise exception
                    'Configuration "%" requires a boolean value.',
                    v_definition.code;
            end if;

        when 'date' then
            if jsonb_typeof(p_value) <> 'string' then
                raise exception
                    'Configuration "%" requires a date string.',
                    v_definition.code;
            end if;

            begin
                perform (p_value #>> '{}')::date;
            exception
                when others then
                    raise exception
                        'Configuration "%" contains an invalid date.',
                        v_definition.code;
            end;

        when 'datetime' then
            if jsonb_typeof(p_value) <> 'string' then
                raise exception
                    'Configuration "%" requires a datetime string.',
                    v_definition.code;
            end if;

            begin
                perform (p_value #>> '{}')::timestamptz;
            exception
                when others then
                    raise exception
                        'Configuration "%" contains an invalid datetime.',
                        v_definition.code;
            end;

        when 'select' then
            if jsonb_typeof(p_value) <> 'string' then
                raise exception
                    'Configuration "%" requires a selected option.',
                    v_definition.code;
            end if;

            if v_definition.validation_rules ? 'options' then
                if not exists (
                    select 1
                    from jsonb_array_elements_text(
                        v_definition.validation_rules -> 'options'
                    ) option_value
                    where option_value = p_value #>> '{}'
                ) then
                    raise exception
                        'Configuration "%" contains an invalid option.',
                        v_definition.code;
                end if;
            end if;

        when 'json' then
            null;

        else
            raise exception
                'Unsupported configuration value type "%".',
                v_definition.value_type;

    end case;


    -- ========================================================
    -- TEXT LENGTH VALIDATION
    -- ========================================================

    if v_definition.value_type = 'text'
       and v_definition.validation_rules ? 'max_length'
    then
        v_max_length := (
            v_definition.validation_rules ->> 'max_length'
        )::integer;

        if length(p_value #>> '{}') > v_max_length then
            raise exception
                'Configuration "%" exceeds the maximum length of %.',
                v_definition.code,
                v_max_length;
        end if;
    end if;


    -- ========================================================
    -- NUMERIC MINIMUM / MAXIMUM VALIDATION
    -- ========================================================

    if v_definition.value_type in ('integer', 'decimal') then

        if v_definition.validation_rules ? 'min' then
            v_min := (
                v_definition.validation_rules ->> 'min'
            )::numeric;

            if (p_value #>> '{}')::numeric < v_min then
                raise exception
                    'Configuration "%" cannot be less than %.',
                    v_definition.code,
                    v_min;
            end if;
        end if;

        if v_definition.validation_rules ? 'max' then
            v_max := (
                v_definition.validation_rules ->> 'max'
            )::numeric;

            if (p_value #>> '{}')::numeric > v_max then
                raise exception
                    'Configuration "%" cannot be greater than %.',
                    v_definition.code,
                    v_max;
            end if;
        end if;

    end if;

    return true;
end;
$$;

revoke all on function public.validate_configuration_value(uuid, jsonb)
from public;

grant execute on function public.validate_configuration_value(uuid, jsonb)
to authenticated;


-- ============================================================
-- ORGANIZATION CONFIGURATION WRITE VALIDATION
-- ============================================================

create or replace function public.validate_organization_module_configuration()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_organization_id uuid;
    v_module_definition_id uuid;
begin

    select
        op.organization_id,
        pm.module_definition_id
    into
        v_organization_id,
        v_module_definition_id
    from public.organization_product_modules opm
    join public.organization_products op
        on op.id = opm.organization_product_id
    join public.product_modules pm
        on pm.id = opm.product_module_id
    where opm.id = new.organization_product_module_id
      and opm.status = 'active'
      and op.status = 'active';

    if v_organization_id is null then
        raise exception
            'Organization product module is not active or does not exist.';
    end if;


    -- --------------------------------------------------------
    -- Configuration definition must belong to the same module
    -- --------------------------------------------------------

    if not exists (
        select 1
        from public.module_configuration_definitions mcd
        where mcd.id = new.configuration_definition_id
          and mcd.module_definition_id = v_module_definition_id
          and mcd.status = 'active'
    ) then
        raise exception
            'Configuration definition does not belong to the selected module.';
    end if;


    -- --------------------------------------------------------
    -- User must have configuration management permission
    -- --------------------------------------------------------

    if not public.current_user_has_permission(
        v_organization_id,
        'organization.configuration.manage'
    ) then
        raise exception
            'Forbidden: missing permission organization.configuration.manage.';
    end if;


    -- --------------------------------------------------------
    -- Validate supplied configuration value
    -- --------------------------------------------------------

    perform public.validate_configuration_value(
        new.configuration_definition_id,
        new.value
    );

    return new;
end;
$$;


drop trigger if exists validate_organization_module_configuration
on public.organization_module_configurations;

create trigger validate_organization_module_configuration
before insert or update
on public.organization_module_configurations
for each row
execute function public.validate_organization_module_configuration();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.organization_module_configurations
enable row level security;


drop policy if exists organization_module_configurations_insert_authorized
on public.organization_module_configurations;

create policy organization_module_configurations_insert_authorized
on public.organization_module_configurations
for insert
to authenticated
with check (
    public.current_user_has_permission(
        (
            select op.organization_id
            from public.organization_product_modules opm
            join public.organization_products op
                on op.id = opm.organization_product_id
            where opm.id = organization_product_module_id
        ),
        'organization.configuration.manage'
    )
);


drop policy if exists organization_module_configurations_update_authorized
on public.organization_module_configurations;

create policy organization_module_configurations_update_authorized
on public.organization_module_configurations
for update
to authenticated
using (
    public.current_user_has_permission(
        (
            select op.organization_id
            from public.organization_product_modules opm
            join public.organization_products op
                on op.id = opm.organization_product_id
            where opm.id = organization_product_module_id
        ),
        'organization.configuration.manage'
    )
)
with check (
    public.current_user_has_permission(
        (
            select op.organization_id
            from public.organization_product_modules opm
            join public.organization_products op
                on op.id = opm.organization_product_id
            where opm.id = organization_product_module_id
        ),
        'organization.configuration.manage'
    )
);


grant insert, update
on public.organization_module_configurations
to authenticated;
