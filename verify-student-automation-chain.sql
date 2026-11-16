select
  s.student_id,
  s.full_name,
  e.id as event_id,
  e.event_type,
  e.entity_type,
  e.occurred_at,
  ar.name as automation_rule,
  ar.action_type,
  aj.id as automation_job_id,
  aj.status as job_status,
  aj.attempt_count,
  aj.created_at as job_created_at
from public.students s
left join public.platform_events e
  on e.entity_id = s.id
 and e.event_type = 'student.created'
left join public.automation_jobs aj
  on aj.platform_event_id = e.id
left join public.automation_rules ar
  on ar.id = aj.automation_rule_id
where s.student_id in (
  'STU-000002',
  'STU-000003',
  'STU-000004'
)
order by s.student_id, e.occurred_at;
