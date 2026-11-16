begin;

create table public.school_fee_payments (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    student_fee_account_id uuid not null references public.school_student_fee_accounts(id) on delete restrict,
    amount numeric(14,2) not null,
    payment_date date not null,
    payment_method text not null,
    reference text not null,
    received_by_user_id uuid not null references public.user_profiles(id) on delete restrict,
    receipt_status text not null default 'pending',
    status text not null default 'pending',
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint school_fee_payments_amount_check
        check (amount > 0),

    constraint school_fee_payments_method_check
        check (payment_method in (
            'cash',
            'mobile_money',
            'bank_transfer',
            'card',
            'cheque',
            'other'
        )),

    constraint school_fee_payments_receipt_status_check
        check (receipt_status in (
            'pending',
            'issued',
            'voided'
        )),

    constraint school_fee_payments_status_check
        check (status in (
            'pending',
            'confirmed',
            'reversed',
            'cancelled'
        )),

    constraint school_fee_payments_reference_check
        check (length(trim(reference)) > 0)
);

create unique index school_fee_payments_org_reference_idx
on public.school_fee_payments (organization_id, reference);

create index school_fee_payments_org_account_idx
on public.school_fee_payments (organization_id, student_fee_account_id);

create index school_fee_payments_org_date_idx
on public.school_fee_payments (organization_id, payment_date desc);

create index school_fee_payments_org_status_idx
on public.school_fee_payments (organization_id, status);

create or replace function public.validate_school_fee_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_account public.school_student_fee_accounts%rowtype;
    v_confirmed numeric(14,2);
    v_balance numeric(14,2);
begin
    select *
    into v_account
    from public.school_student_fee_accounts
    where id = new.student_fee_account_id
      and organization_id = new.organization_id
    for update;

    if not found then
        raise exception 'Student fee account does not belong to this organization';
    end if;

    if v_account.status = 'closed' then
        raise exception 'Payments cannot be recorded against a closed fee account';
    end if;

    select coalesce(sum(amount), 0)
    into v_confirmed
    from public.school_fee_payments
    where student_fee_account_id = new.student_fee_account_id
      and organization_id = new.organization_id
      and status = 'confirmed'
      and id <> new.id;

    v_balance := greatest(
        0,
        v_account.gross_required_amount
        - v_account.approved_support_amount
        - v_confirmed
    );

    if new.status = 'confirmed' and new.amount > v_balance then
        raise exception 'Confirmed payment exceeds the outstanding fee account balance';
    end if;

    if new.status = 'confirmed' then
        new.receipt_status = 'issued';
    elsif new.status in ('cancelled', 'reversed') then
        new.receipt_status = 'voided';
    else
        new.receipt_status = 'pending';
    end if;

    if tg_op = 'UPDATE' then
        if old.status <> 'pending' then
            if new.amount <> old.amount
               or new.payment_date <> old.payment_date
               or new.payment_method <> old.payment_method
               or new.reference <> old.reference
               or new.received_by_user_id <> old.received_by_user_id
               or new.student_fee_account_id <> old.student_fee_account_id then
                raise exception 'Only pending payments may change payment details';
            end if;
        end if;

        if old.status <> new.status then
            if old.status = 'pending'
               and new.status not in ('confirmed', 'cancelled') then
                raise exception 'Pending payment may only be confirmed or cancelled';
            end if;

            if old.status = 'confirmed'
               and new.status <> 'reversed' then
                raise exception 'Confirmed payment may only be reversed';
            end if;

            if old.status in ('reversed', 'cancelled') then
                raise exception 'Closed payment states cannot be reopened';
            end if;
        end if;
    end if;

    return new;
end;
$$;

revoke execute on function public.validate_school_fee_payment() from public;

create trigger validate_school_fee_payment
before insert or update on public.school_fee_payments
for each row
execute function public.validate_school_fee_payment();

create or replace function public.set_school_fee_payment_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_school_fee_payment_updated_at() from public;

