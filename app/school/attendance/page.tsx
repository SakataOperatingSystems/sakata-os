import Link from "next/link";
import {
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import {
  createAttendance,
  updateAttendance,
} from "./actions";
import AttendanceForm from "./form";

const STATUS_STYLES: Record<string, string> = {
  present:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  absent:
    "border-red-500/30 bg-red-500/10 text-red-300",
  late:
    "border-amber-500/30 bg-amber-500/10 text-amber-300",
  excused:
    "border-blue-500/30 bg-blue-500/10 text-blue-300",
};

const STATUS_LABELS: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

export default async function AttendancePage() {
  await requirePermission("school.attendance.read");

  const { organization } = await getOrganizationContext();

  const canManage = await hasPermission(
    "school.attendance.manage"
  );

  const supabase = await createClient();

  const [
    { data: attendance, error: attendanceError },
    { data: enrollments, error: enrollmentsError },
  ] = await Promise.all([
    supabase
      .from("student_attendance")
      .select(
        "id, enrollment_id, attendance_date, status, notes, created_at, updated_at"
      )
      .eq("organization_id", organization.id)
      .order("attendance_date", { ascending: false })
      .order("created_at", { ascending: false }),

    supabase
      .from("student_enrollments")
      .select(
        `
        id,
        enrollment_date,
        status,
        student:students (
          student_id,
          full_name
        ),
        classItem:classes (
          name,
          code,
          stream
        ),
        academicPeriod:academic_periods (
          name,
          code,
          academic_year
        )
        `
      )
      .eq("organization_id", organization.id)
      .order("enrollment_date", { ascending: false }),
  ]);

  if (attendanceError) {
    throw new Error(
      `Failed to load attendance: ${attendanceError.message}`
    );
  }

  if (enrollmentsError) {
    throw new Error(
      `Failed to load enrollments: ${enrollmentsError.message}`
    );
  }

  const enrollmentMap = new Map(
    (enrollments ?? []).map((enrollment) => [
      enrollment.id,
      enrollment,
    ])
  );

  const presentCount =
    attendance?.filter(
      (item) => item.status === "present"
    ).length ?? 0;

  const absentCount =
    attendance?.filter(
      (item) => item.status === "absent"
    ).length ?? 0;

  const lateCount =
    attendance?.filter(
      (item) => item.status === "late"
    ).length ?? 0;

  const excusedCount =
    attendance?.filter(
      (item) => item.status === "excused"
    ).length ?? 0;

  const today = new Date().toISOString().slice(0, 10);

  const todayAttendance =
    attendance?.filter((item) => item.attendance_date === today) ?? [];

  const todayAttendanceByEnrollment = new Map(
    todayAttendance.map((item) => [item.enrollment_id, item])
  );

  const activeEnrollments =
    enrollments?.filter((item) => item.status === "active") ?? [];

  const missingToday = activeEnrollments.filter(
    (enrollment) => !todayAttendanceByEnrollment.has(enrollment.id)
  );

  const todayPresentCount = todayAttendance.filter(
    (item) => item.status === "present"
  ).length;

  const todayAbsentCount = todayAttendance.filter(
    (item) => item.status === "absent"
  ).length;

  const todayLateCount = todayAttendance.filter(
    (item) => item.status === "late"
  ).length;

  const todayExcusedCount = todayAttendance.filter(
    (item) => item.status === "excused"
  ).length;

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
              Student Attendance
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Record and maintain daily attendance against
              historical student enrollments.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
            {attendance?.length ?? 0}{" "}
            {attendance?.length === 1
              ? "attendance record"
              : "attendance records"}
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Total
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {attendance?.length ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Present
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">
              {presentCount}
            </p>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Absent
            </p>
            <p className="mt-2 text-2xl font-semibold text-red-300">
              {absentCount}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Late
            </p>
            <p className="mt-2 text-2xl font-semibold text-amber-300">
              {lateCount}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Excused
            </p>
            <p className="mt-2 text-2xl font-semibold text-blue-300">
              {excusedCount}
            </p>
          </div>
        </div>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Daily operations
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Today&apos;s attendance
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {today} · active enrollments requiring an attendance outcome
              </p>
            </div>
            <div className="text-sm text-slate-400">
              {missingToday.length} missing
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-6">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Active</p>
              <p className="mt-2 text-2xl font-semibold text-white">{activeEnrollments.length}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Recorded</p>
              <p className="mt-2 text-2xl font-semibold text-white">{todayAttendance.length}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-300">Missing</p>
              <p className="mt-2 text-2xl font-semibold text-amber-200">{missingToday.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-300">Present</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-200">{todayPresentCount}</p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-xs uppercase tracking-wide text-red-300">Absent</p>
              <p className="mt-2 text-2xl font-semibold text-red-200">{todayAbsentCount}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-300">Late / excused</p>
              <p className="mt-2 text-2xl font-semibold text-amber-200">{todayLateCount + todayExcusedCount}</p>
            </div>
          </div>

          {missingToday.length > 0 ? (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
              <div className="border-b border-slate-800 px-4 py-3">
                <h3 className="text-sm font-medium text-white">Missing attendance</h3>
              </div>
              <div className="divide-y divide-slate-800">
                {missingToday.map((enrollment) => {
                  const student = Array.isArray(enrollment.student)
                    ? enrollment.student[0]
                    : enrollment.student;
                  const classItem = Array.isArray(enrollment.classItem)
                    ? enrollment.classItem[0]
                    : enrollment.classItem;

                  return (
                    <div
                      key={enrollment.id}
                      className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {student?.full_name ?? "Unknown student"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {classItem?.name ?? "Unknown class"}
                        </p>
                      </div>
                      <Link
                        href={`/school/attendance?enrollment_id=${encodeURIComponent(enrollment.id)}#record-attendance`}
                        className="text-sm font-medium text-slate-300 hover:text-white"
                      >
                        Record attendance
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
              <p className="text-sm font-medium text-emerald-200">
                All active enrollments have attendance recorded for today.
              </p>
            </div>
          )}
        </section>

        {canManage && (
          <section id="record-attendance" className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5">
              <h2 className="text-lg font-medium">
                Record attendance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select an enrollment and record the student&apos;s
                attendance for a specific date.
              </p>
            </div>

            {enrollments?.length ? (
              <AttendanceForm
                action={createAttendance}
                enrollments={enrollments.map((enrollment) => ({
                  id: enrollment.id,
                  enrollmentDate:
                    enrollment.enrollment_date,
                  status: enrollment.status,
                  student: Array.isArray(enrollment.student)
                    ? enrollment.student[0] ?? null
                    : enrollment.student,
                  classItem: Array.isArray(
                    enrollment.classItem
                  )
                    ? enrollment.classItem[0] ?? null
                    : enrollment.classItem,
                  academicPeriod: Array.isArray(
                    enrollment.academicPeriod
                  )
                    ? enrollment.academicPeriod[0] ?? null
                    : enrollment.academicPeriod,
                }))}
              />
            ) : (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm text-amber-300">
                No enrollments are available. Create a student
                enrollment before recording attendance.
              </div>
            )}
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="font-medium">
              Attendance register
            </h2>
          </div>

          {!attendance?.length ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm text-slate-400">
                No attendance records have been created yet.
              </p>

              {!enrollments?.length && (
                <p className="mt-2 text-xs text-slate-500">
                  Create an enrollment before recording
                  attendance.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">
                      Date
                    </th>
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
                      Status
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Notes
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {attendance.map((item) => {
                    const enrollment = enrollmentMap.get(
                      item.enrollment_id
                    );

                    const student = enrollment?.student
                      ? Array.isArray(enrollment.student)
                        ? enrollment.student[0]
                        : enrollment.student
                      : null;

                    const classItem = enrollment?.classItem
                      ? Array.isArray(enrollment.classItem)
                        ? enrollment.classItem[0]
                        : enrollment.classItem
                      : null;

                    const academicPeriod =
                      enrollment?.academicPeriod
                        ? Array.isArray(
                            enrollment.academicPeriod
                          )
                          ? enrollment.academicPeriod[0]
                          : enrollment.academicPeriod
                        : null;

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-800/30"
                      >
                        <td className="px-6 py-4 text-slate-400">
                          {item.attendance_date}
                        </td>

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
                              ? `${classItem.code}${classItem.stream ? ` · ${classItem.stream}` : ""}`
                              : ""}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-slate-300">
                            {academicPeriod?.name ??
                              "Unknown period"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {academicPeriod
                              ? `${academicPeriod.academic_year} / ${academicPeriod.code}`
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
                            {STATUS_LABELS[item.status] ??
                              item.status}
                          </span>
                        </td>

                        <td className="max-w-[240px] px-6 py-4 text-slate-500">
                          {item.notes || "—"}
                        </td>

                        <td className="px-6 py-4">
                          {canManage && enrollment ? (
                            <details>
                              <summary className="cursor-pointer text-sm text-slate-300 hover:text-white">
                                Edit
                              </summary>

                              <div className="mt-4 min-w-[560px] rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                                <AttendanceForm
                                  action={updateAttendance}
                                  enrollments={
                                    enrollments.map(
                                      (enrollment) => ({
                                        id: enrollment.id,
                                        enrollmentDate:
                                          enrollment.enrollment_date,
                                        status:
                                          enrollment.status,
                                        student:
                                          Array.isArray(
                                            enrollment.student
                                          )
                                            ? enrollment
                                                .student[0] ??
                                              null
                                            : enrollment.student,
                                        classItem:
                                          Array.isArray(
                                            enrollment.classItem
                                          )
                                            ? enrollment
                                                .classItem[0] ??
                                              null
                                            : enrollment.classItem,
                                        academicPeriod:
                                          Array.isArray(
                                            enrollment.academicPeriod
                                          )
                                            ? enrollment
                                                .academicPeriod[0] ??
                                              null
                                            : enrollment.academicPeriod,
                                      })
                                    )
                                  }
                                  initialValues={{
                                    id: item.id,
                                    enrollmentId:
                                      item.enrollment_id,
                                    attendanceDate:
                                      item.attendance_date,
                                    status:
                                      item.status as
                                        | "present"
                                        | "absent"
                                        | "late"
                                        | "excused",
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
