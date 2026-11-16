begin;

create or replace function public.validate_school_student_fee_account()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_fee_structure public.school_fee_structures%rowtype;
    v_student_organization_id uuid;
    v_due_date_correction_enabled boolean := false;
begin
    v_due_date_correction_enabled :=
        current_setting(
            'app.school_fee_account_due_date_correction',
            true
        ) = 'on';

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

    if new.due_date is distinct from v_fee_structure.due_date
       and not v_due_date_correction_enabled then
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

create or replace function public.adjust_school_student_fee_account_due_date(
  p_account_id uuid,
  p_organization_id uuid,
  p_new_due_date date,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
  v_previous_due_date date;
  v_balance numeric(14,2);
  v_confirmed_payments numeric(14,2);
  v_status text;
begin
  if v_actor is null then
    raise exception 'Authentication is required.';
  end if;

  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'A correction reason is required.';
  end if;

  if char_length(btrim(p_reason)) > 500 then
    raise exception 'The correction reason must be 500 characters or fewer.';
  end if;

  select
    organization_id,
    due_date,
    balance_amount,
    confirmed_payments_amount,
    status
  into
    v_organization_id,
    v_previous_due_date,
    v_balance,
    v_confirmed_payments,
    v_status
  from public.school_student_fee_accounts
  where id = p_account_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception
      'Student fee account not found or you do not have access to it.';
  end if;

  if not public.current_user_has_permission(
    v_organization_id,
    'school.fees.manage'
  ) then
    raise exception
      'You do not have permission to manage student fee accounts.';
  end if;

  if v_status = 'closed' then
    raise exception
      'Closed student fee accounts cannot be corrected.';
  end if;

  insert into public.school_fee_account_due_date_adjustments (
    organization_id,
    student_fee_account_id,
    actor_user_id,
    previous_due_date,
    new_due_date,
    reason
  )
  values (
    v_organization_id,
    p_account_id,
    v_actor,
    v_previous_due_date,
    p_new_due_date,
    btrim(p_reason)
  );

  perform set_config(
    'app.school_fee_account_due_date_correction',
    'on',
    true
  );

  update public.school_student_fee_accounts
  set
    due_date = p_new_due_date,
    updated_at = now()
  where id = p_account_id
    and organization_id = v_organization_id;

  perform set_config(
    'app.school_fee_account_due_date_correction',
    'off',
    true
  );
end;
$$;

revoke all on function public.adjust_school_student_fee_account_due_date(
  uuid,
  uuid,
  date,
  text
) from public, anon;

grant execute on function public.adjust_school_student_fee_account_due_date(
  uuid,
  uuid,
  date,
  text
) to authenticated;

commit;
