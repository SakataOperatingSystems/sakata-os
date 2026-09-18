-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — WORKFLOW / STATE
-- Migration: Workflow permissions
-- ============================================================

insert into public.permissions (
    module,
    code,
    name,
    description
)
values
(
    'core',
    'core.workflows.read',
    'View Workflows',
    'Allows viewing tenant-scoped workflow definitions, states and transitions within the current organization.'
),
(
    'core',
    'core.workflows.manage',
    'Manage Workflows',
    'Allows creating and updating tenant-scoped workflow definitions, states and transitions within the current organization.'
)
on conflict (code) do nothing;
