import Link from "next/link";
import {
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import {
  createAcademicPeriod,
  updateAcademicPeriod,
} from "./actions";
import AcademicPeriodForm from "./form";

const STATUS_STYLES: Record<string, string> = {
  planned:
    "border-amber-500/30 bg-amber-500/10 text-amber-300",
  active:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  closed:
    "border-slate-600 bg-slate-700/30 text-slate-300",
  cancelled:
    "border-red-500/30 bg-red-500/10 text-red-300",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default async function AcademicPeriodsPage() {
  await requirePermission("school.academic_periods.read");

  const { organization } = await getOrganizationContext();
  const canManage = await hasPermission("school.academic_periods.manage");

  const supabase = await createClient();

  const { data: academicPeriods, error } = await supabase
    .from("academic_periods")
    .select(
      "id, name, code, academic_year, period_number, start_date, end_date, status"
    )
    .eq("organization_id", organization.id)
    .order("academic_year", { ascending: false })
    .order("period_number", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to load academic periods: ${error.message}`
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/school"
            className="text-sm text-slate-500 transition hover:text-slate-300"
          >
            ← School OS
          </Link>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
              School OS
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Academic Periods
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Define and manage the academic periods used by the school
              operating system.
            </p>
          </div>
        </div>

        {canManage ? (
          <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="mb-5">
              <h2 className="text-base font-semibold">
                Create Academic Period
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Add a new academic period to this organization.
              </p>
            </div>

            <AcademicPeriodForm
              action={createAcademicPeriod}
              mode="create"
            />
          </section>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 shadow-xl">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-base font-semibold">
              Academic Period Register
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {academicPeriods?.length ?? 0} academic period
              {(academicPeriods?.length ?? 0) === 1 ? "" : "s"} recorded.
            </p>
          </div>

          {academicPeriods && academicPeriods.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Period</th>
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Academic Year</th>
                    <th className="px-6 py-4">Dates</th>
                    <th className="px-6 py-4">Status</th>
                    {canManage ? (
                      <th className="px-6 py-4">Actions</th>
                    ) : null}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {academicPeriods.map((period) => (
                    <tr
                      key={period.id}
                      className="align-top transition hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-5">
                        <p className="font-medium text-slate-200">
                          {period.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Period {period.period_number}
                        </p>
                      </td>

                      <td className="px-6 py-5 font-mono text-xs text-slate-300">
                        {period.code}
                      </td>

                      <td className="px-6 py-5 text-slate-300">
                        {period.academic_year}
                      </td>

                      <td className="px-6 py-5 whitespace-nowrap text-xs text-slate-400">
                        {formatDate(period.start_date)}
                        <span className="mx-2 text-slate-600">→</span>
                        {formatDate(period.end_date)}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            STATUS_STYLES[period.status] ??
                            "border-slate-700 bg-slate-800 text-slate-300"
                          }`}
                        >
                          {period.status}
                        </span>
                      </td>

                      {canManage ? (
                        <td className="px-6 py-5">
                          <details className="group">
                            <summary className="cursor-pointer text-sm font-medium text-sky-400 transition hover:text-sky-300">
                              Edit
                            </summary>

                            <div className="mt-4 w-[420px] max-w-full rounded-lg border border-slate-700 bg-slate-950 p-4">
                              <AcademicPeriodForm
                                action={updateAcademicPeriod}
                                mode="edit"
                                initialValues={{
                                  id: period.id,
                                  name: period.name,
                                  code: period.code,
                                  academicYear: period.academic_year,
                                  periodNumber: period.period_number,
                                  startDate: period.start_date,
                                  endDate: period.end_date,
                                  status: period.status,
                                }}
                              />
                            </div>
                          </details>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-300">
                No academic periods yet.
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Create the first academic period using the form above.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}