-- SAKATA OS
-- Secure Product & Module Catalogue
-- Grants authenticated read access to global catalogue data
-- and tenant-scoped read access to organization product assignments.


-- ============================================================
-- PRODUCT DEFINITIONS
-- ============================================================

alter table public.product_definitions
    enable row level security;

drop policy if exists product_definitions_select_authenticated
on public.product_definitions;

create policy product_definitions_select_authenticated
on public.product_definitions
for select
to authenticated
using (
    status = 'active'
);


grant select
on public.product_definitions
to authenticated;


-- ============================================================
-- MODULE DEFINITIONS
-- ============================================================

alter table public.module_definitions
    enable row level security;

drop policy if exists module_definitions_select_authenticated
on public.module_definitions;

create policy module_definitions_select_authenticated
on public.module_definitions
for select
to authenticated
using (
    status = 'active'
);


grant select
on public.module_definitions
to authenticated;


-- ============================================================
-- PRODUCT MODULE ASSIGNMENTS
-- ============================================================

alter table public.product_modules
    enable row level security;

drop policy if exists product_modules_select_authenticated
on public.product_modules;

create policy product_modules_select_authenticated
on public.product_modules
for select
to authenticated
using (
    status = 'active'
);


grant select
on public.product_modules
to authenticated;


-- ============================================================
-- ORGANIZATION PRODUCT ASSIGNMENTS
-- ============================================================

alter table public.organization_products
    enable row level security;

drop policy if exists organization_products_select_member
on public.organization_products;

create policy organization_products_select_member
on public.organization_products
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);


grant select
on public.organization_products
to authenticated;