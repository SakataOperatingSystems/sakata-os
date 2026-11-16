begin;

create table if not exists public.school_fee_account_support_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  student_fee_account_id uuid not null references public.school_student_fee_accounts(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  previous_support_amount numeric(14,2) not null check (previous_support_amount >= 0),
  new_support_amount numeric(14,2) not null check (new_support_amount >= 0),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists school_fee_account_support_adjustments_account_idx
  on public.school_fee_account_support_adjustments(student_fee_account_id, created_at desc);

create index if not exists school_fee_account_support_adjustments_org_idx
  on public.school_fee_account_support_adjustments(organization_id, created_at desc);

alter table public.school_fee_account_support_adjustments enable row level security;

revoke all on table public.school_fee_account_support_adjustments from anon, authenticated;

grant select on table public.school_fee_account_support_adjustments to authenticated;

drop policy if exists "fee support adjustments read organization" on public.school_fee_account_support_adjustments;

create policy "fee support adjustments read organization"
on public.school_fee_account_support_adjustments
for select
to authenticated
using (
  public.is_current_user_org_member(organization_id)
);

create or replace function public.adjust_school_student_fee_account_support(
  p_account_id uuid,
  p_organization_id uuid,
  p_new_support_amount numeric,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_organization_id uuid;
  v_gross numeric(14,2);
  v_previous_support numeric(14,2);
  v_confirmed_payments numeric(14,2);
  v_due_date date;
  v_status text;
  v_new_balance numeric(14,2);
  v_new_status text;
begin
  if v_actor is null then
    raise exception 'Authentication is required.';
  end if;

  if p_new_support_amount is null or p_new_support_amount < 0 then
    raise exception 'Approved support must be zero or greater.';
  end if;

  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'A correction reason is required.';
  end if;

  if char_length(btrim(p_reason)) > 500 then
    raise exception 'The correction reason must be 500 characters or fewer.';
  end if;

  select
    organization_id,
    gross_required_amount,
    approved_support_amount,
    confirmed_payments_amount,
    due_date,
    status
  into
    v_organization_id,
    v_gross,
    v_previous_support,
    v_confirmed_payments,
    v_due_date,
    v_status
  from public.school_student_fee_accounts
  where id = p_account_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Student fee account not found or you do not have access to it.';
  end if;

  if not public.current_user_has_permission(
    v_organization_id,
    'school.fees.manage'
  ) then
    raise exception 'You do not have permission to manage student fee accounts.';
  end if;

  if v_status = 'closed' then
    raise exception 'Closed student fee accounts cannot be corrected.';
  end if;

  if p_new_support_amount > v_gross then
    raise exception 'Approved support cannot exceed the gross fee obligation.';
  end if;

  v_new_balance :=
    greatest(
      0::numeric,
      v_gross - p_new_support_amount - v_confirmed_payments
    );

  if v_new_balance < 0 then
    raise exception 'The corrected support amount creates an invalid financial balance.';
  end if;

  if v_new_balance = 0 then
    v_new_status := 'paid';
  elsif v_due_date is not null and v_due_date < current_date then
    v_new_status := 'overdue';
  elsif v_confirmed_payments > 0 then
    v_new_status := 'partially_paid';
  else
    v_new_status := 'open';
  end if;

  insert into public.school_fee_account_support_adjustments (
    organization_id,
    student_fee_account_id,
    actor_user_id,
    previous_support_amount,
    new_support_amount,
    reason
  )
  values (
    v_organization_id,
    p_account_id,
    v_actor,
    v_previous_support,
    p_new_support_amount,
    btrim(p_reason)
  );

  update public.school_student_fee_accounts
  set
    approved_support_amount = p_new_support_amount,
    status = v_new_status,
    updated_at = now()
  where id = p_account_id
    and organization_id = v_organization_id;
end;
$$;

revoke all on function public.adjust_school_student_fee_account_support(
  uuid,
  uuid,
  numeric,
  text
) from public, anon;

grant execute on function public.adjust_school_student_fee_account_support(
  uuid,
  uuid,
  numeric,
  text
) to authenticated;

commit;
