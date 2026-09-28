-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — AUTOMATION
-- Migration: Schedule autonomous automation dispatcher
-- ============================================================
--
-- Registers the trusted database-side automation dispatcher
-- with Supabase/Postgres pg_cron.
--
-- Schedule:
--   Every minute
--
-- Execution:
--   dispatch_automation_jobs(10)
--
-- The dispatcher itself remains inaccessible to public and
-- authenticated application clients.
--
-- ============================================================


do $$
begin

    -- ========================================================
    -- IDEMPOTENT SCHEDULER REGISTRATION
    -- ========================================================
    --
    -- Do not create a duplicate scheduler if the named job
    -- already exists.
    -- ========================================================

    if not exists (
        select 1
        from cron.job
        where jobname = 'sakata-os-automation-dispatcher'
    ) then

        perform cron.schedule(
            'sakata-os-automation-dispatcher',
            '* * * * *',
            'select public.dispatch_automation_jobs(10);'
        );

    end if;

end;
$$;


-- ============================================================
-- COMPLETE
-- ============================================================
