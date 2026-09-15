import Link from "next/link";
import {
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import { createClass, updateClass } from "./actions";
import ClassForm from "./form";

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

export default async function ClassesPage() {
  await requirePermission("school.classes.read");

  const { organization } = await getOrganizationContext();
  const canManage = await hasPermission("school.classes.manage");

  const supabase = await createClient();

  const [
    { data: classes, error: classesError },
    { data: academicPeriods, error: periodsError },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select(
        "id, academic_period_id, name, code, education_level, class_level, stream, status, created_at, updated_at"
      )
      .eq("organization_id", organization.id)
      .order("academic_period_id", { ascending: false })
      .order("class_level", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("academic_periods")
      .select(
        "id, name, code, academic_year, period_number, status"
      )
      .eq("organization_id", organization.id)
      .order("academic_year", { ascending: false })
      .order("period_number", { ascending: true }),
  ]);

  if (classesError) {
    throw new Error(`Failed to load classes: ${classesError.message}`);
  }

  if (periodsError) {
    throw new Error(
      `Failed to load academic periods: ${periodsError.message}`
    );
  }

  const periodMap = new Map(
    (academicPeriods ?? []).map((period) => [period.id, period])
  );

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/school"
              className="text-sm text-slate-500 transition hover:text-slate-300"
            >
              Back to School OS
            </Link>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Classes
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Manage academic classes within their academic periods.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
            {classes?.length ?? 0}{" "}
            {classes?.length === 1 ? "class" : "classes"}
          </div>
        </div>

        {canManage && (
          <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5">
              <h2 className="text-lg font-medium">Create class</h2>
              <p className="mt-1 text-sm text-slate-500">
                Create a class for an existing academic period.
              </p>
            </div>

            <ClassForm
              action={createClass}
              academicPeriods={academicPeriods ?? []}
            />
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="font-medium">Class register</h2>
          </div>

          {!classes?.length ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm text-slate-400">
                No classes have been created yet.
              </p>

              {!academicPeriods?.length && (
                <p className="mt-2 text-xs text-slate-500">
                  Create an academic period before creating a class.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Class</th>
                    <th className="px-6 py-4 font-medium">Code</th>
                    <th className="px-6 py-4 font-medium">Level</th>
                    <th className="px-6 py-4 font-medium">Stream</th>
                    <th className="px-6 py-4 font-medium">
                      Academic period
                    </th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {classes.map((item) => {
                    const period = periodMap.get(item.academic_period_id);

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-800/30"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">
                            {item.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {item.education_level} / {item.class_level}
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono text-xs text-slate-300">
                          {item.code}
                        </td>

                        <td className="px-6 py-4 text-slate-300">
                          {item.class_level}
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {item.stream || "None"}
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-slate-300">
                            {period?.name || "Unknown period"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {period
                              ? `${period.academic_year} / ${period.code}`
                              : ""}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                              STATUS_STYLES[item.status] ??
                              "border-slate-700 bg-slate-800 text-slate-300"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {canManage ? (
                            <details>
                              <summary className="cursor-pointer text-sm text-slate-300 hover:text-white">
                                Edit
                              </summary>

                              <div className="mt-4 min-w-[520px] rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                                <ClassForm
                                  action={updateClass}
                                  academicPeriods={academicPeriods ?? []}
                                  initialValues={{
                                    id: item.id,
                                    academicPeriodId:
                                      item.academic_period_id,
                                    name: item.name,
                                    code: item.code,
                                    educationLevel:
                                      item.education_level,
                                    classLevel: item.class_level,
                                    stream: item.stream ?? "",
                                    status: item.status,
                                  }}
                                />
                              </div>
                            </details>
                          ) : (
                            <span className="text-xs text-slate-600">
                              Read only
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}