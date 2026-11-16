select
  id,
  organization_id,
  event_type,
  entity_type,
  entity_id,
  actor_user_id,
  occurred_at,
  payload
from public.platform_events
where event_type = 'student.created'
  and entity_type = 'student'
  and payload ->> 'student_id' = 'STU-000001'
order by occurred_at desc
limit 1;
