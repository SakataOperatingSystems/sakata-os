create table public.permissions (
    id uuid primary key default gen_random_uuid(),

    code text not null,
    name text not null,
    description text,
    module text not null,

    created_at timestamptz not null default now(),

    constraint permissions_code_key
        unique (code)
);

create index permissions_module_idx
    on public.permissions (module);