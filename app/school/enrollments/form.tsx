"use client";

import { useActionState } from "react";
import type {
  EnrollmentActionState,
} from "./actions";
import type {
  EnrollmentStatus,
} from "./validation";

type StudentOption = {
  id: string;
  student_id: string;
  full_name: string;
};

type ClassOption = {
  id: string;
  name: string;
  code: string;
  education_level: string;
  class_level: string;
  stream: string | null;
};

type AcademicPeriodOption = {
  id: string;
  name: string;
  code: string;
  academic_year: number;
  period_number: number;
};

type EnrollmentFormProps = {
  action: (
    previousState: EnrollmentActionState,
    formData: FormData
  ) => Promise<EnrollmentActionState>;
  students: StudentOption[];
  classes: ClassOption[];
  academicPeriods: AcademicPeriodOption[];
  initialStudentId?: string;
  initialValues?: {
    id: string;
    studentId: string;
    classId: string;
    academicPeriodId: string;
    enrollmentDate: string;
    exitDate: string;
    status: EnrollmentStatus;
    notes: string;
  };
};

const STATUS_OPTIONS: Array<{
  value: EnrollmentStatus;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "transferred", label: "Transferred" },
  { value: "cancelled", label: "Cancelled" },
];

const INITIAL_STATE: EnrollmentActionState = {
  success: false,
  error: null,
};

export default function EnrollmentForm({
  action,
  students,
  classes,
  academicPeriods,
  initialStudentId,
  initialValues,
}: EnrollmentFormProps) {
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

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="student_id"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Student
          </label>

          <select
            id="student_id"
            name="student_id"
            defaultValue={initialValues?.studentId ?? initialStudentId ?? ""}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
          >
            <option value="">Select student</option>

            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name} — {student.student_id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="class_id"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Class
          </label>

          <select
            id="class_id"
            name="class_id"
            defaultValue={initialValues?.classId ?? ""}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
          >
            <option value="">Select class</option>

            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {item.code}
                {item.stream ? ` — ${item.stream}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="academic_period_id"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Academic period
          </label>

          <select
            id="academic_period_id"
            name="academic_period_id"
            defaultValue={initialValues?.academicPeriodId ?? ""}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
          >
            <option value="">Select academic period</option>

            {academicPeriods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} — {period.academic_year} / {period.code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="status"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Status
          </label>

          <select
            id="status"
            name="status"
            defaultValue={initialValues?.status ?? "active"}
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

        <div>
          <label
            htmlFor="enrollment_date"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Enrollment date
          </label>

          <input
            id="enrollment_date"
            name="enrollment_date"
            type="date"
            defaultValue={
              initialValues?.enrollmentDate ??
              new Date().toISOString().slice(0, 10)
            }
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="exit_date"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Exit date
          </label>

          <input
            id="exit_date"
            name="exit_date"
            type="date"
            defaultValue={initialValues?.exitDate ?? ""}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
          />
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
          placeholder="Optional operational notes"
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
          Enrollment saved successfully.
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
            ? "Update enrollment"
            : "Create enrollment"}
      </button>
    </form>
  );
}