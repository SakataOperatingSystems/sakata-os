import Link from "next/link";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";

export default async function SchoolHome() {
  await requirePermission("school.academic_periods.read");

  const { organization } = await getOrganizationContext();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-300">
          SCHOOL OPERATING SYSTEM
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          School Operations
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-400">
          Central operational workspace for managing the school&apos;s
          academic, administrative, financial, people, and operational
          processes.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300">
            {organization.name}
          </span>

          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            School OS Active
          </span>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold">Operations</h2>

          <p className="mt-1 text-slate-400">
            Manage the operational foundations of the school.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/school/academic-periods"
            className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-sky-300">
              Academic Structure
            </p>

            <h3 className="mt-3 text-xl font-semibold group-hover:text-sky-200">
              Academic Periods
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Define and control academic years, terms, periods, dates, and
              lifecycle status.
            </p>

            <p className="mt-5 text-sm font-medium text-slate-300">
              Open module →
            </p>
          </Link>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Coming next
            </p>

            <h3 className="mt-3 text-xl font-semibold text-slate-300">
              Classes
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Classes and academic structure will connect to the active
              academic periods.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Coming next
            </p>

            <h3 className="mt-3 text-xl font-semibold text-slate-300">
              Students
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Student records will be introduced after the academic structure
              foundation is established.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}