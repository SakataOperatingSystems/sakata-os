insert into public.product_definitions (
    code,
    name,
    description,
    status
)
values (
    'real_estate_os',
    'SAKATA Real Estate OS',
    'Operational management platform for property, tenancy, leasing, rent, maintenance, inspections, owners, vendors, documents, and property operations.',
    'active'
)
on conflict (code) do update
set
    name = excluded.name,
    description = excluded.description,
    status = excluded.status;
