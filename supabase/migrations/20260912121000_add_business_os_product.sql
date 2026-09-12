insert into public.product_definitions (
    code,
    name,
    description,
    status
)
values (
    'business_os',
    'SAKATA Business OS',
    'Horizontal business operations platform for organizations, departments, teams, customers, suppliers, sales, purchasing, finance, expenses, assets, projects, documents, workflows, approvals, reporting, and management operations.',
    'active'
)
on conflict (code) do update
set
    name = excluded.name,
    description = excluded.description,
    status = excluded.status;
