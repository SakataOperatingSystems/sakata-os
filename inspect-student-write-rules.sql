select
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'students'
order by c.ordinal_position;

select
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as constraint_definition
from pg_constraint con
join pg_class rel
  on rel.oid = con.conrelid
join pg_namespace nsp
  on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'students'
  and con.contype = 'c'
order by con.conname;
