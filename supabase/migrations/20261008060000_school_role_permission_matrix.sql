begin;

-- School Administrator
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'school_administrator'
  and r.scope = 'organization'
  and r.organization_id = 'bb83389a-c38b-4a9c-ae13-b3502fce55cf'
  and r.status = 'active'
  and p.code in (
    'audit.read',
    'memberships.read',
    'memberships.manage',
    'organization.configuration.manage',
    'roles.read',
    'roles.manage',
    'school.academic_periods.read',
    'school.academic_periods.manage',
    'school.admission_requests.read',
    'school.admission_requests.manage',
    'school.attendance.read',
    'school.attendance.manage',
    'school.class_levels.read',
    'school.class_levels.manage',
    'school.classes.read',
    'school.classes.manage',
    'school.education_levels.read',
    'school.education_levels.manage',
    'school.enrollments.read',
    'school.enrollments.manage',
    'school.fees.read',
    'school.fees.manage',
    'school.students.read',
    'school.students.manage'
  )
on conflict do nothing;

-- Head Teacher
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'head_teacher'
  and r.scope = 'organization'
  and r.organization_id = 'bb83389a-c38b-4a9c-ae13-b3502fce55cf'
  and r.status = 'active'
  and p.code in (
    'school.academic_periods.read',
    'school.academic_periods.manage',
    'school.admission_requests.read',
    'school.admission_requests.manage',
    'school.attendance.read',
    'school.attendance.manage',
    'school.class_levels.read',
    'school.class_levels.manage',
    'school.classes.read',
    'school.classes.manage',
    'school.education_levels.read',
    'school.education_levels.manage',
    'school.enrollments.read',
    'school.enrollments.manage',
    'school.students.read',
    'school.students.manage'
  )
on conflict do nothing;

-- Academic Officer
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'academic_officer'
  and r.scope = 'organization'
  and r.organization_id = 'bb83389a-c38b-4a9c-ae13-b3502fce55cf'
  and r.status = 'active'
  and p.code in (
    'school.academic_periods.read',
    'school.academic_periods.manage',
    'school.admission_requests.read',
    'school.admission_requests.manage',
    'school.attendance.read',
    'school.attendance.manage',
    'school.class_levels.read',
    'school.class_levels.manage',
    'school.classes.read',
    'school.classes.manage',
    'school.education_levels.read',
    'school.education_levels.manage',
    'school.enrollments.read',
    'school.enrollments.manage',
    'school.students.read',
    'school.students.manage'
  )
on conflict do nothing;

-- Bursar
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'bursar'
  and r.scope = 'organization'
  and r.organization_id = 'bb83389a-c38b-4a9c-ae13-b3502fce55cf'
  and r.status = 'active'
  and p.code in (
    'school.students.read',
    'school.enrollments.read',
    'school.fees.read',
    'school.fees.manage'
  )
on conflict do nothing;

-- Teacher
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'teacher'
  and r.scope = 'organization'
  and r.organization_id = 'bb83389a-c38b-4a9c-ae13-b3502fce55cf'
  and r.status = 'active'
  and p.code in (
    'school.academic_periods.read',
    'school.attendance.read',
    'school.attendance.manage',
    'school.class_levels.read',
    'school.classes.read',
    'school.education_levels.read',
    'school.enrollments.read',
    'school.students.read'
  )
on conflict do nothing;

-- Class Teacher
-- Current permission vocabulary does not yet express assigned-class scope.
-- Give the operational Teacher capability set now; class scoping is a
-- separate authorization layer and must not be faked through permissions.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'class_teacher'
  and r.scope = 'organization'
  and r.organization_id = 'bb83389a-c38b-4a9c-ae13-b3502fce55cf'
  and r.status = 'active'
  and p.code in (
    'school.academic_periods.read',
    'school.attendance.read',
    'school.attendance.manage',
    'school.class_levels.read',
    'school.classes.read',
    'school.education_levels.read',
    'school.enrollments.read',
    'school.students.read'
  )
on conflict do nothing;

commit;
