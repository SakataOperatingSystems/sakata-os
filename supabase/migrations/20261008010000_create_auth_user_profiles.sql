create or replace function public.create_user_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.user_profiles (
        auth_user_id,
        display_name,
        phone,
        status
    )
    values (
        new.id,
        coalesce(
            nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
            nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
            'New user'
        ),
        nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
        'active'
    )
    on conflict (auth_user_id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.create_user_profile_for_auth_user();
