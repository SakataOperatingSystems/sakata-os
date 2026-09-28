create table if not exists public.organization_number_sequences (
    organization_id uuid not null
        references public.organizations(id)
        on delete cascade,
    sequence_key text not null,
    sequence_scope text not null default 'yearly',
    sequence_year integer not null default 0,
    next_number integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint organization_number_sequences_pkey
        primary key (
            organization_id,
            sequence_key,
            sequence_scope,
            sequence_year
        ),

    constraint organization_number_sequences_key_not_empty
        check (length(trim(sequence_key)) > 0),

    constraint organization_number_sequences_scope_valid
        check (sequence_scope in ('yearly', 'lifetime')),

    constraint organization_number_sequences_year_valid
        check (
            (sequence_scope = 'yearly' and sequence_year between 2000 and 9999)
            or
            (sequence_scope = 'lifetime' and sequence_year = 0)
        ),

    constraint organization_number_sequences_next_number_valid
        check (next_number > 0)
);

create index if not exists organization_number_sequences_organization_idx
    on public.organization_number_sequences (organization_id);

create or replace function public.next_organization_number(
    p_organization_id uuid,
    p_sequence_key text,
    p_sequence_year integer,
    p_sequence_scope text default 'yearly'
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_next_number integer;
    v_scope text;
    v_year integer;
begin
    if p_organization_id is null then
        raise exception 'Organization ID is required.';
    end if;

    if nullif(trim(p_sequence_key), '') is null then
        raise exception 'Sequence key is required.';
    end if;

    v_scope := lower(trim(coalesce(p_sequence_scope, 'yearly')));

    if v_scope not in ('yearly', 'lifetime') then
        raise exception 'Sequence scope must be yearly or lifetime.';
    end if;

    if v_scope = 'yearly' then
        if p_sequence_year < 2000 or p_sequence_year > 9999 then
            raise exception 'Yearly sequences require a year between 2000 and 9999.';
        end if;

        v_year := p_sequence_year;
    else
        v_year := 0;
    end if;

    if not public.is_current_user_org_member(p_organization_id) then
        raise exception 'The current user is not an active member of the requested organization.';
    end if;

    insert into public.organization_number_sequences (
        organization_id,
        sequence_key,
        sequence_scope,
        sequence_year,
        next_number
    )
    values (
        p_organization_id,
        trim(p_sequence_key),
        v_scope,
        v_year,
        2
    )
    on conflict (
        organization_id,
        sequence_key,
        sequence_scope,
        sequence_year
    )
    do update
    set
        next_number = public.organization_number_sequences.next_number + 1,
        updated_at = now()
    returning next_number - 1
    into v_next_number;

    return v_next_number;
end;
$$;

comment on table public.organization_number_sequences is
    'Tenant-scoped business-number sequence state supporting yearly and lifetime system-generated human-facing identifiers.';

comment on function public.next_organization_number(uuid, text, integer, text) is
    'Atomically allocates the next tenant-scoped number for a yearly or lifetime sequence.';

alter table public.organization_number_sequences enable row level security;

drop policy if exists organization_number_sequences_select
    on public.organization_number_sequences;

create policy organization_number_sequences_select
    on public.organization_number_sequences
    for select
    to authenticated
    using (
        public.is_current_user_org_member(organization_id)
    );

revoke all on table public.organization_number_sequences from public;
revoke all on table public.organization_number_sequences from authenticated;

grant select on table public.organization_number_sequences to authenticated;

revoke all on function public.next_organization_number(uuid, text, integer)
    from public;

revoke all on function public.next_organization_number(uuid, text, integer, text)
    from public;

grant execute on function public.next_organization_number(uuid, text, integer, text)
    to authenticated;
