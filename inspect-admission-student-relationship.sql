select
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema as referenced_schema,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
 and tc.table_schema = ccu.table_schema
where tc.table_schema = 'public'
  and tc.table_name = 'student_admission_requests'
order by tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

select
  admission_request_id,
  applicant_name,
  status,
  metadata
from public.student_admission_requests
where organization_id = 'bb83389a-c38b-4a9c-ae13-b3502fce55cf'::uuid
order by created_at desc;
