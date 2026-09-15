grant insert, update on table public.classes to authenticated;

create policy "organization members with manage permission can insert classes"
on public.classes
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'school.classes.manage'
    )
);

create policy "organization members with manage permission can update classes"
on public.classes
for update
to authenticated
using (
    public.current_user_has_permission(
        organization_id,
        'school.classes.manage'
    )
)
with check (
    public.current_user_has_permission(
        organization_id,
        'school.classes.manage'
    )
);

create or replace function public.audit_class_change()
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
                then 'class.created'
            else 'class.updated'
        end,
        'class',
        new.id,
        case
            when tg_op = 'INSERT'
                then null
            else jsonb_build_object(
                'academic_period_id', old.academic_period_id,
                'name', old.name,
                'code', old.code,
                'education_level', old.education_level,
                'class_level', old.class_level,
                'stream', old.stream,
                'status', old.status,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,
        jsonb_build_object(
            'academic_period_id', new.academic_period_id,
            'name', new.name,
            'code', new.code,
            'education_level', new.education_level,
            'class_level', new.class_level,
            'stream', new.stream,
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

revoke execute on function public.audit_class_change() from public;

drop trigger if exists audit_class_change
on public.classes;

create trigger audit_class_change
after insert or update
on public.classes
for each row
execute function public.audit_class_change();
