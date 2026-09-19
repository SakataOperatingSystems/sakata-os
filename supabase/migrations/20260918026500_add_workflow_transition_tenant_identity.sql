-- SAKATA OS
-- Migration: add tenant-safe identity constraint for workflow transitions
-- Purpose: support composite foreign keys from workflow runtime tables.

alter table public.workflow_transitions
  add constraint workflow_transitions_organization_id_id_key
  unique (organization_id, id);

comment on constraint workflow_transitions_organization_id_id_key
  on public.workflow_transitions
  is 'Tenant-safe unique identity for composite foreign keys.';
