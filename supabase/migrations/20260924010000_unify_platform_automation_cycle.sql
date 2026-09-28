-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — AUTOMATION
-- Migration: Unified autonomous platform automation cycle
-- ============================================================
--
-- One trusted scheduler boundary for the current automation
-- runtime:
--
--   pg_cron
--      ↓
--   run_platform_automation_cycle()
--      ↓
--   automation jobs
--      ↓
--   notification deliveries
--
-- Existing queue processors remain independently reusable.
-- This migration only creates the orchestration boundary and
-- updates the existing named cron job to use it.
--
-- ============================================================


create or replace function public.run_platform_automation_cycle()
returns table (
    automation_processed_count integer,
    automation_completed_count integer,
    automation_failed_count integer,
    automation_skipped_count integer,
    delivery_processed_count integer,
    delivery_delivered_count integer,
    delivery_failed_count integer,
    delivery_skipped_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_automation record;
    v_delivery record;
begin

    select *
    into v_automation
    from public.dispatch_automation_jobs(10);

    select *
    into v_delivery
    from public.dispatch_notification_deliveries(25);

    return query
    select
        v_automation.processed_count,
        v_automation.completed_count,
        v_automation.failed_count,
        v_automation.skipped_count,
        v_delivery.processed_count,
        v_delivery.delivered_count,
        v_delivery.failed_count,
        v_delivery.skipped_count;

end;
$$;


revoke all on function public.run_platform_automation_cycle()
from public;

revoke all on function public.run_platform_automation_cycle()
from authenticated;


comment on function public.run_platform_automation_cycle() is
'Trusted internal orchestration boundary for the autonomous SAKATA OS platform automation cycle. Runs the existing automation job dispatcher followed by the in-app notification delivery processor.';


do $$
begin

    if exists (
        select 1
        from cron.job
        where jobname = 'sakata-os-automation-dispatcher'
    ) then

        perform cron.unschedule(
            'sakata-os-automation-dispatcher'
        );

    end if;


    perform cron.schedule(
        'sakata-os-automation-dispatcher',
        '* * * * *',
        'select public.run_platform_automation_cycle();'
    );

end;
$$;


-- ============================================================
-- COMPLETE
-- ============================================================
