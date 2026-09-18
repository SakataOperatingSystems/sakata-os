-- ============================================================
-- SAKATA OS
-- CORE PLATFORM — TASKS
-- Migration: Harden task tenant ownership immutability
-- ============================================================

create or replace function public.prevent_task_organization_change()
returns trigger
language plpgsql
as $$
begin
    if new.organization_id <> old.organization_id then
        raise exception 'Task organization cannot be changed.';
    end if;

    return new;
end;
$$;

revoke execute on function public.prevent_task_organization_change()
from public;

drop trigger if exists prevent_task_organization_change
on public.tasks;

create trigger prevent_task_organization_change
before update on public.tasks
for each row
execute function public.prevent_task_organization_change();

comment on function public.prevent_task_organization_change()
is 'Prevents tenant ownership of an existing task from being changed.';
