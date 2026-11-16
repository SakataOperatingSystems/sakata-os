select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'organization_memberships'
order by ordinal_position;

select
  pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'is_current_user_org_member';
