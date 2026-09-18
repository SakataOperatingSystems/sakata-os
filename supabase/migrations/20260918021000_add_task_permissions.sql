-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — TASKS
-- Migration: Task permissions
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
    'core.tasks.read',
    'View Tasks',
    'Allows viewing tenant-scoped operational tasks within the current organization.'
),
(
    'core',
    'core.tasks.manage',
    'Manage Tasks',
    'Allows creating and updating tenant-scoped operational tasks within the current organization.'
)
on conflict (code) do nothing;
