create unique index workflow_instances_one_active_per_subject_idx
    on public.workflow_instances (
        organization_id,
        workflow_definition_id,
        subject_type,
        subject_id
    )
    where status = 'active';

comment on index public.workflow_instances_one_active_per_subject_idx
    is 'Prevents duplicate active workflow instances for the same tenant, workflow, and operational subject while allowing historical completed or cancelled instances.';
