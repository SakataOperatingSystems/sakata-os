create table if not exists public.school_student_fee_accounts (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    student_id uuid not null,
    academic_period_id uuid not null,
    fee_structure_id uuid not null,

    gross_required_amount numeric(14,2) not null,
    approved_support_amount numeric(14,2) not null default 0,

    net_required_amount numeric(14,2)
        generated always as (
            gross_required_amount - approved_support_amount
        ) stored,

    confirmed_payments_amount numeric(14,2) not null default 0,

    balance_amount numeric(14,2)
        generated always as (
            greatest(
                0::numeric,
                gross_required_amount
                - approved_support_amount
                - confirmed_payments_amount
            )
        ) stored,

    due_date date,
    status text not null default 'open',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint school_student_fee_accounts_gross_nonnegative
        check (gross_required_amount >= 0),

    constraint school_student_fee_accounts_support_nonnegative
        check (approved_support_amount >= 0),

    constraint school_student_fee_accounts_support_within_gross
        check (approved_support_amount <= gross_required_amount),

    constraint school_student_fee_accounts_payments_nonnegative
        check (confirmed_payments_amount >= 0),

    constraint school_student_fee_accounts_status_check
        check (
            status in (
                'open',
                'partially_paid',
                'paid',
                'overdue',
                'closed'
            )
        ),

    constraint school_student_fee_accounts_organization_fk
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint school_student_fee_accounts_student_fk
        foreign key (student_id)
        references public.students(id)
        on delete restrict,

    constraint school_student_fee_accounts_fee_structure_fk
        foreign key (fee_structure_id)
        references public.school_fee_structures(id)
        on delete restrict,

    constraint school_student_fee_accounts_organization_student_fee_unique
        unique (
            organization_id,
            student_id,
            fee_structure_id
        )
);

create index if not exists school_student_fee_accounts_org_idx
    on public.school_student_fee_accounts (organization_id);

create index if not exists school_student_fee_accounts_student_idx
    on public.school_student_fee_accounts (
        organization_id,
        student_id
    );

create index if not exists school_student_fee_accounts_period_idx
    on public.school_student_fee_accounts (
        organization_id,
        academic_period_id
    );

create index if not exists school_student_fee_accounts_balance_idx
    on public.school_student_fee_accounts (
        organization_id,
        balance_amount desc
    );

create index if not exists school_student_fee_accounts_due_date_idx
    on public.school_student_fee_accounts (
        organization_id,
        due_date
    );

create or replace function public.validate_school_student_fee_account()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_fee_structure public.school_fee_structures%rowtype;
    v_student_organization_id uuid;
begin
    select *
    into v_fee_structure
    from public.school_fee_structures
    where id = new.fee_structure_id
      and organization_id = new.organization_id;

    if not found then
        raise exception
            'Fee structure does not belong to the account organization'
            using errcode = '23503';
    end if;

    if v_fee_structure.status <> 'active' then
        raise exception
            'Student fee accounts require an active fee structure'
            using errcode = '23514';
    end if;

    if new.academic_period_id <> v_fee_structure.academic_period_id then
        raise exception
            'Academic period must match the selected fee structure'
            using errcode = '23514';
    end if;

    if new.gross_required_amount <> v_fee_structure.amount then
        raise exception
            'Gross required amount must match the selected fee structure'
            using errcode = '23514';
    end if;

    if new.due_date is distinct from v_fee_structure.due_date then
        raise exception
            'Due date must match the selected fee structure'
            using errcode = '23514';
    end if;

    select organization_id
    into v_student_organization_id
    from public.students
    where id = new.student_id;

    if v_student_organization_id is distinct from new.organization_id then
        raise exception
            'Student does not belong to the account organization'
            using errcode = '23503';
    end if;

    if new.approved_support_amount > new.gross_required_amount then
        raise exception
            'Approved support cannot exceed gross required amount'
            using errcode = '23514';
    end if;

    if new.confirmed_payments_amount < 0 then
        raise exception
            'Confirmed payments cannot be negative'
            using errcode = '23514';
    end if;

    return new;
end;
$$;

revoke execute on function public.validate_school_student_fee_account()
from public;

drop trigger if exists validate_school_student_fee_account
on public.school_student_fee_accounts;

