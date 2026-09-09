-- ============================================================
-- SAKATA OS
-- Migration 002: User Profiles
-- ============================================================

create table public.user_profiles (
    id uuid primary key default gen_random_uuid(),

    auth_user_id uuid not null unique
        references auth.users(id)
        on delete cascade,

    display_name text not null,

    phone text,

    status text not null default 'active'
        check (status in ('active', 'suspended', 'archived')),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);