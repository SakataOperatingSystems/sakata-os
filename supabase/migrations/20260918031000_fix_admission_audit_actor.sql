create or replace function public.audit_student_admission_request_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
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
                then 'student_admission_request.created'
            else 'student_admission_request.updated'
        end,

        'student_admission_request',
        new.id,

        case
            when tg_op = 'INSERT'
                then null
            else to_jsonb(old)
        end,

        to_jsonb(new),

        jsonb_build_object(
            'operation', tg_op
        )
    );

    return new;
end;
$function$;
