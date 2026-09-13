create table public.academic_periods (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null
        references public.organizations(id)
        on delete cascade,

    name text not null,
    code text not null,

    academic_year integer not null,
    period_number integer not null,

    start_date date not null,
    end_date date not null,

    status text not null default 'planned',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint academic_periods_name_not_empty
        check (length(trim(name)) > 0),

    constraint academic_periods_code_format
        check (code ~ '^[A-Z0-9]+([_-][A-Z0-9]+)*$'),

    constraint academic_periods_academic_year_valid
        check (academic_year >= 2000 and academic_year <= 2100),

    constraint academic_periods_period_number_valid
        check (period_number >= 1 and period_number <= 20),

    constraint academic_periods_dates_valid
        check (end_date >= start_date),

    constraint academic_periods_status_valid
        check (status in (
            'planned',
            'active',
            'closed',
            'cancelled'
        )),

    constraint academic_periods_unique_code
        unique (organization_id, code),

    constraint academic_periods_unique_period
        unique (organization_id, academic_year, period_number)
);

create index academic_periods_organization_id_idx
    on public.academic_periods (organization_id);

create index academic_periods_status_idx
    on public.academic_periods (organization_id, status);

create index academic_periods_dates_idx
    on public.academic_periods (organization_id, start_date, end_date);


create or replace function public.set_academic_period_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_academic_period_updated_at() from public;

create trigger set_academic_period_updated_at
before update on public.academic_periods
for each row
execute function public.set_academic_period_updated_at();


alter table public.academic_periods enable row level security;

grant select on public.academic_periods to authenticated;

create policy "organization members can read academic periods"
on public.academic_periods
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);