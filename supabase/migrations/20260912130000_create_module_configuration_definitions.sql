create table if not exists public.module_configuration_definitions (
    id uuid primary key default gen_random_uuid(),

    module_definition_id uuid not null
        references public.module_definitions(id)
        on delete restrict,

    code text not null,
    name text not null,
    description text,

    value_type text not null
        check (
            value_type in (
                'text',
                'integer',
                'decimal',
                'boolean',
                'date',
                'datetime',
                'select',
                'json'
            )
        ),

    default_value jsonb,
    validation_rules jsonb not null default '{}'::jsonb,

    is_required boolean not null default false,

    status text not null default 'active'
        check (status in ('active', 'suspended', 'archived')),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint module_configuration_definitions_unique
        unique (module_definition_id, code),

    constraint module_configuration_definitions_code_check
        check (code ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'),

    constraint module_configuration_definitions_name_check
        check (length(trim(name)) > 0),

    constraint module_configuration_definitions_default_object_check
        check (jsonb_typeof(default_value) is distinct from 'object'),

    constraint module_configuration_definitions_validation_object_check
        check (jsonb_typeof(validation_rules) = 'object')
);

create index if not exists idx_module_configuration_definitions_module
    on public.module_configuration_definitions (module_definition_id);

create index if not exists idx_module_configuration_definitions_status
    on public.module_configuration_definitions (status);

create or replace function public.set_module_configuration_definitions_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_module_configuration_definitions_updated_at
on public.module_configuration_definitions;

create trigger trg_module_configuration_definitions_updated_at
before update on public.module_configuration_definitions
for each row
execute function public.set_module_configuration_definitions_updated_at();

alter table public.module_configuration_definitions enable row level security;

grant select on public.module_configuration_definitions to authenticated;

drop policy if exists "authenticated users can read active configuration definitions"
on public.module_configuration_definitions;

create policy "authenticated users can read active configuration definitions"
on public.module_configuration_definitions
for select
to authenticated
using (status = 'active');
