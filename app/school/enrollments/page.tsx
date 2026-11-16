import Link from "next/link";
import {
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import {
  createEnrollment,
  updateEnrollment,
} from "./actions";
import EnrollmentForm from "./form";

const STATUS_STYLES: Record<string, string> = {
  active:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  completed:
    "border-slate-600 bg-slate-700/30 text-slate-300",
  withdrawn:
    "border-amber-500/30 bg-amber-500/10 text-amber-300",
  transferred:
    "border-blue-500/30 bg-blue-500/10 text-blue-300",
  cancelled:
    "border-red-500/30 bg-red-500/10 text-red-300",
};

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ student_id?: string }>;
}) {
  await requirePermission("school.enrollments.read");

  const resolvedSearchParams = await searchParams;
  const requestedStudentId =
    typeof resolvedSearchParams.student_id === "string"
      ? resolvedSearchParams.student_id.trim()
      : "";

  const { organization } = await getOrganizationContext();
  const canManage = await hasPermission(
    "school.enrollments.manage"
  );

  const supabase = await createClient();

  const [
    { data: enrollments, error: enrollmentsError },
    { data: students, error: studentsError },
    { data: classes, error: classesError },
    { data: academicPeriods, error: periodsError },
  ] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select(
        "id, student_id, class_id, academic_period_id, enrollment_date, exit_date, status, notes, created_at, updated_at"
      )
      .eq("organization_id", organization.id)
      .order("enrollment_date", { ascending: false })
      .order("created_at", { ascending: false }),

    supabase
      .from("students")
      .select("id, student_id, full_name")
      .eq("organization_id", organization.id)
      .order("full_name", { ascending: true }),

    supabase
      .from("classes")
      .select(
        "id, name, code, education_level, class_level, stream"
      )
      .eq("organization_id", organization.id)
      .order("class_level", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("academic_periods")
      .select(
        "id, name, code, academic_year, period_number"
      )
      .eq("organization_id", organization.id)
      .order("academic_year", { ascending: false })
      .order("period_number", { ascending: true }),
  ]);

  if (enrollmentsError) {
    throw new Error(
      `Failed to load enrollments: ${enrollmentsError.message}`
    );
  }

  if (studentsError) {
    throw new Error(
      `Failed to load students: ${studentsError.message}`
    );
  }

  if (classesError) {
    throw new Error(
      `Failed to load classes: ${classesError.message}`
    );
  }

  if (periodsError) {
    throw new Error(
      `Failed to load academic periods: ${periodsError.message}`
    );
  }

  const studentMap = new Map(
    (students ?? []).map((student) => [
      student.id,
      student,
    ])
  );

  const classMap = new Map(
    (classes ?? []).map((item) => [
      item.id,
      item,
    ])
  );

  const periodMap = new Map(
    (academicPeriods ?? []).map((period) => [
      period.id,
      period,
    ])
  );

  const initialStudentId =
    requestedStudentId &&
    (students ?? []).some(
      (student) => student.id === requestedStudentId
    )
      ? requestedStudentId
      : "";

  const activeCount =
    enrollments?.filter(
      (item) => item.status === "active"
    ).length ?? 0;

  const completedCount =
    enrollments?.filter(
      (item) => item.status === "completed"
    ).length ?? 0;

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
              Student Enrollments
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Connect students to classes and academic periods
              while preserving enrollment history.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
            {enrollments?.length ?? 0}{" "}
            {enrollments?.length === 1
              ? "enrollment"
              : "enrollments"}
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Total enrollments
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {enrollments?.length ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Active
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Completed
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-300">
              {completedCount}
            </p>
          </div>
        </div>

        {canManage && (
          <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5">
              <h2 className="text-lg font-medium">
                Create enrollment
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Assign a student to a class within an academic
                period.
              </p>
            </div>

            <EnrollmentForm
              action={createEnrollment}
              students={students ?? []}
              classes={classes ?? []}
              academicPeriods={academicPeriods ?? []}
              initialStudentId={initialStudentId}
            />
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="font-medium">
              Enrollment register
            </h2>
          </div>

          {!enrollments?.length ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm text-slate-400">
                No student enrollments have been created yet.
              </p>

              {!students?.length && (
                <p className="mt-2 text-xs text-slate-500">
                  Create a student before creating an enrollment.
                </p>
              )}

              {!classes?.length && (
                <p className="mt-2 text-xs text-slate-500">
                  Create a class before creating an enrollment.
                </p>
              )}

              {!academicPeriods?.length && (
                <p className="mt-2 text-xs text-slate-500">
                  Create an academic period before creating an
                  enrollment.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">
                      Student
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Class
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Academic period
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Enrollment date
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Exit date
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Status
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Next action
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {enrollments.map((item) => {
                    const student = studentMap.get(
                      item.student_id
                    );

                    const classItem = classMap.get(
                      item.class_id
                    );

                    const period = periodMap.get(
                      item.academic_period_id
                    );

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-800/30"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">
                            {student?.full_name ??
                              "Unknown student"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {student?.student_id ?? ""}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-slate-300">
                            {classItem?.name ??
                              "Unknown class"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {classItem
                              ? `${classItem.code} · ${classItem.class_level}${classItem.stream ? ` · ${classItem.stream}` : ""}`
                              : ""}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-slate-300">
                            {period?.name ??
                              "Unknown period"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {period
                              ? `${period.academic_year} / ${period.code}`
                              : ""}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {item.enrollment_date}
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {item.exit_date || "—"}
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
  {item.status === "active" ? (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/school/attendance"
        className="text-sm font-medium text-slate-300 hover:text-white"
      >
        Record attendance
      </Link>

      <Link
        href={`/school/finance/accounts?student_id=${encodeURIComponent(
          item.student_id,
        )}&enrollment_id=${encodeURIComponent(item.id)}`}
        className="inline-flex items-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-200"
      >
        Finance readiness
      </Link>
    </div>
  ) : (
    <span className="text-sm text-slate-500">Closed</span>
  )}
</td>

                        <td className="px-6 py-4">
                          {canManage ? (
                            <details>
                              <summary className="cursor-pointer text-sm text-slate-300 hover:text-white">
                                Edit
                              </summary>

                              <div className="mt-4 min-w-[560px] rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                                <EnrollmentForm
                                  action={updateEnrollment}
                                  students={students ?? []}
                                  classes={classes ?? []}
                                  academicPeriods={
                                    academicPeriods ?? []
                                  }
                                  initialValues={{
                                    id: item.id,
                                    studentId:
                                      item.student_id,
                                    classId:
                                      item.class_id,
                                    academicPeriodId:
                                      item.academic_period_id,
                                    enrollmentDate:
                                      item.enrollment_date,
                                    exitDate:
                                      item.exit_date ?? "",
                                    status:
                                      item.status as
                                        | "active"
                                        | "completed"
                                        | "withdrawn"
                                        | "transferred"
                                        | "cancelled",
                                    notes:
                                      item.notes ?? "",
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