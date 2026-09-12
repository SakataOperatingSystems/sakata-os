-- SAKATA OS
-- SAKATA School OS Module Composition
-- Assigns reusable capabilities to the School OS product.

insert into public.product_modules (
    product_definition_id,
    module_definition_id,
    status,
    display_order
)
select
    p.id,
    m.id,
    'active',
    v.display_order
from (
    values
        ('academic_structure', 10),
        ('calendar', 20),
        ('admissions', 30),
        ('students', 40),
        ('people', 50),
        ('staff', 60),
        ('enrollments', 70),
        ('attendance', 80),
        ('assessments', 90),
        ('student_results', 100),
        ('intelligence', 110),
        ('tasks', 120),
        ('workflows', 130),
        ('approvals', 140),
        ('incidents', 150),
        ('activities', 160),
        ('documents', 170),
        ('communications', 180),
        ('requirements', 190),
        ('billing', 200),
        ('payments', 210),
        ('finance', 220),
        ('budgets', 230),
        ('financial_support', 240),
        ('suppliers', 250),
        ('procurement', 260),
        ('inventory', 270),
        ('inventory_transactions', 280),
        ('assets', 290),
        ('maintenance', 300),
        ('reporting', 310),
        ('dashboards', 320),
        ('alerts', 330),
        ('audit', 340)
) as v(code, display_order)
join public.module_definitions m
    on m.code = v.code
join public.product_definitions p
    on p.code = 'school_os'
on conflict (product_definition_id, module_definition_id)
do update set
    status = excluded.status,
    display_order = excluded.display_order;