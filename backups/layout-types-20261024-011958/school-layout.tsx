import Link from "next/link";
import {
  getCurrentPermissions,
  hasActiveProductDeployment,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { redirect } from "next/navigation";

export default async function SchoolLayout({
  children,
}: LayoutProps<"/school">) {
  if (!(await hasActiveProductDeployment("school_os"))) {
    redirect("/applications");
  }

  const { organization } = await getOrganizationContext();
  const permissions = await getCurrentPermissions();
  const canReadAdmissions = permissions.has("school.admission_requests.read");
  const canReadAcademicPeriods = permissions.has(
    "school.academic_periods.read",
  );
  const canReadAcademicStructure = permissions.has(
    "school.education_levels.read",
  );
  const canReadClasses = permissions.has("school.classes.read");
  const canReadStudents = permissions.has("school.students.read");
  const canReadEnrollments = permissions.has("school.enrollments.read");
  const canReadAttendance = permissions.has("school.attendance.read");
  const canReadDocuments = permissions.has("core.documents.read");
  const canReadTasks = permissions.has("core.tasks.read");
  const canReadFinance = permissions.has("school.fees.read");
  const canReadStaff = permissions.has("memberships.read");
  const canReadSchoolHome = [
    "school.academic_periods.read",
    "school.education_levels.read",
    "school.classes.read",
    "school.admission_requests.read",
    "school.students.read",
    "school.enrollments.read",
    "school.attendance.read",
    "school.fees.read",
    "core.tasks.read",
    "core.documents.read",
    "memberships.read",
  ].some((permission) => permissions.has(permission));

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              SAKATA OPERATING SYSTEMS
            </p>

            {canReadSchoolHome ? (
              <Link
                href="/school"
                className="mt-1 block text-lg font-semibold text-sky-200"
              >
                School OS
              </Link>
            ) : (
              <p className="mt-1 text-lg font-semibold text-sky-200">
                School OS
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Organization
            </p>

            <p className="mt-1 text-sm font-medium text-slate-200">
              {organization.name}
            </p>
          </div>
        </div>

        <nav className="border-t border-slate-900">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-2 px-6 py-3 text-sm">
            {canReadSchoolHome && (
              <Link
                href="/school"
                className="text-slate-400 transition hover:text-white"
              >
                Overview
              </Link>
            )}

            {canReadAcademicPeriods && (
              <Link
                href="/school/academic-periods"
                className="text-slate-400 transition hover:text-white"
              >
                Academic Periods
              </Link>
            )}

            {canReadAcademicStructure && (
              <Link
                href="/school/academic-structure"
                className="text-slate-400 transition hover:text-white"
              >
                Academic Structure
              </Link>
            )}

            {canReadClasses && (
              <Link
                href="/school/classes"
                className="text-slate-400 transition hover:text-white"
              >
                Classes
              </Link>
            )}

            {canReadAdmissions && (
              <Link
                href="/school/admissions"
                className="text-slate-400 transition hover:text-white"
              >
                Admissions
              </Link>
            )}

            {canReadStudents && (
              <Link
                href="/school/students"
                className="text-slate-400 transition hover:text-white"
              >
                Students
              </Link>
            )}

            {canReadEnrollments && (
              <Link
                href="/school/enrollments"
                className="text-slate-400 transition hover:text-white"
              >
                Enrollments
              </Link>
            )}

            {canReadAttendance && (
              <Link
                href="/school/attendance"
                className="text-slate-400 transition hover:text-white"
              >
                Attendance
              </Link>
            )}

            {canReadTasks && (
              <Link
                href="/school/tasks"
                className="text-slate-400 transition hover:text-white"
              >
                Tasks
              </Link>
            )}

            {canReadFinance && (
              <Link
                href="/school/finance"
                className="text-slate-400 transition hover:text-white"
              >
                Finance
              </Link>
            )}

            {canReadDocuments && (
              <Link
                href="/documents"
                className="text-slate-400 transition hover:text-white"
              >
                Documents
              </Link>
            )}

            {canReadStaff && (
              <Link
                href="/school/staff"
                className="text-slate-400 transition hover:text-white"
              >
                Staff & Roles
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}
