-- Enforce the dedicated task-read permission at the database boundary and
-- keep task lifecycle transitions valid for every authenticated write path.

drop policy if exists "organization members can read tasks"
on public.tasks;

create policy "organization members with task read permission can read tasks"
on public.tasks
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
    and public.current_user_has_permission(
        organization_id,
        'core.tasks.read'
    )
);

create or replace function public.enforce_active_task_assignee()
returns trigger
language plpgsql
as $$
begin
    if new.assigned_to_user_id is not null
       and not exists (
           select 1
           from public.organization_memberships om
           join public.user_profiles up
             on up.id = om.user_profile_id
           where om.organization_id = new.organization_id
             and om.user_profile_id = new.assigned_to_user_id
             and om.status = 'active'
             and up.status = 'active'
       )
    then
        raise exception 'Task assignee must be an active member of the organization.'
            using errcode = '23503';
    end if;

    return new;
end;
$$;

revoke execute on function public.enforce_active_task_assignee()
from public;

drop trigger if exists enforce_active_task_assignee
on public.tasks;

create trigger enforce_active_task_assignee
before insert or update on public.tasks
for each row
execute function public.enforce_active_task_assignee();

create or replace function public.enforce_task_state_transition()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'INSERT' then
        if new.status <> 'open' then
            raise exception 'New tasks must start in the open state.'
                using errcode = '23514';
        end if;

        return new;
    end if;

    if new.status = old.status then
        return new;
    end if;

    if old.status = 'open'
       and new.status in ('in_progress', 'cancelled')
    then
        return new;
    end if;

    if old.status = 'in_progress'
       and new.status in ('open', 'completed', 'cancelled')
    then
        return new;
    end if;

    raise exception 'Invalid task state transition from % to %.',
        old.status,
        new.status
        using errcode = '23514';
end;
$$;

revoke execute on function public.enforce_task_state_transition()
from public;

drop trigger if exists enforce_task_state_transition
on public.tasks;

create trigger enforce_task_state_transition
before insert or update on public.tasks
for each row
execute function public.enforce_task_state_transition();
