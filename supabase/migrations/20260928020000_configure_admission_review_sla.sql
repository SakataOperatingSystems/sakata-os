-- ============================================================
-- SAKATA OS
-- SCHOOL OS — ADMISSION REVIEW SLA
-- Migration: Configure 24-hour deadline for admission review
-- ============================================================

-- ============================================================
-- CONFIGURE THE EXISTING ADMISSION REVIEW TASK ACTION
-- ============================================================

update public.workflow_transition_task_actions wtta
set
    due_after_minutes = 1440
where wtta.id in (
    select wtta2.id
    from public.workflow_transition_task_actions wtta2
    join public.workflow_transition_actions wta
      on wta.organization_id = wtta2.organization_id
     and wta.id = wtta2.workflow_transition_action_id
    join public.workflow_transitions wt
      on wt.organization_id = wta.organization_id
     and wt.id = wta.workflow_transition_id
    join public.workflow_definitions wd
      on wd.organization_id = wt.organization_id
     and wd.id = wt.workflow_definition_id
    where wd.code = 'student_admission'
      and wt.code = 'submit_for_review'
      and wta.action_type = 'task'
      and wta.status = 'active'
      and wtta.task_title_template = 'Review student admission'
);

-- ============================================================
-- BACKFILL EXISTING OPEN / IN-PROGRESS ADMISSION REVIEW TASKS
-- ============================================================

update public.tasks t
set due_at = wit.created_at + interval '24 hours'
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
join public.workflow_definitions wd
  on wd.organization_id = wt.organization_id
 and wd.id = wt.workflow_definition_id
where t.id = wtl.task_id
  and t.organization_id = wtl.organization_id
  and t.status in ('open', 'in_progress')
  and t.due_at is null
  and wd.code = 'student_admission'
  and wt.code = 'submit_for_review'
  and wta.action_type = 'task'
  and wta.status = 'active';

comment on column public.workflow_transition_task_actions.due_after_minutes is
'Optional relative number of minutes after action execution from which the generated task becomes due. Admission review is configured to 1440 minutes (24 hours).';
