create table public.platform_events (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    event_type text not null,

    entity_type text not null,
    entity_id uuid,

    actor_user_id uuid,

    occurred_at timestamptz not null default now(),

    payload jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint platform_events_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint platform_events_actor_user_id_fkey
        foreign key (actor_user_id)
        references public.user_profiles(id)
        on delete set null,

    constraint platform_events_event_type_not_empty
        check (length(trim(event_type)) > 0),

    constraint platform_events_entity_type_not_empty
        check (length(trim(entity_type)) > 0),

    constraint platform_events_payload_object
        check (jsonb_typeof(payload) = 'object'),

    constraint platform_events_organization_id_id_unique
        unique (organization_id, id)
);

create index platform_events_organization_occurred_idx
    on public.platform_events (
        organization_id,
        occurred_at desc
    );

create index platform_events_type_occurred_idx
    on public.platform_events (
        organization_id,
        event_type,
        occurred_at desc
    );

create index platform_events_entity_idx
    on public.platform_events (
        organization_id,
        entity_type,
        entity_id,
        occurred_at desc
    );

create index platform_events_actor_idx
    on public.platform_events (
        organization_id,
        actor_user_id,
        occurred_at desc
    );

alter table public.platform_events enable row level security;

grant select on table public.platform_events
to authenticated;

create policy "organization members can read platform events"
on public.platform_events
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);

create or replace function public.prevent_platform_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    raise exception 'Platform events are immutable';
end;
$$;

revoke execute on function public.prevent_platform_event_mutation()
from public;

drop trigger if exists platform_events_prevent_update
on public.platform_events;

create trigger platform_events_prevent_update
before update
on public.platform_events
for each row
execute function public.prevent_platform_event_mutation();

drop trigger if exists platform_events_prevent_delete
on public.platform_events;

create trigger platform_events_prevent_delete
before delete
on public.platform_events
for each row
execute function public.prevent_platform_event_mutation();

comment on table public.platform_events is
'Immutable tenant-scoped facts emitted by SAKATA OS for automation, workflow, intelligence, integration, and operational processing.';

comment on column public.platform_events.event_type is
'Stable machine-readable fact name such as student.admitted or payment.received.';

comment on column public.platform_events.entity_type is
'Canonical resource type associated with the event.';

comment on column public.platform_events.entity_id is
'Internal UUID of the affected resource when applicable.';

comment on column public.platform_events.actor_user_id is
'User profile responsible for the event when a human actor exists.';

comment on column public.platform_events.payload is
'Structured event context used by downstream automation and processing.';
