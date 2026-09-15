-- ============================================================
-- SAKATA SCHOOL OS
-- CLASS MODULE — NORMALIZED ACADEMIC STRUCTURE INTEGRATION
-- ============================================================

-- ============================================================
-- SUPPORT THE CLASS LEVEL → EDUCATION LEVEL COMPOSITE FK
-- ============================================================

alter table public.class_levels
    add constraint class_levels_education_level_id_id_unique
    unique (education_level_id, id);

-- ============================================================
-- ADD STRUCTURED ACADEMIC REFERENCES
-- ============================================================

alter table public.classes
    add column education_level_id uuid,
    add column class_level_id uuid;

-- ============================================================
-- SAME-TENANT EDUCATION LEVEL INTEGRITY
-- ============================================================

alter table public.classes
    add constraint classes_education_level_same_organization_fkey
    foreign key (organization_id, education_level_id)
    references public.education_levels (
        organization_id,
        id
    )
    on delete restrict;

-- ============================================================
-- SAME-TENANT CLASS LEVEL INTEGRITY
-- ============================================================

alter table public.classes
    add constraint classes_class_level_same_organization_fkey
    foreign key (organization_id, class_level_id)
    references public.class_levels (
        organization_id,
        id
    )
    on delete restrict;

-- ============================================================
-- CLASS LEVEL MUST BELONG TO SELECTED EDUCATION LEVEL
-- ============================================================

alter table public.classes
    add constraint classes_class_level_matches_education_level_fkey
    foreign key (education_level_id, class_level_id)
    references public.class_levels (
        education_level_id,
        id
    )
    on delete restrict;

-- ============================================================
-- BACKFILL EXISTING CLASS RECORDS
-- ============================================================

update public.classes c
set education_level_id = el.id
from public.education_levels el
where el.organization_id = c.organization_id
  and (
      upper(trim(el.code)) = upper(trim(c.education_level))
      or upper(trim(el.name)) = upper(trim(c.education_level))
  )
  and c.education_level_id is null;

update public.classes c
set class_level_id = cl.id
from public.class_levels cl
where cl.organization_id = c.organization_id
  and cl.education_level_id = c.education_level_id
  and (
      upper(trim(cl.code)) = upper(trim(c.class_level))
      or upper(trim(cl.name)) = upper(trim(c.class_level))
  )
  and c.class_level_id is null;

-- ============================================================
-- FAIL SAFELY IF EXISTING RECORDS CANNOT BE RESOLVED
-- ============================================================

do $$
declare
    unresolved_count integer;
begin
    select count(*)
    into unresolved_count
    from public.classes
    where education_level_id is null
       or class_level_id is null;

    if unresolved_count > 0 then
        raise exception
            'Class academic structure migration aborted: % class record(s) could not be resolved to normalized education/class levels.',
            unresolved_count;
    end if;
end;
$$;

-- ============================================================
-- ENFORCE REQUIRED STRUCTURED REFERENCES
-- ============================================================

alter table public.classes
    alter column education_level_id set not null,
    alter column class_level_id set not null;

-- ============================================================
-- INDEXES
-- ============================================================

create index classes_education_level_id_idx
    on public.classes(education_level_id);

create index classes_class_level_id_idx
    on public.classes(class_level_id);

create index classes_organization_academic_structure_idx
    on public.classes(
        organization_id,
        education_level_id,
        class_level_id
    );

-- ============================================================
-- DOCUMENT THE TRANSITION
-- ============================================================

comment on column public.classes.education_level_id is
'Normalized education level reference. Source of truth for the class education level.';

comment on column public.classes.class_level_id is
'Normalized class level reference. Source of truth for the class level and must belong to the selected education level.';

comment on column public.classes.education_level is
'LEGACY TRANSITION FIELD. Retained temporarily for compatibility during migration to education_level_id.';

comment on column public.classes.class_level is
'LEGACY TRANSITION FIELD. Retained temporarily for compatibility during migration to class_level_id.';
