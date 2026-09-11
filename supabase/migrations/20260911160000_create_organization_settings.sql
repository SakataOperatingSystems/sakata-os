create table public.organization_settings (
    organization_id uuid primary key,

    timezone text not null default 'Africa/Kampala',
    currency_code text not null default 'UGX',
    locale text not null default 'en-UG',
    date_format text not null default 'DD/MM/YYYY',

    settings jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint organization_settings_organization_id_fkey
        foreign key (organization_id)
        references public.organizations(id)
        on delete cascade,

    constraint organization_settings_timezone_check
        check (length(trim(timezone)) > 0),

    constraint organization_settings_currency_code_check
        check (currency_code ~ '^[A-Z]{3}$'),

    constraint organization_settings_locale_check
        check (length(trim(locale)) > 0),

    constraint organization_settings_date_format_check
        check (length(trim(date_format)) > 0)
);


create index organization_settings_updated_idx
    on public.organization_settings (updated_at desc);


create or replace function public.set_organization_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


drop trigger if exists organization_settings_set_updated_at
on public.organization_settings;


create trigger organization_settings_set_updated_at
before update
on public.organization_settings
for each row
execute function public.set_organization_settings_updated_at();


alter table public.organization_settings enable row level security;


drop policy if exists organization_settings_select_member
on public.organization_settings;


create policy organization_settings_select_member
on public.organization_settings
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
);