create or replace function public.next_organization_number(
    p_organization_id uuid,
    p_sequence_key text,
    p_sequence_year integer
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_next_number integer;
begin
    if p_organization_id is null then
        raise exception 'Organization ID is required.';
    end if;

    if nullif(trim(p_sequence_key), '') is null then
        raise exception 'Sequence key is required.';
    end if;

    if p_sequence_year < 2000 or p_sequence_year > 9999 then
        raise exception 'Sequence year must be between 2000 and 9999.';
    end if;

    if not public.is_current_user_org_member(
        p_organization_id
    ) then
        raise exception 'The current user is not an active member of the requested organization.';
    end if;

    insert into public.organization_number_sequences (
        organization_id,
        sequence_key,
        sequence_year,
        next_number
    )
    values (
        p_organization_id,
        trim(p_sequence_key),
        p_sequence_year,
        2
    )
    on conflict (
        organization_id,
        sequence_key,
        sequence_year
    )
    do update
    set
        next_number =
            public.organization_number_sequences.next_number + 1,
        updated_at = now()
    returning next_number - 1
    into v_next_number;

    return v_next_number;
end;
$$;

comment on function public.next_organization_number(uuid, text, integer) is
    'Atomically allocates the next tenant-scoped number for a sequence key and year. The function validates active organization membership and performs sequence mutation with controlled security-definer privileges.';

revoke all on function public.next_organization_number(
    uuid,
    text,
    integer
) from public;

grant execute on function public.next_organization_number(
    uuid,
    text,
    integer
) to authenticated;

revoke insert, update, delete
on public.organization_number_sequences
from authenticated;

grant select
on public.organization_number_sequences
to authenticated;
