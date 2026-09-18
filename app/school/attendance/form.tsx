"use client";

import { useActionState } from "react";
import type {
  AttendanceActionState,
} from "./actions";
import type {
  AttendanceStatus,
} from "./validation";

type EnrollmentOption = {
  id: string;
  enrollmentDate: string;
  status: string;
  student: {
    student_id: string;
    full_name: string;
  } | null;
  classItem: {
    name: string;
    code: string;
    stream: string | null;
  } | null;
  academicPeriod: {
    name: string;
    code: string;
    academic_year: number;
  } | null;
};

type AttendanceFormProps = {
  action: (
    previousState: AttendanceActionState,
    formData: FormData
  ) => Promise<AttendanceActionState>;
  enrollments: EnrollmentOption[];
  initialValues?: {
    id: string;
    enrollmentId: string;
    attendanceDate: string;
    status: AttendanceStatus;
    notes: string;
  };
};

const STATUS_OPTIONS: Array<{
  value: AttendanceStatus;
  label: string;
}> = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

const INITIAL_STATE: AttendanceActionState = {
  success: false,
  error: null,
};

function formatEnrollment(
  enrollment: EnrollmentOption
): string {
  const student = enrollment.student
    ? `${enrollment.student.full_name} — ${enrollment.student.student_id}`
    : "Unknown student";

  const className = enrollment.classItem
    ? `${enrollment.classItem.name} — ${enrollment.classItem.code}${enrollment.classItem.stream ? ` — ${enrollment.classItem.stream}` : ""}`
    : "Unknown class";

  const period = enrollment.academicPeriod
    ? `${enrollment.academicPeriod.name} — ${enrollment.academicPeriod.academic_year} / ${enrollment.academicPeriod.code}`
    : "Unknown academic period";

  return `${student} | ${className} | ${period}`;
}

export default function AttendanceForm({
  action,
  enrollments,
  initialValues,
}: AttendanceFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_STATE
  );

  return (
    <form action={formAction} className="space-y-5">
      {initialValues && (
        <input
          type="hidden"
          name="id"
          value={initialValues.id}
        />
      )}

      <div>
        <label
          htmlFor="enrollment_id"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          Student enrollment
        </label>

        <select
          id="enrollment_id"
          name="enrollment_id"
          defaultValue={initialValues?.enrollmentId ?? ""}
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
        >
          <option value="">Select enrollment</option>

          {enrollments.map((enrollment) => (
            <option key={enrollment.id} value={enrollment.id}>
              {formatEnrollment(enrollment)}
            </option>
          ))}
        </select>

        <p className="mt-2 text-xs text-slate-500">
          Enrollment determines the student, class and academic
          period context for this attendance record.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="attendance_date"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Attendance date
          </label>

          <input
            id="attendance_date"
            name="attendance_date"
            type="date"
            defaultValue={
              initialValues?.attendanceDate ??
              new Date().toISOString().slice(0, 10)
            }
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="status"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Attendance status
          </label>

          <select
            id="status"
            name="status"
            defaultValue={initialValues?.status ?? "present"}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          Notes
        </label>

        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initialValues?.notes ?? ""}
          placeholder="Optional attendance note"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500"
        />
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {state.error}
        </div>
      )}

      {state.success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          Attendance saved successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "Saving..."
          : initialValues
            ? "Update attendance"
            : "Record attendance"}
      </button>
    </form>
  );
}
