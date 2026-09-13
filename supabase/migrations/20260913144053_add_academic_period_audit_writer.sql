create or replace function public.audit_academic_period_change()
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
                then 'academic_period.created'
            else 'academic_period.updated'
        end,
        'academic_period',
        new.id,
        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'name', old.name,
                'code', old.code,
                'academic_year', old.academic_year,
                'period_number', old.period_number,
                'start_date', old.start_date,
                'end_date', old.end_date,
                'status', old.status,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,
        jsonb_build_object(
            'name', new.name,
            'code', new.code,
            'academic_year', new.academic_year,
            'period_number', new.period_number,
            'start_date', new.start_date,
            'end_date', new.end_date,
            'status', new.status,
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

revoke execute on function public.audit_academic_period_change() from public;

drop trigger if exists audit_academic_period_change
on public.academic_periods;

create trigger audit_academic_period_change
after insert or update
on public.academic_periods
for each row
execute function public.audit_academic_period_change();
