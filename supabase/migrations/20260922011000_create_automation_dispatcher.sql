-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — AUTOMATION
-- Migration: Autonomous automation dispatcher
-- ============================================================
--
-- Purpose:
--   Provide the trusted database-side dispatcher that can later
--   be invoked by Supabase Cron or another trusted scheduler.
--
-- Architecture:
--
--   platform event
--        |
--        v
--   automation job
--        |
--        v
--   dispatcher
--        |
--        v
--   internal executor
--        |
--        +----> completed
--        |
--        +----> failed
--
-- Concurrency:
--   FOR UPDATE SKIP LOCKED prevents concurrent dispatchers from
--   selecting the same queued job.
--
-- Security:
--   This function is an internal trusted execution boundary.
--   It is NOT executable by public/authenticated clients.
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
    -- SKIP LOCKED allows another dispatcher to work on different
    -- jobs concurrently without waiting for already claimed work.
    --
    -- The selected row remains locked while its internal executor
    -- runs inside this transaction.
    -- ========================================================

    for v_job_id in
        select aj.id
        from public.automation_jobs aj
        where aj.status = 'queued'
          and aj.available_at <= now()
        order by
            aj.available_at asc,
            aj.created_at asc,
            aj.id asc
        limit p_limit
        for update skip locked
    loop

        -- ====================================================
        -- EXECUTE ONE JOB
        -- ====================================================
        --
        -- The internal executor owns the actual automation
        -- semantics, including:
        --
        --   queued -> running
        --   action execution
        --   notification creation
        --   completed / failed
        --
        -- The dispatcher only routes eligible work to it.
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
                -- The internal executor already persists failures
                -- after claiming a job. This branch protects the
                -- dispatcher itself from aborting the entire batch
                -- if an unexpected pre-execution error occurs.
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
--
-- No direct execution by anonymous or authenticated clients.
-- The eventual trusted scheduler will invoke this function
-- through the database's trusted execution context.
-- ============================================================

revoke all on function public.dispatch_automation_jobs(integer)
from public;

revoke all on function public.dispatch_automation_jobs(integer)
from authenticated;


comment on function public.dispatch_automation_jobs(integer) is
'Trusted autonomous automation dispatcher. Selects eligible queued jobs with FOR UPDATE SKIP LOCKED and delegates execution to the internal automation executor. Not executable by public or authenticated clients.';


-- ============================================================
-- COMPLETE
-- ============================================================
