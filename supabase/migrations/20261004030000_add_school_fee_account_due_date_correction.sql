begin;

create table if not exists public.school_fee_account_due_date_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  student_fee_account_id uuid not null references public.school_student_fee_accounts(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  previous_due_date date,
  new_due_date date,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists school_fee_account_due_date_adjustments_account_idx
  on public.school_fee_account_due_date_adjustments(
    student_fee_account_id,
    created_at desc
  );

create index if not exists school_fee_account_due_date_adjustments_org_idx
  on public.school_fee_account_due_date_adjustments(
    organization_id,
    created_at desc
  );

alter table public.school_fee_account_due_date_adjustments enable row level security;

revoke all on table public.school_fee_account_due_date_adjustments
from anon, authenticated;

grant select on public.school_fee_account_due_date_adjustments
to authenticated;

drop policy if exists "fee due date adjustments read organization"
on public.school_fee_account_due_date_adjustments;

create policy "fee due date adjustments read organization"
on public.school_fee_account_due_date_adjustments
for select
to authenticated
using (
  public.is_current_user_org_member(organization_id)
);

create or replace function public.adjust_school_student_fee_account_due_date(
  p_account_id uuid,
  p_organization_id uuid,
  p_new_due_date date,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
  v_previous_due_date date;
  v_balance numeric(14,2);
  v_confirmed_payments numeric(14,2);
  v_status text;
  v_new_status text;
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

  if v_balance <= 0 then
    v_new_status := 'paid';
  elsif p_new_due_date is not null and p_new_due_date < current_date then
    v_new_status := 'overdue';
  elsif v_confirmed_payments > 0 then
    v_new_status := 'partially_paid';
  else
    v_new_status := 'open';
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

  update public.school_student_fee_accounts
  set
    due_date = p_new_due_date,
    status = v_new_status,
    updated_at = now()
  where id = p_account_id
    and organization_id = v_organization_id;
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