create trigger validate_school_student_fee_account
before insert or update
on public.school_student_fee_accounts
for each row
execute function public.validate_school_student_fee_account();

create or replace function public.sync_school_student_fee_account_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_net_required numeric(14,2);
    v_balance numeric(14,2);
begin
    if new.status = 'closed' then
        return new;
    end if;

    v_net_required :=
        new.gross_required_amount
        - new.approved_support_amount;

    v_balance :=
        greatest(
            0::numeric,
            v_net_required
            - new.confirmed_payments_amount
        );

    if v_balance = 0 then
        new.status := 'paid';
    elsif new.due_date is not null
          and new.due_date < current_date then
        new.status := 'overdue';
    elsif new.confirmed_payments_amount > 0 then
        new.status := 'partially_paid';
    else
        new.status := 'open';
    end if;

    return new;
end;
$$;

revoke execute on function public.sync_school_student_fee_account_status()
from public;

drop trigger if exists sync_school_student_fee_account_status
on public.school_student_fee_accounts;

create trigger sync_school_student_fee_account_status
before insert or update
on public.school_student_fee_accounts
for each row
execute function public.sync_school_student_fee_account_status();

create or replace function public.set_school_student_fee_account_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_school_student_fee_account_updated_at()
from public;

drop trigger if exists set_school_student_fee_account_updated_at
on public.school_student_fee_accounts;

create trigger set_school_student_fee_account_updated_at
before update
on public.school_student_fee_accounts
for each row
execute function public.set_school_student_fee_account_updated_at();

alter table public.school_student_fee_accounts
enable row level security;

drop policy if exists school_student_fee_accounts_select
on public.school_student_fee_accounts;

create policy school_student_fee_accounts_select
on public.school_student_fee_accounts
for select
using (
    public.is_current_user_org_member(organization_id)
);

drop policy if exists school_student_fee_accounts_insert
on public.school_student_fee_accounts;

create policy school_student_fee_accounts_insert
on public.school_student_fee_accounts
for insert
with check (
    public.current_user_has_permission(
        organization_id,
        'school.fees.manage'
    )
);

drop policy if exists school_student_fee_accounts_update
on public.school_student_fee_accounts;

create policy school_student_fee_accounts_update
on public.school_student_fee_accounts
for update
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

grant select, insert, update
on public.school_student_fee_accounts
to authenticated;

create or replace function public.audit_school_student_fee_account_change()
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
                then 'student_fee_account.created'
            else 'student_fee_account.updated'
        end,
        'student_fee_account',
        new.id,
        case
            when tg_op = 'INSERT' then null
            else jsonb_build_object(
                'status', old.status,
                'gross_required_amount',
                    old.gross_required_amount,
                'approved_support_amount',
                    old.approved_support_amount,
                'confirmed_payments_amount',
                    old.confirmed_payments_amount,
                'due_date', old.due_date
            )
        end,
        jsonb_build_object(
            'status', new.status,
            'gross_required_amount',
                new.gross_required_amount,
            'approved_support_amount',
                new.approved_support_amount,
            'confirmed_payments_amount',
                new.confirmed_payments_amount,
            'due_date', new.due_date
        ),
        jsonb_build_object(
            'operation', tg_op
        )
    );

    return new;
end;
$$;

revoke execute on function public.audit_school_student_fee_account_change()
from public;

drop trigger if exists audit_school_student_fee_account_change
on public.school_student_fee_accounts;

create trigger audit_school_student_fee_account_change
after insert or update
on public.school_student_fee_accounts
for each row
execute function public.audit_school_student_fee_account_change();

comment on table public.school_student_fee_accounts is
'Student financial obligation ledger: gross obligation, accountable support, confirmed payments and resulting balance.';

comment on column public.school_student_fee_accounts.gross_required_amount is
'Original gross financial obligation. Never reduced by support or payments.';

comment on column public.school_student_fee_accounts.approved_support_amount is
'Approved financial support applied against the gross obligation.';

comment on column public.school_student_fee_accounts.net_required_amount is
'Generated amount: gross required minus approved support.';

comment on column public.school_student_fee_accounts.confirmed_payments_amount is
'Confirmed payments credited against the net required amount. Payment engine owns future mutations.';

comment on column public.school_student_fee_accounts.balance_amount is
'Generated amount: net required minus confirmed payments, never below zero.';
