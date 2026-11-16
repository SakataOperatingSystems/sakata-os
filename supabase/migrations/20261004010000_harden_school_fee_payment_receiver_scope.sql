create or replace function public.validate_school_fee_payment_receiver_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = new.organization_id
      and om.user_profile_id = new.received_by_user_id
      and om.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Payment receiver must be an active member of the payment organization.';
  end if;

  if not exists (
    select 1
    from public.user_profiles up
    where up.id = new.received_by_user_id
      and up.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Payment receiver must be an active user profile.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_school_fee_payment_receiver_scope
on public.school_fee_payments;

create trigger validate_school_fee_payment_receiver_scope
before insert or update of organization_id, received_by_user_id
on public.school_fee_payments
for each row
execute function public.validate_school_fee_payment_receiver_scope();

comment on function public.validate_school_fee_payment_receiver_scope()
is 'Enforces that school fee payment receivers are active users belonging to the payment organization.';