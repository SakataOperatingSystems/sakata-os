-- SAKATA OS
-- Academic Structure write security and audit
-- Enforces manage permissions and records structural changes.

grant insert, update on table public.education_levels to authenticated;
grant insert, update on table public.class_levels to authenticated;


create policy "organization members with manage permission can insert education levels"
on public.education_levels
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'school.education_levels.manage'
    )
);


create policy "organization members with manage permission can update education levels"
on public.education_levels
for update
to authenticated
using (
    public.current_user_has_permission(
        organization_id,
        'school.education_levels.manage'
    )
)
with check (
    public.current_user_has_permission(
        organization_id,
        'school.education_levels.manage'
    )
);


create policy "organization members with manage permission can insert class levels"
on public.class_levels
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'school.class_levels.manage'
    )
);


create policy "organization members with manage permission can update class levels"
on public.class_levels
for update
to authenticated
using (
    public.current_user_has_permission(
        organization_id,
        'school.class_levels.manage'
    )
)
with check (
    public.current_user_has_permission(
        organization_id,
        'school.class_levels.manage'
    )
);


create or replace function public.audit_academic_structure_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_actor_user_id uuid;
    v_entity_type text;
begin
    select up.id
    into v_actor_user_id
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.status = 'active';

    v_entity_type :=
        case
            when tg_table_name = 'education_levels'
                then 'education_level'
            when tg_table_name = 'class_levels'
                then 'class_level'
            else tg_table_name
        end;

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
                then v_entity_type || '.created'
            else v_entity_type || '.updated'
        end,
        v_entity_type,
        new.id,
        case
            when tg_op = 'INSERT'
                then null
            else to_jsonb(old)
        end,
        to_jsonb(new),
        jsonb_build_object(
            'operation', tg_op,
            'table_name', tg_table_name
        )
    );

    return new;
end;
$$;


revoke execute on function public.audit_academic_structure_change() from public;


drop trigger if exists audit_education_level_change
on public.education_levels;

create trigger audit_education_level_change
after insert or update
on public.education_levels
for each row
execute function public.audit_academic_structure_change();


drop trigger if exists audit_class_level_change
on public.class_levels;

create trigger audit_class_level_change
after insert or update
on public.class_levels
for each row
execute function public.audit_academic_structure_change();