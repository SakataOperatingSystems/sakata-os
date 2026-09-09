create table public.audit_events (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid,
    actor_user_id uuid,

    action text not null,
    entity_type text not null,
    entity_id uuid,

    previous_data jsonb,
    new_data jsonb,
    reason text,
    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint audit_events_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete restrict,

    constraint audit_events_actor_user_id_fkey
        foreign key (actor_user_id)
        references public.user_profiles(id)
        on delete set null
);

create index audit_events_organization_created_idx
    on public.audit_events (organization_id, created_at desc);

create index audit_events_entity_idx
    on public.audit_events (entity_type, entity_id);

create index audit_events_actor_idx
    on public.audit_events (actor_user_id, created_at desc);


create or replace function public.prevent_audit_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    raise exception 'Audit events are immutable';
end;
$$;


create trigger audit_events_prevent_update
before update
on public.audit_events
for each row
execute function public.prevent_audit_event_mutation();


create trigger audit_events_prevent_delete
before delete
on public.audit_events
for each row
execute function public.prevent_audit_event_mutation();