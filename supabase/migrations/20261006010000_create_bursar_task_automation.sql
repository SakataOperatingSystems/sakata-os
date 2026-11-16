-- F27: Bursar exception -> Core Task automation
-- Created: 2026-10-07
--
-- Design:
--   fee account exception
--       -> platform event
--       -> existing automation job enqueue
--       -> existing dispatcher
--       -> task.create executor
--       -> create_task_internal()
--
-- Existing notification.in_app execution is intentionally preserved.
-- Bursar rules are system-managed and scoped to student fee account exceptions.

create or replace function public.ensure_bursar_task_automation_rules(
    p_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
    if p_organization_id is null then
        raise exception 'Organization ID is required.';
    end if;

    insert into public.automation_rules (
        organization_id,
        name,
        description,
        event_type,
        entity_type,
        action_type,
        action_config,
        enabled
    )
    select
        p_organization_id,
        'Bursar overdue fee follow-up',
        'Create a Core Task when an outstanding student fee account becomes overdue.',
        'student_fee_account.overdue',
        'student_fee_account',
        'task.create',
        jsonb_build_object(
            'exception_type', 'overdue'
        ),
        true
    where not exists (
        select 1
        from public.automation_rules ar
        where ar.organization_id = p_organization_id
          and ar.event_type = 'student_fee_account.overdue'
          and ar.entity_type = 'student_fee_account'
          and ar.action_type = 'task.create'
          and ar.action_config ->> 'exception_type' = 'overdue'
    );

    insert into public.automation_rules (
        organization_id,
        name,
        description,
        event_type,
        entity_type,
        action_type,
        action_config,
        enabled
    )
    select
        p_organization_id,
        'Bursar missing fee deadline review',
        'Create a Core Task when an outstanding student fee account has no due date.',
        'student_fee_account.no_deadline',
        'student_fee_account',
        'task.create',
        jsonb_build_object(
            'exception_type', 'no_deadline'
        ),
        true
    where not exists (
        select 1
        from public.automation_rules ar
        where ar.organization_id = p_organization_id
          and ar.event_type = 'student_fee_account.no_deadline'
          and ar.entity_type = 'student_fee_account'
          and ar.action_type = 'task.create'
          and ar.action_config ->> 'exception_type' = 'no_deadline'
    );
end;
$function$;

revoke all on function public.ensure_bursar_task_automation_rules(uuid)
from public, authenticated;


create or replace function public.execute_bursar_task_automation_job_internal(
    p_automation_job_id uuid
)
returns table (
    automation_job_id uuid,
    status text,
    notification_id uuid,
    delivery_id uuid,
    executed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    v_job public.automation_jobs%rowtype;
    v_rule public.automation_rules%rowtype;
    v_event public.platform_events%rowtype;
    v_account public.school_student_fee_accounts%rowtype;

    v_student_name text;
    v_fee_item text;
    v_fee_category text;

    v_exception text;
    v_title text;
    v_description text;
    v_due_at timestamptz;

    v_task_id uuid;
begin
    select *
    into v_job
    from public.automation_jobs
    where id = p_automation_job_id
    for update;

    if not found then
        raise exception 'Automation job not found.';
    end if;

    if v_job.status <> 'queued' or v_job.available_at > now() then
        return query
        select
            v_job.id,
            v_job.status,
            null::uuid,
            null::uuid,
            false;
        return;
    end if;

    update public.automation_jobs
    set
        status = 'running',
        attempt_count = attempt_count + 1,
        started_at = now(),
        last_error = null,
        updated_at = now()
    where id = v_job.id
      and status = 'queued';

    if not found then
        return query
        select
            v_job.id,
            'running'::text,
            null::uuid,
            null::uuid,
            false;
        return;
    end if;

    select *
    into v_rule
    from public.automation_rules
    where id = v_job.automation_rule_id
      and organization_id = v_job.organization_id
      and enabled = true;

    if not found then
        raise exception
            'Enabled automation rule for this job could not be resolved.';
    end if;

    if v_rule.action_type <> 'task.create' then
        raise exception
            'Bursar task executor received unsupported action type: %',
            v_rule.action_type;
    end if;

    select *
    into v_event
    from public.platform_events
    where id = v_job.platform_event_id
      and organization_id = v_job.organization_id;

    if not found then
        raise exception
            'Platform event for this automation job could not be resolved.';
    end if;

    if v_event.entity_type <> 'student_fee_account'
       or v_event.entity_id is null then
        raise exception
            'task.create requires a student_fee_account event.';
    end if;

    v_exception := nullif(
        trim(v_rule.action_config ->> 'exception_type'),
        ''
    );

    if v_exception not in ('overdue', 'no_deadline') then
        raise exception
            'Unsupported Bursar task exception type: %',
            v_exception;
    end if;

    select *
    into v_account
    from public.school_student_fee_accounts
    where id = v_event.entity_id
      and organization_id = v_job.organization_id;

    if not found then
        raise exception 'Bursar fee account could not be resolved.';
    end if;

    -- Re-evaluate the live account before creating work.
    if v_account.balance_amount <= 0 then
        update public.automation_jobs
        set
            status = 'completed',
            completed_at = now(),
            updated_at = now()
        where id = v_job.id;

        return query
        select
            v_job.id,
            'completed'::text,
            null::uuid,
            null::uuid,
            false;
        return;
    end if;

    if v_account.due_date is null then
        if v_exception <> 'no_deadline' then
            update public.automation_jobs
            set
                status = 'completed',
                completed_at = now(),
                updated_at = now()
            where id = v_job.id;

            return query
            select
                v_job.id,
                'completed'::text,
                null::uuid,
                null::uuid,
                false;
            return;
        end if;

        v_title := 'Fee deadline review';
        v_due_at := null;

    elsif v_account.due_date < current_date then
        if v_exception <> 'overdue' then
            update public.automation_jobs
            set
                status = 'completed',
                completed_at = now(),
                updated_at = now()
            where id = v_job.id;

            return query
            select
                v_job.id,
                'completed'::text,
                null::uuid,
                null::uuid,
                false;
            return;
        end if;

        v_title := 'Fee follow-up';

        v_due_at :=
            (
                v_account.due_date::timestamp
                at time zone 'UTC'
            )
            + interval '23 hours 59 minutes 59.999 seconds';

    else
        update public.automation_jobs
        set
            status = 'completed',
            completed_at = now(),
            updated_at = now()
        where id = v_job.id;

        return query
        select
            v_job.id,
            'completed'::text,
            null::uuid,
            null::uuid,
            false;
        return;
    end if;

    -- Serialize task creation per fee account.
    perform pg_advisory_xact_lock(
        hashtext(v_account.id::text)
    );

    select
        coalesce(s.full_name, 'Unknown student'),
        coalesce(fs.fee_item, 'Fee item'),
        coalesce(fs.fee_category, 'School Fees')
    into
        v_student_name,
        v_fee_item,
        v_fee_category
    from public.school_student_fee_accounts a
    left join public.students s
      on s.id = a.student_id
     and s.organization_id = a.organization_id
    left join public.school_fee_structures fs
      on fs.id = a.fee_structure_id
     and fs.organization_id = a.organization_id
    where a.id = v_account.id;

    v_description := concat(
        'Bursar operational follow-up required.',
        E'\nStudent: ', v_student_name,
        E'\nFee item: ', v_fee_item,
        E'\nFee category: ', v_fee_category,
        E'\nOutstanding balance: UGX ',
            v_account.balance_amount::text,
        E'\nException: ',
            case
                when v_exception = 'overdue'
                    then 'Overdue'
                else 'Deadline missing'
            end,
        E'\nNext action: ',
            case
                when v_exception = 'overdue'
                    then 'Follow up outstanding balance'
                else 'Set or review due date'
            end,
        E'\nFee account ID: ', v_account.id::text,
        E'\nOriginal due date: ',
            coalesce(v_account.due_date::text, 'Not set')
    );

    -- Idempotency: never create a second active task for the same
    -- account and exception type.
    if exists (
        select 1
        from public.tasks t
        where t.organization_id = v_job.organization_id
          and t.status not in ('completed', 'cancelled')
          and t.description like
              '%' || ('Fee account ID: ' || v_account.id::text) || '%'
          and (
                (
                    v_exception = 'overdue'
                    and t.title like 'Fee follow-up%'
                )
                or
                (
                    v_exception = 'no_deadline'
                    and t.title like 'Fee deadline review%'
                )
          )
    ) then
        update public.automation_jobs
        set
            status = 'completed',
            completed_at = now(),
            updated_at = now()
        where id = v_job.id;

        return query
        select
            v_job.id,
            'completed'::text,
            null::uuid,
            null::uuid,
            false;
        return;
    end if;

    v_task_id := public.create_task_internal(
        v_job.organization_id,
        v_title || ' — ' || v_student_name || ' — ' || v_fee_item,
        v_description,
        'normal',
        null,
        v_due_at
    );

    update public.automation_jobs
    set
        status = 'completed',
        completed_at = now(),
        updated_at = now()
    where id = v_job.id;

    return query
    select
        v_job.id,
        'completed'::text,
        null::uuid,
        null::uuid,
        true;

exception
    when others then
        update public.automation_jobs
        set
            status = 'failed',
            failed_at = now(),
            completed_at = null,
            last_error = left(sqlerrm, 2000),
            updated_at = now()
        where id = p_automation_job_id;

        return query
        select
            p_automation_job_id,
            'failed'::text,
            null::uuid,
            null::uuid,
            false;
end;
$function$;

revoke all on function public.execute_bursar_task_automation_job_internal(uuid)
from public, authenticated;


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
as $function$
declare
    v_job_id uuid;
    v_result record;

    v_processed_count integer := 0;
    v_completed_count integer := 0;
    v_failed_count integer := 0;
    v_skipped_count integer := 0;

    v_error_message text;
    v_action_type text;
begin
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

    for v_job_id in
        select aj.id
        from public.automation_jobs aj
        join public.automation_rules ar
          on ar.id = aj.automation_rule_id
         and ar.organization_id = aj.organization_id
        where aj.status = 'queued'
          and aj.available_at <= now()
          and ar.enabled = true
          and ar.action_type in (
              'notification.in_app',
              'task.create'
          )
        order by
            aj.available_at asc,
            aj.created_at asc,
            aj.id asc
        limit p_limit
        for update of aj skip locked
    loop
        begin
            select ar.action_type
            into v_action_type
            from public.automation_jobs aj
            join public.automation_rules ar
              on ar.id = aj.automation_rule_id
             and ar.organization_id = aj.organization_id
            where aj.id = v_job_id;

            if v_action_type = 'task.create' then
                select *
                into v_result
                from public.execute_bursar_task_automation_job_internal(
                    v_job_id
                );
            else
                select *
                into v_result
                from public.execute_automation_job_internal(
                    v_job_id
                );
            end if;

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
                v_error_message := left(sqlerrm, 2000);

                update public.automation_jobs
                set
                    status = 'failed',
                    failed_at = now(),
                    completed_at = null,
                    last_error = v_error_message,
                    updated_at = now()
                where id = v_job_id
                  and status = 'queued';

                v_processed_count := v_processed_count + 1;
                v_failed_count := v_failed_count + 1;
        end;
    end loop;

    return query
    select
        v_processed_count,
        v_completed_count,
        v_failed_count,
        v_skipped_count;
end;
$function$;


create or replace function public.emit_bursar_fee_account_exception_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    v_old_exception text;
    v_new_exception text;
    v_event_type text;
begin
    -- Do not make seed/service-role writes depend on an authenticated
    -- actor. Normal staff mutations retain the existing event path.
    if auth.uid() is null then
        return new;
    end if;

    if tg_op = 'UPDATE' then
        if old.balance_amount > 0 and old.due_date is null then
            v_old_exception := 'no_deadline';
        elsif old.balance_amount > 0
              and old.due_date < current_date then
            v_old_exception := 'overdue';
        end if;
    end if;

    if new.balance_amount > 0 and new.due_date is null then
        v_new_exception := 'no_deadline';
    elsif new.balance_amount > 0
          and new.due_date < current_date then
        v_new_exception := 'overdue';
    end if;

    if v_new_exception is null
       or v_new_exception = v_old_exception then
        return new;
    end if;

    v_event_type := 'student_fee_account.' || v_new_exception;

    perform public.ensure_bursar_task_automation_rules(
        new.organization_id
    );

    -- The platform event key is unique per organization/event/entity.
    -- Avoid raising an account-write error when this exception has
    -- already emitted an event.
    if not exists (
        select 1
        from public.platform_events pe
        where pe.organization_id = new.organization_id
          and pe.event_type = v_event_type
          and pe.entity_type = 'student_fee_account'
          and pe.entity_id = new.id
    ) then
        perform public.emit_platform_event(
            p_organization_id => new.organization_id,
            p_event_type => v_event_type,
            p_entity_type => 'student_fee_account',
            p_entity_id => new.id,
            p_occurred_at => now(),
            p_payload => jsonb_build_object(
                'exception', v_new_exception,
                'balance_amount', new.balance_amount,
                'due_date', new.due_date,
                'status', new.status
            )
        );
    end if;

    return new;
end;
$function$;

revoke all on function public.emit_bursar_fee_account_exception_event()
from public, authenticated;


drop trigger if exists bursar_fee_account_exception_event
on public.school_student_fee_accounts;

create trigger bursar_fee_account_exception_event
after insert or update
on public.school_student_fee_accounts
for each row
execute function public.emit_bursar_fee_account_exception_event();


comment on function public.execute_bursar_task_automation_job_internal(uuid)
is 'Internal F27 executor for Bursar fee exception task creation.';

comment on function public.emit_bursar_fee_account_exception_event()
is 'Emits tenant-scoped platform events when an outstanding fee account enters a Bursar exception state.';
