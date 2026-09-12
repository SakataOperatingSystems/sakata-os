-- SAKATA OS
-- Harden organization settings

alter table public.organization_settings
    add constraint organization_settings_settings_object_check
    check (jsonb_typeof(settings) = 'object');


create or replace function public.set_organization_settings_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
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