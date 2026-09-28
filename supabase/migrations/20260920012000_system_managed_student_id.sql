-- System-managed lifetime Student IDs.
--
-- Student identity is lifetime-scoped within an organization.
-- It must not use the year-scoped organization_number_sequences table.
--
-- Existing student.student_id values are preserved.
-- New students receive STU-000001, STU-000002, etc.
--
-- The allocator is atomic and organization-scoped.

create table if not exists public.organization_lifetime_number_sequences (
  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  sequence_key text not null,

  next_number integer not null default 1,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  primary key (organization_id, sequence_key),

  constraint organization_lifetime_number_sequences_key_valid
    check (length(trim(sequence_key)) > 0),

  constraint organization_lifetime_number_sequences_next_number_valid
    check (next_number >= 1)
);

create index if not exists idx_organization_lifetime_number_sequences_organization
  on public.organization_lifetime_number_sequences (organization_id);

alter table public.organization_lifetime_number_sequences enable row level security;

revoke all on public.organization_lifetime_number_sequences from anon;
revoke all on public.organization_lifetime_number_sequences from authenticated;

insert into public.organization_lifetime_number_sequences (
  organization_id,
  sequence_key,
  next_number
)
select
  s.organization_id,
  'student',
  greatest(
    1,
    coalesce(
      max(
        case
          when s.student_id ~ '^STU-[0-9]+$'
            then substring(s.student_id from 5)::integer + 1
          else 1
        end
      ),
      1
    )
  )
from public.students s
group by s.organization_id
on conflict (organization_id, sequence_key)
do nothing;

create or replace function public.next_organization_lifetime_number(
  p_organization_id uuid,
  p_sequence_key text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allocated_number integer;
begin
  if p_organization_id is null then
    raise exception 'Organization ID is required.';
  end if;

  if p_sequence_key is null
     or length(trim(p_sequence_key)) = 0 then
    raise exception 'Sequence key is required.';
  end if;

  if not public.is_current_user_org_member(p_organization_id) then
    raise exception 'Organization membership required.';
  end if;

  insert into public.organization_lifetime_number_sequences (
    organization_id,
    sequence_key,
    next_number
  )
  values (
    p_organization_id,
    trim(p_sequence_key),
    1
  )
  on conflict (organization_id, sequence_key)
  do nothing;

  update public.organization_lifetime_number_sequences
  set
    next_number = next_number + 1,
    updated_at = now()
  where organization_id = p_organization_id
    and sequence_key = trim(p_sequence_key)
  returning next_number - 1
  into allocated_number;

  if allocated_number is null then
    raise exception 'Failed to allocate lifetime number.';
  end if;

  return allocated_number;
end;
$$;

revoke all on function public.next_organization_lifetime_number(uuid, text)
  from public;

grant execute on function public.next_organization_lifetime_number(uuid, text)
  to authenticated;

create or replace function public.set_system_managed_student_id()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_number integer;
begin
  next_number := public.next_organization_lifetime_number(
    new.organization_id,
    'student'
  );

  new.student_id := 'STU-' || lpad(next_number::text, 6, '0');

  return new;
end;
$$;

drop trigger if exists set_system_managed_student_id
  on public.students;

create trigger set_system_managed_student_id
before insert on public.students
for each row
execute function public.set_system_managed_student_id();

revoke all on function public.set_system_managed_student_id()
  from public;

grant execute on function public.set_system_managed_student_id()
  to authenticated;
