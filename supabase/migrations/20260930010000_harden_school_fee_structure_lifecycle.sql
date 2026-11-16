create or replace function public.validate_school_fee_structure_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if old.status = new.status then
        return new;
    end if;

    if old.status = 'draft'
       and new.status = 'active' then
        return new;
    end if;

    if old.status = 'active'
       and new.status = 'inactive' then
        return new;
    end if;

    if old.status = 'inactive'
       and new.status in ('active', 'closed') then
        return new;
    end if;

    raise exception
        'Invalid school fee structure status transition: % -> %',
        old.status,
        new.status
        using errcode = '23514';
end;
$$;

revoke execute on function public.validate_school_fee_structure_status_transition()
from public;

drop trigger if exists validate_school_fee_structure_status_transition
on public.school_fee_structures;

create trigger validate_school_fee_structure_status_transition
before update of status on public.school_fee_structures
for each row
execute function public.validate_school_fee_structure_status_transition();
