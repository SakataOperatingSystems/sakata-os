-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — AUTOMATION
-- Migration: Retire legacy automation test rules
-- ============================================================
--
-- Retires historical verification/test rules without deleting
-- their records. Audit history remains intact.
--
-- Production automation rules are intentionally untouched.
--
-- ============================================================


update public.automation_rules
set
    enabled = false,
    updated_at = now()
where
    action_type = 'test.queue'
    or name like 'Automation Verification %';


update public.automation_jobs aj
set
    status = 'cancelled',
    completed_at = null,
    failed_at = null,
    updated_at = now()
from public.automation_rules ar
where aj.automation_rule_id = ar.id
  and ar.enabled = false
  and (
      ar.action_type = 'test.queue'
      or ar.name like 'Automation Verification %'
  )
  and aj.status = 'queued';


-- ============================================================
-- COMPLETE
-- ============================================================
