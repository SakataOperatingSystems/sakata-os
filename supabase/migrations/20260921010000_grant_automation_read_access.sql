-- SAKATA OS
-- Grant authenticated users read access to automation metadata/jobs.
-- RLS remains the tenant boundary.
-- No INSERT, UPDATE, or DELETE privileges are granted.

grant select on table public.automation_rules to authenticated;
grant select on table public.automation_jobs to authenticated;
