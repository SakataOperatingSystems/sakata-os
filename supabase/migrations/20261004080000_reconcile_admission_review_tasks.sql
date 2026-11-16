-- ============================================================
-- SAKATA OS
-- SCHOOL OS — ADMISSION REVIEW TASK RECONCILIATION
-- Migration: Cancel obsolete review tasks when an admission
--            reaches an outcome beyond active review.
--
-- F20 owns:
--   converted
--
-- F21 owns:
--   approved
--   rejected
--   withdrawn
--
-- open remains actionable.
-- ============================================================

create or replace function public.cancel_nonreview_student_admission_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.status in ('approved', 'rejected', 'withdrawn')
       and old.status is distinct from new.status then

        update public.tasks t
        set
            status = 'cancelled',
            updated_at = now()
        from public.workflow_task_links wtl
        join public.workflow_instance_transitions wit
          on wit.organization_id = wtl.organization_id
         and wit.id = wtl.workflow_instance_transition_id
        join public.workflow_transition_actions wta
          on wta.organization_id = wtl.organization_id
         and wta.id = wtl.workflow_transition_action_id
        join public.workflow_transitions wt
          on wt.organization_id = wta.organization_id
         and wt.id = wta.workflow_transition_id
        join public.workflow_instances wi
          on wi.organization_id = wit.organization_id
         and wi.id = wit.workflow_instance_id
        where t.id = wtl.task_id
          and t.organization_id = new.organization_id
          and wi.subject_type = 'student_admission_request'
          and wi.subject_id = new.id
          and wt.code = 'submit_for_review'
          and wta.action_type = 'task'
          and wta.status = 'active'
          and t.status in ('open', 'in_progress');

    end if;

    return new;
end;
$$;

revoke all on function
    public.cancel_nonreview_student_admission_tasks()
from public;

grant execute on function
    public.cancel_nonreview_student_admission_tasks()
to authenticated;

drop trigger if exists
    student_admission_outcome_cancels_review_tasks
on public.student_admission_requests;

create trigger
    student_admission_outcome_cancels_review_tasks
after update of status
on public.student_admission_requests
for each row
execute function
    public.cancel_nonreview_student_admission_tasks();

comment on function
    public.cancel_nonreview_student_admission_tasks()
is
    'Cancels active admission review workflow tasks when an admission becomes approved, rejected, or withdrawn. Preserves task history and never deletes tasks. Conversion is handled by the separate conversion boundary.';

comment on trigger
    student_admission_outcome_cancels_review_tasks
on public.student_admission_requests
is
    'Keeps admission review tasks aligned with approved, rejected, and withdrawn admission outcomes.';

-- ------------------------------------------------------------
-- RECONCILE EXISTING ADMISSIONS
-- ------------------------------------------------------------

update public.tasks t
set
    status = 'cancelled',
    updated_at = now()
from public.workflow_task_links wtl
join public.workflow_instance_transitions wit
  on wit.organization_id = wtl.organization_id
 and wit.id = wtl.workflow_instance_transition_id
join public.workflow_transition_actions wta
  on wta.organization_id = wtl.organization_id
 and wta.id = wtl.workflow_transition_action_id
join public.workflow_transitions wt
  on wt.organization_id = wta.organization_id
 and wt.id = wta.workflow_transition_id
join public.workflow_instances wi
  on wi.organization_id = wit.organization_id
 and wi.id = wit.workflow_instance_id
join public.student_admission_requests sar
  on sar.organization_id = wi.organization_id
 and sar.id = wi.subject_id
where t.id = wtl.task_id
  and t.organization_id = sar.organization_id
  and wi.subject_type = 'student_admission_request'
  and sar.status in ('approved', 'rejected', 'withdrawn')
  and wt.code = 'submit_for_review'
  and wta.action_type = 'task'
  and wta.status = 'active'
  and t.status in ('open', 'in_progress');
