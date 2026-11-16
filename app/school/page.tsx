import Link from "next/link";
import SchoolCommandCenter from "./command-center";
import { getCurrentPermissions } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";

export default async function SchoolHome() {
  const permissions = await getCurrentPermissions();
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
  if (!canReadSchoolHome) {
    throw new Error(
      "Forbidden: missing School OS read permission",
    );
  }

  const { organization } = await getOrganizationContext();

  const canReadAcademicPeriods = permissions.has(
    "school.academic_periods.read",
  );
  const canReadAcademicStructure = permissions.has(
    "school.education_levels.read",
  );
  const canReadClasses = permissions.has("school.classes.read");
  const canReadAdmissions = permissions.has(
    "school.admission_requests.read",
  );
  const canReadStudents = permissions.has("school.students.read");
  const canReadEnrollments = permissions.has("school.enrollments.read");
  const canReadAttendance = permissions.has("school.attendance.read");
  const canReadFinance = permissions.has("school.fees.read");

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <SchoolCommandCenter />
        <header className="mb-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                SAKATA OPERATING SYSTEMS
              </p>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                School OS
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
                The school operating environment for coordinating academic,
                administrative, financial, people, and operational processes
                through one controlled system.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Organization
              </p>

              <p className="mt-2 text-lg font-semibold text-slate-100">
                {organization.name}
              </p>

              <p className="mt-1 text-sm text-emerald-400">
                School OS Active
              </p>
            </div>
          </div>
        </header>

        <section className="mb-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Operating Foundation</p>

            <p className="mt-2 text-2xl font-bold">Academic Operations</p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              The School OS foundation connects academic periods, normalized
              structure, classes, students, admission requests, enrollment
              history, and attendance.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Permission-scoped access</p>

            <p className="mt-2 text-2xl font-bold">Organization roles</p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Modules below are available only when your organization role
              grants access. Each route and operation checks permissions on
              the server.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Current Operating Chain</p>

            <p className="mt-2 text-2xl font-bold">Student Lifecycle</p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Admission requests can enter a controlled workflow before
              becoming canonical student records, followed by enrollment,
              class placement, and attendance.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
              Academic Operations
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Operating Foundation
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Establish the academic structure first, then connect admission
              requests, students, enrollment history, and attendance to that
              controlled foundation.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {canReadAcademicPeriods && (
            <Link
              href="/school/academic-periods"
              className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-500/40 hover:bg-slate-900/90"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
                Academic Lifecycle
              </p>

              <h3 className="mt-3 text-xl font-semibold group-hover:text-sky-200">
                Academic Periods
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Define academic years, terms, periods, dates, and lifecycle
                status.
              </p>

              <p className="mt-5 text-sm font-semibold text-slate-300 group-hover:text-sky-300">
                Open module &gt;
              </p>
            </Link>
            )}

            {canReadAcademicStructure && (
              <Link
                href="/school/academic-structure"
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-500/40 hover:bg-slate-900/90"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
                  Academic Structure
                </p>

                <h3 className="mt-3 text-xl font-semibold group-hover:text-sky-200">
                  Education &amp; Class Levels
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Define the education levels and class levels that form the
                  school&apos;s academic hierarchy.
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-300 group-hover:text-sky-300">
                  Open module &gt;
                </p>
              </Link>
            )}

            {canReadClasses && (
              <Link
                href="/school/classes"
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-500/40 hover:bg-slate-900/90"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
                  Academic Structure
                </p>

                <h3 className="mt-3 text-xl font-semibold group-hover:text-sky-200">
                  Classes
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Create and manage operational classes using the normalized
                  education-level and class-level structure.
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-300 group-hover:text-sky-300">
                  Open module &gt;
                </p>
              </Link>
            )}

            {canReadAdmissions && (
              <Link
                href="/school/admissions"
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-violet-500/40 hover:bg-slate-900/90"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">
                  Student Lifecycle
                </p>

                <h3 className="mt-3 text-xl font-semibold group-hover:text-violet-200">
                  Admissions
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Capture admission requests and move applicants through the
                  controlled admission workflow before canonical student
                  creation.
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-300 group-hover:text-violet-300">
                  Open module &gt;
                </p>
              </Link>
            )}

            {canReadStudents && (
              <Link
                href="/school/students"
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-emerald-500/40 hover:bg-slate-900/90"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
                  Student Operations
                </p>

                <h3 className="mt-3 text-xl font-semibold group-hover:text-emerald-200">
                  Students
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Maintain the master student entity independently from class
                  placement and enrollment history.
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-300 group-hover:text-emerald-300">
                  Open module &gt;
                </p>
              </Link>
            )}

            {canReadEnrollments && (
              <Link
                href="/school/enrollments"
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-emerald-500/40 hover:bg-slate-900/90"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
                  Student Lifecycle
                </p>

                <h3 className="mt-3 text-xl font-semibold group-hover:text-emerald-200">
                  Enrollments
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Connect a student to a class and academic period while
                  preserving historical movement over time.
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-300 group-hover:text-emerald-300">
                  Open module &gt;
                </p>
              </Link>
            )}

            {canReadAttendance && (
              <Link
                href="/school/attendance"
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-amber-500/40 hover:bg-slate-900/90"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">
                  Student Lifecycle
                </p>

                <h3 className="mt-3 text-xl font-semibold group-hover:text-amber-200">
                  Attendance
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Record daily attendance against canonical student
                  enrollments while preserving class and academic-period
                  context.
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-300 group-hover:text-amber-300">
                  Open module &gt;
                </p>
              </Link>
            )}
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Student Lifecycle
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Admission &gt; Student &gt; Enrollment &gt; Attendance
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Admission requests enter a controlled workflow before the
                canonical student record is created. Students then connect to
                classes and academic periods through enrollment history, with
                daily attendance recorded against that canonical context.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Workflow coverage
              </p>

              <p className="mt-2 font-semibold text-emerald-300">
                Student lifecycle routes connected
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Database behavior and deployment health have not been verified
                in this environment.
              </p>
            </div>
          </div>
        </section>

        {canReadFinance && (
          <section className="mb-10">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
                Financial Operations
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Fees &amp; Payments
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Define school charges, turn active fee structures into
                accountable student obligations, and control payment activity
                through the financial ledger.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Link
                href="/school/finance"
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500/40 hover:bg-slate-900/90"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
                  Financial Configuration
                </p>

                <h3 className="mt-3 text-xl font-semibold group-hover:text-cyan-200">
                  Fee Structures
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Define tuition and other school charges by academic period,
                  class, category, frequency, applicability, and due date.
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-300 group-hover:text-cyan-300">
                  Open module &gt;
                </p>
              </Link>

              <Link
                href="/school/finance/accounts"
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500/40 hover:bg-slate-900/90"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
                  Student Finance
                </p>

                <h3 className="mt-3 text-xl font-semibold group-hover:text-cyan-200">
                  Student Fee Accounts
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Turn active fee structures into student obligations while
                  preserving gross charges, approved support, payments, and
                  outstanding balances.
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-300 group-hover:text-cyan-300">
                  Open module &gt;
                </p>
              </Link>

              <Link
                href="/school/finance/payments"
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500/40 hover:bg-slate-900/90"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
                  Financial Operations
                </p>

                <h3 className="mt-3 text-xl font-semibold group-hover:text-cyan-200">
                  Payment Ledger
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Record payments as pending, confirm received funds, control
                  reversals, and preserve the payment trail against student
                  fee accounts.
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-300 group-hover:text-cyan-300">
                  Open module &gt;
                </p>
              </Link>
              <Link
                href="/school/finance/bursar"
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500/40 hover:bg-slate-900/90"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
                  Financial Operations
                </p>

                <h3 className="mt-3 text-xl font-semibold group-hover:text-cyan-200">
                  Bursar Queue
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Work outstanding student fee accounts by due date, balance,
                  overdue state, and next financial action.
                </p>

                <p className="mt-5 text-sm font-semibold text-slate-300 group-hover:text-cyan-300">
                  Open module &gt;
                </p>
              </Link>
            </div>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/applications"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600 hover:bg-slate-800"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Applications
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Switch application
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Return to the applications assigned to this organization.
            </p>

            <p className="mt-4 text-sm font-semibold text-emerald-400">
              Open Applications &gt;
            </p>
          </Link>
        </section>

        <footer className="mt-10 border-t border-slate-800 pt-6 text-sm text-slate-500">
          SAKATA Operating Systems - School OS - {organization.name}
        </footer>
      </div>
    </main>
  );
}
