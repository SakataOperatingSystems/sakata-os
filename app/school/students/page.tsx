import Link from "next/link";
import {
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import { createStudent, updateStudent } from "./actions";
import StudentForm from "./form";

const STATUS_STYLES: Record<string, string> = {
  active:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  inactive:
    "border-slate-600 bg-slate-700/30 text-slate-300",
  graduated:
    "border-blue-500/30 bg-blue-500/10 text-blue-300",
  withdrawn:
    "border-amber-500/30 bg-amber-500/10 text-amber-300",
  transferred:
    "border-purple-500/30 bg-purple-500/10 text-purple-300",
  deceased:
    "border-red-500/30 bg-red-500/10 text-red-300",
};

export default async function StudentsPage() {
  await requirePermission("school.students.read");

  const { organization } = await getOrganizationContext();
  const canManage = await hasPermission("school.students.manage");

  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from("students")
    .select(
      "id, student_id, full_name, gender, date_of_birth, admission_date, nin, status, welfare_status, location, notes, created_at, updated_at"
    )
    .eq("organization_id", organization.id)
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load students: ${error.message}`);
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/school"
            className="text-sm text-slate-500 transition hover:text-slate-300"
          >
            Back to School OS
          </Link>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                School OS
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Students
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Master student records for the organization. Enrollment,
                academic participation, attendance, results, welfare and
                financial activity connect to this student identity.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
              {students?.length ?? 0}{" "}
              {students?.length === 1 ? "student" : "students"}
            </div>
          </div>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Student master
            </p>

            <p className="mt-2 text-lg font-medium text-white">
              Single source of identity
            </p>

            <p className="mt-2 text-sm text-slate-500">
              One student record anchors the student's operational lifecycle.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Academic connection
            </p>

            <p className="mt-2 text-lg font-medium text-white">
              Enrollment follows identity
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Class and academic-period participation is kept separate from
              the master student record.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Access
            </p>

            <p className="mt-2 text-lg font-medium text-white">
              {canManage ? "Management enabled" : "Read only"}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Access is controlled by School OS permissions.
            </p>
          </div>
        </section>

        {canManage && (
          <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5">
              <h2 className="text-lg font-medium">
                Register student
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Create the master student record. Academic enrollment is
                connected separately.
              </p>
            </div>

            <StudentForm action={createStudent} />
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="font-medium">Student register</h2>

            <p className="mt-1 text-xs text-slate-500">
              Organization-scoped master student records.
            </p>
          </div>

          {!students?.length ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-slate-400">
                No students have been registered yet.
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {canManage
                  ? "Use the registration form above to create the first master student record."
                  : "The student register is ready for the first master student record."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Student</th>
                    <th className="px-6 py-4 font-medium">Student ID</th>
                    <th className="px-6 py-4 font-medium">Gender</th>
                    <th className="px-6 py-4 font-medium">
                      Date of birth
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Admission
                    </th>
                    <th className="px-6 py-4 font-medium">Welfare</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="transition hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">
                          {student.full_name}
                        </div>

                        {student.location && (
                          <div className="mt-1 text-xs text-slate-500">
                            {student.location}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        {student.student_id}
                      </td>

                      <td className="px-6 py-4 text-slate-300">
                        {student.gender || "Not recorded"}
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {student.date_of_birth || "Not recorded"}
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {student.admission_date || "Not recorded"}
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {student.welfare_status || "Not recorded"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            STATUS_STYLES[student.status] ??
                            "border-slate-700 bg-slate-800 text-slate-300"
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {canManage ? (
                          <details>
                            <summary className="cursor-pointer text-sm text-slate-300 hover:text-white">
                              Edit
                            </summary>

                            <div className="mt-4 min-w-[700px] rounded-xl border border-slate-800 bg-slate-950/70 p-5">
                              <StudentForm
                                action={updateStudent}
                                initialValues={{
                                  id: student.id,
                                  studentId: student.student_id,
                                  fullName: student.full_name,
                                  gender: student.gender ?? "",
                                  dateOfBirth:
                                    student.date_of_birth ?? "",
                                  admissionDate:
                                    student.admission_date ?? "",
                                  nin: student.nin ?? "",
                                  status: student.status,
                                  welfareStatus:
                                    student.welfare_status ?? "",
                                  location: student.location ?? "",
                                  notes: student.notes ?? "",
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}