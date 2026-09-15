-- ============================================================
-- SAKATA SCHOOL OS
-- CLASS MODULE — PRODUCTION SCHEMA
-- ============================================================

-- ============================================================
-- SUPPORT THE SAME-TENANT ACADEMIC PERIOD FOREIGN KEY
-- ============================================================

alter table public.academic_periods
    add constraint academic_periods_organization_id_id_key
    unique (organization_id, id);

-- ============================================================
-- CLASSES
-- ============================================================

create table public.classes (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,
    academic_period_id uuid not null,

    name text not null,
    code text not null,

    education_level text not null,
    class_level text not null,
    stream text,

    status text not null default 'planned',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint classes_name_not_empty
        check (length(trim(name)) > 0),

    constraint classes_code_not_empty
        check (length(trim(code)) > 0),

    constraint classes_code_format
        check (code ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'),

    constraint classes_education_level_not_empty
        check (length(trim(education_level)) > 0),

    constraint classes_class_level_not_empty
        check (length(trim(class_level)) > 0),

    constraint classes_stream_not_empty
        check (
            stream is null
            or length(trim(stream)) > 0
        ),

    constraint classes_status_check
        check (
            status in (
                'planned',
                'active',
                'closed',
                'cancelled'
            )
        ),

    constraint classes_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint classes_period_same_organization_fkey
        foreign key (organization_id, academic_period_id)
        references public.academic_periods(
            organization_id,
            id
        )
        on delete restrict,

    constraint classes_code_unique_per_period
        unique (
            organization_id,
            academic_period_id,
            code
        ),

    constraint classes_name_unique_per_period
        unique (
            organization_id,
            academic_period_id,
            name
        )
);

-- ============================================================
-- INDEXES
-- ============================================================

create index classes_organization_id_idx
    on public.classes(organization_id);

create index classes_academic_period_id_idx
    on public.classes(academic_period_id);

create index classes_status_idx
    on public.classes(status);

create index classes_organization_period_idx
    on public.classes(
        organization_id,
        academic_period_id
    );

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.classes enable row level security;

-- ============================================================
-- READ ACCESS
-- ============================================================

create policy "organization members can read classes"
on public.classes
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

-- ============================================================
-- TIMESTAMP MAINTENANCE
-- ============================================================

create or replace function public.set_class_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_class_updated_at()
from public;

create trigger set_class_updated_at
before update on public.classes
for each row
execute function public.set_class_updated_at();

-- ============================================================
-- TABLE / COLUMN COMMENTS
-- ============================================================

comment on table public.classes is
'Academic class/group definition for an organization and academic period.';

comment on column public.classes.organization_id is
'Tenant organization owning the class.';

comment on column public.classes.academic_period_id is
'Academic period in which this class instance operates.';

comment on column public.classes.name is
'Human-readable class name, such as P1 A or Senior 1 East.';

comment on column public.classes.code is
'Stable organization-defined class code, unique within the academic period.';

comment on column public.classes.education_level is
'Configurable education level, such as Pre-Primary, Primary, Secondary, or Tertiary.';

comment on column public.classes.class_level is
'Configurable level within the education structure, such as Baby, P1, P7, or Senior 1.';

comment on column public.classes.stream is
'Optional stream, section, or parallel class designation.';

comment on column public.classes.status is
'Operational class status: planned, active, closed, or cancelled.';