create trigger set_school_fee_payment_updated_at
before update on public.school_fee_payments
for each row
execute function public.set_school_fee_payment_updated_at();

create or replace function public.sync_school_student_fee_account_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_confirmed numeric(14,2);
    v_balance numeric(14,2);
begin
    if new.status = 'closed' then
        return new;
    end if;

    select coalesce(sum(amount), 0)
    into v_confirmed
    from public.school_fee_payments
    where student_fee_account_id = new.id
      and organization_id = new.organization_id
      and status = 'confirmed';

    v_balance := greatest(
        0,
        new.gross_required_amount
        - new.approved_support_amount
        - v_confirmed
    );

    new.confirmed_payments_amount = v_confirmed;

    if v_balance = 0 then
        new.status = 'paid';
    elsif new.due_date is not null
      and new.due_date < current_date then
        new.status = 'overdue';
    elsif v_confirmed > 0 then
        new.status = 'partially_paid';
    else
        new.status = 'open';
    end if;

    return new;
end;
$$;

revoke execute on function public.sync_school_student_fee_account_status() from public;

create or replace function public.sync_school_student_fee_account_from_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    update public.school_student_fee_accounts
    set updated_at = now()
    where id = coalesce(new.student_fee_account_id, old.student_fee_account_id)
      and organization_id = coalesce(new.organization_id, old.organization_id);

    return coalesce(new, old);
end;
$$;

revoke execute on function public.sync_school_student_fee_account_from_payment()
from public;

create trigger sync_school_student_fee_account_from_payment
after insert or update or delete on public.school_fee_payments
for each row
execute function public.sync_school_student_fee_account_from_payment();

create or replace function public.audit_school_fee_payment_change()
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
        coalesce(new.organization_id, old.organization_id),
        v_actor_user_id,
        case
            when tg_op = 'INSERT' then 'school_fee_payment.created'
            when tg_op = 'UPDATE' then 'school_fee_payment.updated'
            else 'school_fee_payment.deleted'
        end,
        'school_fee_payment',
        coalesce(new.id, old.id),
        case
            when tg_op = 'INSERT' then null
            else jsonb_build_object(
                'student_fee_account_id', old.student_fee_account_id,
                'amount', old.amount,
                'payment_date', old.payment_date,
                'payment_method', old.payment_method,
                'reference', old.reference,
                'received_by_user_id', old.received_by_user_id,
                'receipt_status', old.receipt_status,
                'status', old.status,
                'notes', old.notes
            )
        end,
        case
            when tg_op = 'DELETE' then null
            else jsonb_build_object(
                'student_fee_account_id', new.student_fee_account_id,
                'amount', new.amount,
                'payment_date', new.payment_date,
                'payment_method', new.payment_method,
                'reference', new.reference,
                'received_by_user_id', new.received_by_user_id,
                'receipt_status', new.receipt_status,
                'status', new.status,
                'notes', new.notes
            )
        end,
        jsonb_build_object('operation', tg_op)
    );

    return coalesce(new, old);
end;
$$;

revoke execute on function public.audit_school_fee_payment_change() from public;

create trigger audit_school_fee_payment_change
after insert or update or delete on public.school_fee_payments
for each row
execute function public.audit_school_fee_payment_change();

alter table public.school_fee_payments enable row level security;

create policy school_fee_payments_select
on public.school_fee_payments
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

create policy school_fee_payments_insert
on public.school_fee_payments
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'school.fees.manage'
    )
);

create policy school_fee_payments_update
on public.school_fee_payments
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

grant select, insert, update
on public.school_fee_payments
to authenticated;

comment on table public.school_fee_payments is
'School payment ledger. Only confirmed payments contribute to student fee account balances.';

comment on column public.school_fee_payments.status is
'Payment lifecycle: pending, confirmed, reversed, cancelled.';

comment on column public.school_fee_payments.receipt_status is
'Receipt control state: pending, issued, voided.';

commit;
