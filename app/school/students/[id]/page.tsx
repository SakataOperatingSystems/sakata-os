import Link from "next/link";

import {
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

import {
  getStudentOperatorState,
  type StudentOperatorException,
} from "../operator-state";

type Student = {
  id: string;
  student_id: string;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  admission_request_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type Admission = {
  id: string;
  admission_request_id: string;
  applicant_name: string;
  status: string;
  requested_admission_date: string | null;
};

type Enrollment = {
  id: string;
  student_id: string;
  class_id: string;
  academic_period_id: string;
  enrollment_date: string;
  exit_date: string | null;
  status: string;
  notes: string | null;
};

type ClassItem = {
  id: string;
  name: string;
  code: string;
  stream: string | null;
};

type AcademicPeriod = {
  id: string;
  name: string;
  code: string;
  academic_year: string | number;
  period_number: number;
};

type Attendance = {
  id: string;
  enrollment_id: string;
  attendance_date: string;
  status: string;
  notes: string | null;
};

type FeeAccount = {
  id: string;
  student_id: string;
  academic_period_id: string;
  fee_structure_id: string;
  gross_required_amount: number | string;
  approved_support_amount: number | string;
  net_required_amount: number | string;
  confirmed_payments_amount: number | string;
  balance_amount: number | string;
  due_date: string | null;
  status: string;
};

type FeeStructure = {
  id: string;
  fee_item: string;
  fee_category: string;
};

const EXCEPTION_LABELS: Record<StudentOperatorException, string> = {
  inactive_student: "Student is inactive",
  no_active_enrollment: "No active enrollment",
  missing_attendance: "Missing today's attendance",
  outstanding_balance: "Outstanding balance",
  overdue_balance: "Overdue balance",
};

function money(value: number | string) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default async function Student360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("school.students.read");

  const { organization } = await getOrganizationContext();
  const supabase = await createClient();
  const { id } = await params;

  const canManageStudents = await hasPermission("school.students.manage");
  const canReadAdmissions = await hasPermission(
    "school.admission_requests.read",
  );
  const canReadEnrollments = await hasPermission("school.enrollments.read");
  const canReadAttendance = await hasPermission("school.attendance.read");
  const canReadFees = await hasPermission("school.fees.read");
  const canManageFees = await hasPermission("school.fees.manage");

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(
      "id, student_id, full_name, gender, date_of_birth, admission_request_id, status, created_at, updated_at",
    )
    .eq("organization_id", organization.id)
    .eq("id", id)
    .maybeSingle();

  if (studentError) {
    throw new Error(`Failed to load student: ${studentError.message}`);
  }

  if (!student) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/school/students"
            className="text-sm text-slate-400 hover:text-white"
          >
            Back to students
          </Link>
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h1 className="text-xl font-semibold">Student not found</h1>
            <p className="mt-2 text-sm text-slate-400">
              This student does not exist in the current organization.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const studentRow = student as Student;
  const today = new Date().toISOString().slice(0, 10);

  const [
    admissionResult,
    enrollmentResult,
    classResult,
    periodResult,
    attendanceResult,
    feeAccountResult,
    feeStructureResult,
  ] = await Promise.all([
    canReadAdmissions && studentRow.admission_request_id
      ? supabase
          .from("student_admission_requests")
          .select(
            "id, admission_request_id, applicant_name, status, requested_admission_date",
          )
          .eq("organization_id", organization.id)
          .eq("id", studentRow.admission_request_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    canReadEnrollments
      ? supabase
          .from("student_enrollments")
          .select(
            "id, student_id, class_id, academic_period_id, enrollment_date, exit_date, status, notes",
          )
          .eq("organization_id", organization.id)
          .eq("student_id", studentRow.id)
          .order("enrollment_date", { ascending: false })
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),

    canReadEnrollments
      ? supabase
          .from("classes")
          .select("id, name, code, stream")
          .eq("organization_id", organization.id)
      : Promise.resolve({ data: [], error: null }),

    canReadEnrollments
      ? supabase
          .from("academic_periods")
          .select("id, name, code, academic_year, period_number")
          .eq("organization_id", organization.id)
      : Promise.resolve({ data: [], error: null }),

    canReadAttendance
      ? supabase
          .from("student_attendance")
          .select(
            "id, enrollment_id, attendance_date, status, notes",
          )
          .eq("organization_id", organization.id)
          .eq("attendance_date", today)
      : Promise.resolve({ data: [], error: null }),

    canReadFees
      ? supabase
          .from("school_student_fee_accounts")
          .select(
            "id, student_id, academic_period_id, fee_structure_id, gross_required_amount, approved_support_amount, net_required_amount, confirmed_payments_amount, balance_amount, due_date, status",
          )
          .eq("organization_id", organization.id)
          .eq("student_id", studentRow.id)
          .order("due_date", {
            ascending: true,
            nullsFirst: false,
          })
      : Promise.resolve({ data: [], error: null }),

    canReadFees
      ? supabase
          .from("school_fee_structures")
          .select("id, fee_item, fee_category")
          .eq("organization_id", organization.id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (admissionResult.error) {
    throw new Error(
      `Failed to load admission context: ${admissionResult.error.message}`,
    );
  }

  if (enrollmentResult.error) {
    throw new Error(
      `Failed to load enrollment context: ${enrollmentResult.error.message}`,
    );
  }

  if (classResult.error) {
    throw new Error(`Failed to load classes: ${classResult.error.message}`);
  }

  if (periodResult.error) {
    throw new Error(
      `Failed to load academic periods: ${periodResult.error.message}`,
    );
  }

  if (attendanceResult.error) {
    throw new Error(
      `Failed to load attendance: ${attendanceResult.error.message}`,
    );
  }

  if (feeAccountResult.error) {
    throw new Error(
      `Failed to load fee accounts: ${feeAccountResult.error.message}`,
    );
  }

  if (feeStructureResult.error) {
    throw new Error(
      `Failed to load fee structures: ${feeStructureResult.error.message}`,
    );
  }

  const admission = admissionResult.data as Admission | null;
  const enrollments = (enrollmentResult.data ?? []) as Enrollment[];
  const classes = (classResult.data ?? []) as ClassItem[];
  const periods = (periodResult.data ?? []) as AcademicPeriod[];
  const attendance = (attendanceResult.data ?? []) as Attendance[];
  const feeAccounts = (feeAccountResult.data ?? []) as FeeAccount[];
  const feeStructures = (feeStructureResult.data ?? []) as FeeStructure[];

  const activeEnrollment =
    enrollments.find((item) => item.status === "active") ?? null;

  const classById = new Map(classes.map((item) => [item.id, item]));
  const periodById = new Map(periods.map((item) => [item.id, item]));
  const feeStructureById = new Map(
    feeStructures.map((item) => [item.id, item]),
  );

  const attendanceRecordedToday =
    activeEnrollment !== null &&
    attendance.some(
      (item) =>
        item.enrollment_id === activeEnrollment.id &&
        item.attendance_date === today,
    );

  const outstandingAccounts = feeAccounts.filter(
    (account) =>
      Number(account.balance_amount) > 0 &&
      account.status !== "closed",
  );

  const outstandingBalance = outstandingAccounts.reduce(
    (sum, account) => sum + Number(account.balance_amount),
    0,
  );

  const overdueAccounts = outstandingAccounts.filter(
    (account) =>
      account.due_date !== null &&
      account.due_date < today,
  );

  const operator = getStudentOperatorState({
    studentStatus: studentRow.status,
    hasActiveEnrollment: Boolean(activeEnrollment),
    attendanceRecordedToday,
    balance: outstandingBalance,
    isOverdue: overdueAccounts.length > 0,
  });

  const enrollmentClass = activeEnrollment
    ? classById.get(activeEnrollment.class_id)
    : undefined;

  const enrollmentPeriod = activeEnrollment
    ? periodById.get(activeEnrollment.academic_period_id)
    : undefined;

  const enrollmentLabel = activeEnrollment
    ? `${enrollmentClass?.name ?? "Class unavailable"}${
        enrollmentClass?.stream ? ` / ${enrollmentClass.stream}` : ""
      } / ${enrollmentPeriod?.name ?? "Period unavailable"}`
    : "No active enrollment";

  const exceptionLabels = operator.exceptions.map(
    (exception) => EXCEPTION_LABELS[exception],
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/school/students"
              className="text-sm text-slate-400 hover:text-white"
            >
              Back to students
            </Link>

            <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              School OS / Student 360
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              {studentRow.full_name}
            </h1>

            <p className="mt-2 font-mono text-sm text-slate-400">
              {studentRow.student_id}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Operating state
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {operator.nextAction}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {operator.exceptions.length} exception
              {operator.exceptions.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Identity
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="text-slate-200">{studentRow.full_name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Student ID</dt>
                <dd className="font-mono text-slate-200">
                  {studentRow.student_id}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Date of birth</dt>
                <dd className="text-slate-200">
                  {studentRow.date_of_birth ?? "Not recorded"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="text-slate-200">{studentRow.status}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Admission
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {admission?.admission_request_id ?? "No admission link"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {admission?.status ?? "No admission context"}
            </p>
            {admission?.requested_admission_date && (
              <p className="mt-3 text-xs text-slate-500">
                Requested date: {admission.requested_admission_date}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Current Enrollment
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {enrollmentLabel}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {activeEnrollment
                ? `Status: ${activeEnrollment.status}`
                : "No active enrollment"}
            </p>

            {activeEnrollment && (
              <p className="mt-3 text-xs text-slate-500">
                Started: {activeEnrollment.enrollment_date}
              </p>
            )}

            {!activeEnrollment &&
              canManageStudents &&
              canReadEnrollments && (
                <Link
                  href={`/school/enrollments?student_id=${encodeURIComponent(
                    studentRow.id,
                  )}`}
                  className="mt-4 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-slate-200"
                >
                  Create enrollment
                </Link>
              )}
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Attendance
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {activeEnrollment
                ? attendanceRecordedToday
                  ? "Today's attendance is recorded"
                  : "Today's attendance is missing"
                : "Requires active enrollment"}
            </p>

            {activeEnrollment && !attendanceRecordedToday && (
              <Link
                href={`/school/attendance?enrollment_id=${encodeURIComponent(
                  activeEnrollment.id,
                )}#record-attendance`}
                className="mt-4 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-slate-200"
              >
                {"Record today's attendance"}
              </Link>
            )}

            {attendanceRecordedToday && (
              <p className="mt-3 text-xs text-emerald-400">
                Attendance saved for today.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Finance
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {feeAccounts.length} fee account
                  {feeAccounts.length === 1 ? "" : "s"}
                </p>
              </div>

              {canReadFees && (
                <Link
                  href={`/school/finance/accounts?student_id=${encodeURIComponent(
                    studentRow.id,
                  )}`}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white"
                >
                  Open fee accounts
                </Link>
              )}
            </div>

            {outstandingAccounts.length === 0 ? (
              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-sm text-slate-300">
                  No outstanding balance.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {feeAccounts.length > 0
                    ? "Existing fee accounts are currently settled."
                    : "No fee account has been established for this student."}
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Outstanding</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {money(outstandingBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Accounts</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {outstandingAccounts.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Overdue</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {overdueAccounts.length}
                  </p>
                </div>
              </div>
            )}

            {outstandingAccounts.length > 0 && (
              <div className="mt-5 space-y-3">
                {outstandingAccounts.map((account) => {
                  const structure = feeStructureById.get(
                    account.fee_structure_id,
                  );

                  return (
                    <div
                      key={account.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {structure?.fee_item ?? "Fee account"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {structure?.fee_category ?? "Finance"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-500">Balance</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {money(account.balance_amount)}
                          </p>
                        </div>
                      </div>

                      {canManageFees && (
                        <Link
                          href={`/school/finance/payments?account_id=${encodeURIComponent(
                            account.id,
                          )}`}
                          className="mt-3 inline-flex rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-slate-200"
                        >
                          Record payment
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-amber-900/50 bg-amber-950/20 p-5">
            <p className="text-xs uppercase tracking-wide text-amber-500">
              Exceptions
            </p>

            {exceptionLabels.length === 0 ? (
              <p className="mt-3 text-sm text-emerald-400">
                No exceptions. Student record is operational.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {exceptionLabels.map((label) => (
                  <li
                    key={label}
                    className="rounded-lg border border-amber-900/40 bg-slate-950/30 px-3 py-2 text-sm text-amber-200"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Next action
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {operator.nextAction}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              State is calculated from student status, enrollment, today&apos;s
              attendance and confirmed financial balance.
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Student record
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Created {studentRow.created_at.slice(0, 10)} · Updated{" "}
                {studentRow.updated_at.slice(0, 10)}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {canReadEnrollments && (
                <Link
                  href={`/school/enrollments?student_id=${encodeURIComponent(
                    studentRow.id,
                  )}`}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white"
                >
                  Open enrollments
                </Link>
              )}

              {activeEnrollment && canReadAttendance && (
                <Link
                  href={`/school/attendance?enrollment_id=${encodeURIComponent(
                    activeEnrollment.id,
                  )}#record-attendance`}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white"
                >
                  Open attendance
                </Link>
              )}

              {canReadFees && (
                <Link
                  href={`/school/finance/accounts?student_id=${encodeURIComponent(
                    studentRow.id,
                  )}`}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white"
                >
                  Open finance
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

