WITH targets(code) AS (
    VALUES
    ('school_os'), ('business_os'), ('retail_os'), ('finance_os'),
    ('fleet_mobility_os'), ('real_estate_os'), ('hotel_os'), ('garage_os'),
    ('parking_access_os'), ('factory_os'), ('microfinance_os'),
    ('wholesale_os'), ('hospital_os'), ('construction_os'),
    ('agriculture_os'), ('workforce_os')
)
SELECT
    p.code,
    p.name,
    p.status,
    count(pm.id) FILTER (WHERE pm.status = 'active') AS active_modules
FROM targets t
JOIN public.product_definitions p ON p.code = t.code
LEFT JOIN public.product_modules pm
    ON pm.product_definition_id = p.id
GROUP BY p.code, p.name, p.status
ORDER BY p.code;
