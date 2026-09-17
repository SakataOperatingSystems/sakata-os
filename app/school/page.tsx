import Link from "next/link";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";

export default async function SchoolHome() {
  await requirePermission("school.academic_periods.read");

  const { organization } = await getOrganizationContext();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-sky-400">
                SAKATA Operating Systems · Operating Application
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
              The current School OS foundation is being built around
              controlled academic structure and lifecycle.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Visible Operating Surfaces</p>

            <p className="mt-2 text-2xl font-bold">3</p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Academic periods, academic structure, and classes are currently
              available from this operating home.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Next Operating Domain</p>

            <p className="mt-2 text-2xl font-bold">Students</p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Student operations follow the established academic foundation.
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
              Establish the academic structure first, then build the student,
              teaching, assessment, and intelligence workflows on top of it.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                Open module →
              </p>
            </Link>

            <Link
              href="/school/academic-structure"
              className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-500/40 hover:bg-slate-900/90"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
                Academic Structure
              </p>

              <h3 className="mt-3 text-xl font-semibold group-hover:text-sky-200">
                Education & Class Levels
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Define the education levels and class levels that form the
                school&apos;s academic hierarchy.
              </p>

              <p className="mt-5 text-sm font-semibold text-slate-300 group-hover:text-sky-300">
                Open module →
              </p>
            </Link>

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
                Open module →
              </p>
            </Link>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Next Operating Domain
              </p>

              <h2 className="mt-2 text-2xl font-bold">Students</h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Student operations will connect people, admissions, enrollment,
                class placement, attendance, assessment, results, and later
                academic intelligence to the established academic foundation.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Status
              </p>

              <p className="mt-2 font-semibold text-slate-300">
                Foundation first
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Student operating surface comes next.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/control"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600 hover:bg-slate-800"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Platform
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              SAKATA Control Plane
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Return to the SAKATA Operating Systems platform control surface.
            </p>

            <p className="mt-4 text-sm font-semibold text-emerald-400">
              Open Control Plane →
            </p>
          </Link>

          <Link
            href="/control/configuration"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600 hover:bg-slate-800"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Configuration
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Configuration Center
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Inspect and manage the effective configuration of the
              organization&apos;s active product modules.
            </p>

            <p className="mt-4 text-sm font-semibold text-emerald-400">
              Open Configuration →
            </p>
          </Link>
        </section>

        <footer className="mt-10 border-t border-slate-800 pt-6 text-sm text-slate-500">
          SAKATA Operating Systems · School OS · {organization.name}
        </footer>
      </div>
    </main>
  );
}