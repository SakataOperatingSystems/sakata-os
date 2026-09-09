-- ============================================================
-- SAKATA OS
-- Migration 001: Core Identity Foundation
-- ============================================================

create table public.organizations (
    id uuid primary key default gen_random_uuid(),

    name text not null,

    slug text not null unique,

    organization_type text not null,

    status text not null default 'active'
        check (status in ('active', 'suspended', 'archived')),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);