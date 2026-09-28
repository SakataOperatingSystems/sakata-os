-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — AUTOMATION
-- Migration: Harden autonomous dispatcher eligibility
-- ============================================================
--
-- Purpose:
--   Prevent the autonomous dispatcher from consuming queued
--   automation jobs whose action type is not yet supported by
--   the current internal executor.
--
-- Current supported autonomous action:
--   notification.in_app
--
-- Unsupported queued jobs remain queued for a future executor.
--
-- ============================================================


create or replace function public.dispatch_automation_jobs(
    p_limit integer default 10
)
returns table (
    processed_count integer,
    completed_count integer,
    failed_count integer,
    skipped_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_job_id uuid;
    v_result record;

    v_processed_count integer := 0;
    v_completed_count integer := 0;
    v_failed_count integer := 0;
    v_skipped_count integer := 0;

    v_error_message text;
begin

    -- ========================================================
    -- INPUT VALIDATION
    -- ========================================================

    if p_limit is null then
        p_limit := 10;
    end if;

    if p_limit < 1 then
        raise exception
            'Dispatcher limit must be at least 1.';
    end if;

    if p_limit > 100 then
        raise exception
            'Dispatcher limit cannot exceed 100.';
    end if;


    -- ========================================================
    -- SELECT ELIGIBLE QUEUED JOBS
    -- ========================================================
    --
    -- Only jobs whose enabled rule currently maps to a supported
    -- executor action are eligible.
    --
    -- Historical or future unsupported action types remain queued.
    --
    -- FOR UPDATE SKIP LOCKED allows multiple trusted dispatchers
    -- to work concurrently without selecting the same job.
    -- ========================================================

    for v_job_id in
        select aj.id
        from public.automation_jobs aj
        join public.automation_rules ar
          on ar.id = aj.automation_rule_id
         and ar.organization_id = aj.organization_id
        where aj.status = 'queued'
          and aj.available_at <= now()
          and ar.enabled = true
          and ar.action_type = 'notification.in_app'
        order by
            aj.available_at asc,
            aj.created_at asc,
            aj.id asc
        limit p_limit
        for update of aj skip locked
    loop

        -- ====================================================
        -- EXECUTE ONE ELIGIBLE JOB
        -- ====================================================

        begin

            select *
            into v_result
            from public.execute_automation_job_internal(
                v_job_id
            );

            v_processed_count := v_processed_count + 1;

            if v_result.status = 'completed' then

                v_completed_count := v_completed_count + 1;

            elsif v_result.status = 'failed' then

                v_failed_count := v_failed_count + 1;

            else

                v_skipped_count := v_skipped_count + 1;

            end if;


        exception
            when others then

                -- =================================================
                -- DISPATCHER-LEVEL FAILURE
                -- =================================================
                --
                -- If an unexpected error occurs before the internal
                -- executor persists its own failure state, record
                -- the failure here without aborting the batch.
                -- =================================================

                v_error_message := left(sqlerrm, 2000);

                update public.automation_jobs
                set
                    status = 'failed',
                    failed_at = now(),
                    completed_at = null,
                    last_error = v_error_message,
                    updated_at = now()
                where public.automation_jobs.id = v_job_id
                  and public.automation_jobs.status = 'queued';

                v_processed_count := v_processed_count + 1;
                v_failed_count := v_failed_count + 1;

        end;

    end loop;


    -- ========================================================
    -- RETURN BATCH RESULT
    -- ========================================================

    return query
    select
        v_processed_count,
        v_completed_count,
        v_failed_count,
        v_skipped_count;

end;
$$;


-- ============================================================
-- SECURITY BOUNDARY
-- ============================================================

revoke all on function public.dispatch_automation_jobs(integer)
from public;

revoke all on function public.dispatch_automation_jobs(integer)
from authenticated;


comment on function public.dispatch_automation_jobs(integer) is
'Trusted autonomous automation dispatcher. Selects only eligible queued jobs whose enabled automation rule uses a currently supported action type, using FOR UPDATE SKIP LOCKED. Not executable by public or authenticated clients.';


-- ============================================================
-- COMPLETE
-- ============================================================
