begin;

create table public.organization_documents (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null
        references public.organizations(id) on delete cascade,
    created_by_user_id uuid not null
        references public.user_profiles(id) on delete restrict,
    title text not null,
    category text not null default 'general',
    reference_number text,
    description text,
    status text not null default 'active',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint organization_documents_title_not_empty
        check (length(trim(title)) > 0),
    constraint organization_documents_title_length
        check (length(title) <= 200),
    constraint organization_documents_category_check
        check (
            category in (
                'general',
                'policy',
                'contract',
                'financial',
                'personnel',
                'compliance',
                'other'
            )
        ),
    constraint organization_documents_reference_length
        check (reference_number is null or length(reference_number) <= 100),
    constraint organization_documents_description_not_empty
        check (description is null or length(trim(description)) > 0),
    constraint organization_documents_description_length
        check (description is null or length(description) <= 5000),
    constraint organization_documents_status_check
        check (status in ('active', 'archived'))
);

create index organization_documents_org_status_created_idx
    on public.organization_documents (organization_id, status, created_at desc);

insert into public.permissions (module, code, name, description)
values
    (
        'core',
        'core.documents.read',
        'View Document Register',
        'Allows viewing organization-scoped document metadata.'
    ),
    (
        'core',
        'core.documents.manage',
        'Manage Document Register',
        'Allows creating and archiving organization-scoped document metadata.'
    )
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'organization_admin'
  and r.scope = 'organization'
  and r.status = 'active'
  and p.code in ('core.documents.read', 'core.documents.manage')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'school_administrator'
  and r.scope = 'organization'
  and r.status = 'active'
  and p.code in ('core.documents.read', 'core.documents.manage')
on conflict do nothing;

alter table public.organization_documents enable row level security;

revoke all on public.organization_documents from public, anon;
grant select, insert, update on public.organization_documents to authenticated;

create policy organization_documents_read
on public.organization_documents
for select
to authenticated
using (
    public.is_current_user_org_member(organization_id)
    and public.current_user_has_permission(
        organization_id,
        'core.documents.read'
    )
);

create policy organization_documents_insert
on public.organization_documents
for insert
to authenticated
with check (
    public.current_user_has_permission(
        organization_id,
        'core.documents.manage'
    )
    and created_by_user_id = (
        select up.id
        from public.user_profiles up
        where up.auth_user_id = auth.uid()
          and up.status = 'active'
        limit 1
    )
    and exists (
        select 1
        from public.organization_memberships om
        where om.organization_id = organization_documents.organization_id
          and om.user_profile_id = organization_documents.created_by_user_id
          and om.status = 'active'
    )
);

create policy organization_documents_update
on public.organization_documents
for update
to authenticated
using (
    public.is_current_user_org_member(organization_id)
    and public.current_user_has_permission(
        organization_id,
        'core.documents.manage'
    )
)
with check (
    public.is_current_user_org_member(organization_id)
    and public.current_user_has_permission(
        organization_id,
        'core.documents.manage'
    )
);

create or replace function public.set_organization_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function public.set_organization_documents_updated_at()
from public;

create trigger set_organization_documents_updated_at
before update on public.organization_documents
for each row
execute function public.set_organization_documents_updated_at();

create or replace function public.prevent_document_ownership_change()
returns trigger
language plpgsql
as $$
begin
    if new.id <> old.id or new.created_at <> old.created_at then
        raise exception 'Document identity and creation time cannot be changed.';
    end if;

    if new.organization_id <> old.organization_id then
        raise exception 'Document organization cannot be changed.';
    end if;

    if new.created_by_user_id <> old.created_by_user_id then
        raise exception 'Document creator cannot be changed.';
    end if;

    return new;
end;
$$;

revoke execute on function public.prevent_document_ownership_change()
from public;

create trigger prevent_document_ownership_change
before update on public.organization_documents
for each row
execute function public.prevent_document_ownership_change();

create or replace function public.audit_organization_document_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_actor_user_id uuid;
begin
    select up.id
    into v_actor_user_id
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
      and up.status = 'active';

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
            when tg_op = 'INSERT' then 'document.registered'
            else 'document.updated'
        end,
        'organization_document',
        new.id,
        case
            when tg_op = 'INSERT' then null
            else jsonb_build_object(
                'title', old.title,
                'category', old.category,
                'reference_number', old.reference_number,
                'description', old.description,
                'status', old.status,
                'created_by_user_id', old.created_by_user_id,
                'created_at', old.created_at,
                'updated_at', old.updated_at
            )
        end,
        jsonb_build_object(
            'title', new.title,
            'category', new.category,
            'reference_number', new.reference_number,
            'description', new.description,
            'status', new.status,
            'created_by_user_id', new.created_by_user_id,
            'created_at', new.created_at,
            'updated_at', new.updated_at
        ),
        jsonb_build_object('operation', tg_op)
    );

    return new;
end;
$$;

revoke execute on function public.audit_organization_document_change()
from public;

create trigger audit_organization_document_change
after insert or update on public.organization_documents
for each row
execute function public.audit_organization_document_change();

comment on table public.organization_documents is
'Tenant-scoped document register metadata. File contents and storage locations are deliberately not represented.';

commit;
