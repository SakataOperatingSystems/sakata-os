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
  'bb83389a-c38b-4a9c-ae13-b3502fce55cf'::uuid,
  'Student Creation Automation Test',
  'Verification rule for the platform automation event-to-job pipeline.',
  'student.created',
  'student',
  'test.queue',
  '{}'::jsonb,
  true
where not exists (
  select 1
  from public.automation_rules
  where organization_id = 'bb83389a-c38b-4a9c-ae13-b3502fce55cf'::uuid
    and name = 'Student Creation Automation Test'
);

select
  id,
  name,
  event_type,
  entity_type,
  action_type,
  enabled
from public.automation_rules
where organization_id = 'bb83389a-c38b-4a9c-ae13-b3502fce55cf'::uuid
  and name = 'Student Creation Automation Test';
