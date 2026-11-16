-- Read-only live verification for the 16 curated products and their canonical identities.
with expected_products(code, name) as (
    values
        ('school_os', 'SAKATA Education OS'),
        ('business_os', 'SAKATA Business OS'),
        ('retail_os', 'SAKATA Commerce OS'),
        ('finance_os', 'SAKATA Finance OS'),
        ('fleet_mobility_os', 'SAKATA Fleet & Mobility OS'),
        ('real_estate_os', 'SAKATA Property OS'),
        ('hotel_os', 'SAKATA Hospitality OS'),
        ('garage_os', 'SAKATA Garage OS'),
        ('parking_access_os', 'SAKATA Parking & Access OS'),
        ('factory_os', 'SAKATA Manufacturing OS'),
        ('microfinance_os', 'SAKATA Microfinance OS'),
        ('wholesale_os', 'SAKATA Supply Chain OS'),
        ('hospital_os', 'SAKATA Healthcare Administration OS'),
        ('construction_os', 'SAKATA Construction OS'),
        ('agriculture_os', 'SAKATA Agriculture OS'),
        ('workforce_os', 'SAKATA Workforce OS')
), product_counts as (
    select
        expected.code,
        expected.name as expected_name,
        product.id,
        product.name as actual_name,
        product.status,
        count(assignment.id) as total_links,
        count(assignment.id) filter (
            where assignment.status = 'active' and module.status = 'active'
        ) as active_valid_links,
        count(assignment.id) filter (where assignment.status <> 'active') as inactive_links
    from expected_products expected
    left join public.product_definitions product on product.code = expected.code
    left join public.product_modules assignment on assignment.product_definition_id = product.id
    left join public.module_definitions module on module.id = assignment.module_definition_id
    group by expected.code, expected.name, product.id, product.name, product.status
)
select jsonb_build_object(
    'globalCounts', jsonb_build_object(
        'productDefinitions', (select count(*) from public.product_definitions),
        'moduleDefinitions', (select count(*) from public.module_definitions),
        'productModuleLinks', (select count(*) from public.product_modules),
        'activeProductModuleLinks', (
            select count(*) from public.product_modules where status = 'active'
        ),
        'organizationProductAssignments', (
            select count(*) from public.organization_products
        )
    ),
    'curatedProducts', (
        select coalesce(jsonb_agg(jsonb_build_object(
            'code', code,
            'expectedName', expected_name,
            'actualName', actual_name,
            'status', status,
            'totalLinks', total_links,
            'activeValidLinks', active_valid_links,
            'inactiveLinks', inactive_links
        ) order by code), '[]'::jsonb)
        from product_counts
    ),
    'missingOrConflictingProducts', (
        select coalesce(jsonb_agg(jsonb_build_object(
            'code', code,
            'expectedName', expected_name,
            'actualName', actual_name,
            'status', status
        ) order by code), '[]'::jsonb)
        from product_counts
        where id is null or actual_name <> expected_name or status <> 'active'
    ),
    'productsWithWrongActiveLinkCount', (
        select coalesce(jsonb_agg(jsonb_build_object(
            'code', code,
            'activeValidLinks', active_valid_links
        ) order by code), '[]'::jsonb)
        from product_counts
        where id is not null and active_valid_links <> 12
    ),
    'duplicateProductNames', (
        select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', count))
            , '[]'::jsonb)
        from (
            select name, count(*) as count
            from public.product_definitions
            group by name
            having count(*) > 1
        ) duplicates
    ),
    'orphanProductModuleLinks', (
        select count(*)
        from public.product_modules assignment
        left join public.product_definitions product
            on product.id = assignment.product_definition_id
        left join public.module_definitions module
            on module.id = assignment.module_definition_id
        where product.id is null or module.id is null
    ),
    'organizationAssignmentsByProductAndStatus', (
        select coalesce(jsonb_agg(jsonb_build_object(
            'productCode', product.code,
            'status', assignment.status,
            'count', assignment_count
        ) order by product.code, assignment.status), '[]'::jsonb)
        from (
            select product_definition_id, status, count(*) as assignment_count
            from public.organization_products
            group by product_definition_id, status
        ) assignment
        join public.product_definitions product
            on product.id = assignment.product_definition_id
        join expected_products expected
            on expected.code = product.code
    )
) as curated_catalogue_verification;
