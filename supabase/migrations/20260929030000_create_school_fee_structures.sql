-- ============================================================
-- SCHOOL FINANCE — FEE STRUCTURES
-- F1 foundation slice
-- ============================================================

create table public.school_fee_structures (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    academic_period_id uuid not null,
    class_id uuid,

    fee_category text not null,
    fee_item text not null,

    amount numeric(14,2) not null,

    payment_frequency text not null,
    due_date date,

    applicability text not null default 'all_eligible',

    status text not null default 'draft',

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint school_fee_structures_amount_check
        check (amount >= 0),

    constraint school_fee_structures_category_check
        check (
            fee_category in (
                'tuition',
                'meals',
                'boarding',
                'transport',
                'examination',
                'development',
                'uniforms',
                'books',
                'swimming',
                'fieldwork',
                'activities',
                'ict',
                'medical',
                'library',
                'registration_admission',
                'other'
            )
        ),

    constraint school_fee_structures_frequency_check
        check (
            payment_frequency in (
                'per_term',
                'per_month',
                'per_year',
                'one_time',
                'other'
            )
        ),

    constraint school_fee_structures_applicability_check
        check (
            applicability in (
                'all_eligible',
                'specific_class',
                'optional',
                'conditional'
            )
        ),

    constraint school_fee_structures_status_check
        check (
            status in (
                'draft',
                'active',
                'inactive',
                'closed'
            )
        ),

    constraint school_fee_structures_class_applicability_check
        check (
            applicability <> 'specific_class'
            or class_id is not null
        ),

    constraint school_fee_structures_organization_fk
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint school_fee_structures_academic_period_fk
        foreign key (organization_id, academic_period_id)
        references public.academic_periods(organization_id, id)
        on delete restrict,

    constraint school_fee_structures_class_fk
        foreign key (organization_id, class_id)
        references public.classes(organization_id, id)
        on delete restrict
);

-- ============================================================
-- INDEXES
-- ============================================================

create index school_fee_structures_organization_id_idx
    on public.school_fee_structures(organization_id);

create index school_fee_structures_academic_period_idx
    on public.school_fee_structures(
        organization_id,
        academic_period_id
    );

create index school_fee_structures_class_idx
    on public.school_fee_structures(
        organization_id,
        class_id
    );

create index school_fee_structures_status_idx
    on public.school_fee_structures(
        organization_id,
        status
    );

create index school_fee_structures_category_idx
    on public.school_fee_structures(
        organization_id,
        fee_category
    );

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.school_fee_structures enable row level security;

grant select on table public.school_fee_structures
to authenticated;

grant insert, update on table public.school_fee_structures
to authenticated;

-- ============================================================
-- READ ACCESS
-- ============================================================

create policy "organization members can read school fee structures"
on public.school_fee_structures
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

-- ============================================================
-- WRITE ACCESS
-- ============================================================

create policy "organization members with fee manage permission can insert school fee structures"
on public.school_fee_structures
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'school.fees.manage'
    )
);

create policy "organization members with fee manage permission can update school fee structures"
on public.school_fee_structures
for update
to authenticated
using (
    public.current_user_has_permission(
        organization_id,
        'school.fees.manage'
    )
)
with check (
    public.current_user_has_permission(
        organization_id,
        'school.fees.manage'
    )
);

-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function public.set_school_fee_structure_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_school_fee_structure_updated_at()
from public;

drop trigger if exists set_school_fee_structure_updated_at
on public.school_fee_structures;

create trigger set_school_fee_structure_updated_at
before update on public.school_fee_structures
for each row
execute function public.set_school_fee_structure_updated_at();

-- ============================================================
-- AUDIT
-- ============================================================

create or replace function public.audit_school_fee_structure_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_actor_user_id uuid;
begin
    select up.id
    into v_actor_user_id
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.status = 'active';

    insert into public.audit_events (
        organization_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        previous_data,
        new_data,
        metadata
    )
    values (
        new.organization_id,
        v_actor_user_id,

        case
            when tg_op = 'INSERT'
                then 'school_fee_structure.created'
            else 'school_fee_structure.updated'
        end,

        'school_fee_structure',

        new.id,

        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'id', old.id,
                'organization_id', old.organization_id,
                'academic_period_id', old.academic_period_id,
                'class_id', old.class_id,
                'fee_category', old.fee_category,
                'fee_item', old.fee_item,
                'amount', old.amount,
                'payment_frequency', old.payment_frequency,
                'due_date', old.due_date,
                'applicability', old.applicability,
                'status', old.status,
                'notes', old.notes,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,

        jsonb_build_object(
            'id', new.id,
            'organization_id', new.organization_id,
            'academic_period_id', new.academic_period_id,
            'class_id', new.class_id,
            'fee_category', new.fee_category,
            'fee_item', new.fee_item,
            'amount', new.amount,
            'payment_frequency', new.payment_frequency,
            'due_date', new.due_date,
            'applicability', new.applicability,
            'status', new.status,
            'notes', new.notes,
            'created_at', new.created_at,
            'updated_at', new.updated_at
        ),

        jsonb_build_object(
            'operation', tg_op
        )
    );

    return new;
end;
$$;

revoke execute on function public.audit_school_fee_structure_change()
from public;

drop trigger if exists audit_school_fee_structure_change
on public.school_fee_structures;

create trigger audit_school_fee_structure_change
after insert or update on public.school_fee_structures
for each row
execute function public.audit_school_fee_structure_change();

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.school_fee_structures is
'Organization-scoped fee structure defining a gross school fee obligation before support and confirmed payments.';

comment on column public.school_fee_structures.academic_period_id is
'Academic period to which the fee structure applies.';

comment on column public.school_fee_structures.class_id is
'Optional organization-scoped class context. Required when applicability is specific_class.';

comment on column public.school_fee_structures.fee_category is
'Financial category of the fee obligation.';

comment on column public.school_fee_structures.fee_item is
'Human-readable fee item within the selected category.';

comment on column public.school_fee_structures.amount is
'Gross required amount before approved support or confirmed payments.';

comment on column public.school_fee_structures.payment_frequency is
'Expected payment frequency for the fee item.';

comment on column public.school_fee_structures.due_date is
'Operational due date for the fee item when applicable.';

comment on column public.school_fee_structures.applicability is
'Defines whether the fee applies to all eligible students, a specific class, optionally, or conditionally.';

comment on column public.school_fee_structures.status is
'Lifecycle state of the fee structure: draft, active, inactive or closed.';
