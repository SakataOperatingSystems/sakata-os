"use client";

import { useActionState } from "react";
import type { StudentActionState } from "./actions";

type StudentFormProps = {
  action: (
    previousState: StudentActionState,
    formData: FormData
  ) => Promise<StudentActionState>;
  initialValues?: {
    id: string;
    studentId: string;
    fullName: string;
    gender: string;
    dateOfBirth: string;
    admissionDate: string;
    nin: string;
    status: string;
    welfareStatus: string;
    location: string;
    notes: string;
  };
};

const STUDENT_STATUSES = [
  "active",
  "inactive",
  "graduated",
  "withdrawn",
  "transferred",
  "deceased",
] as const;

export default function StudentForm({
  action,
  initialValues,
}: StudentFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    success: false,
    error: null,
  });

  return (
    <form action={formAction} className="space-y-6">
      {initialValues?.id && (
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
            Student ID
          </label>

          <input
            id="student_id"
            name="student_id"
            type="text"
            required
            defaultValue={initialValues?.studentId ?? ""}
            placeholder="e.g. STU-001"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
          />
        </div>

        <div>
          <label
            htmlFor="full_name"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Full name
          </label>

          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            defaultValue={initialValues?.fullName ?? ""}
            placeholder="Student full name"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
          />
        </div>

        <div>
          <label
            htmlFor="gender"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Gender
          </label>

          <select
            id="gender"
            name="gender"
            defaultValue={initialValues?.gender ?? ""}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
          >
            <option value="">Not recorded</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="unspecified">Unspecified</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="date_of_birth"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Date of birth
          </label>

          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            defaultValue={initialValues?.dateOfBirth ?? ""}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
          />
        </div>

        <div>
          <label
            htmlFor="admission_date"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Admission date
          </label>

          <input
            id="admission_date"
            name="admission_date"
            type="date"
            defaultValue={initialValues?.admissionDate ?? ""}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
          />
        </div>

        <div>
          <label
            htmlFor="nin"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            NIN
          </label>

          <input
            id="nin"
            name="nin"
            type="text"
            defaultValue={initialValues?.nin ?? ""}
            placeholder="National Identification Number"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
          />
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
            required
            defaultValue={initialValues?.status ?? "active"}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
          >
            {STUDENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="welfare_status"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Welfare / support status
          </label>

          <input
            id="welfare_status"
            name="welfare_status"
            type="text"
            defaultValue={initialValues?.welfareStatus ?? ""}
            placeholder="Optional"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
          />
        </div>

        <div>
          <label
            htmlFor="location"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Location
          </label>

          <input
            id="location"
            name="location"
            type="text"
            defaultValue={initialValues?.location ?? ""}
            placeholder="Optional"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
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
          rows={4}
          defaultValue={initialValues?.notes ?? ""}
          placeholder="Additional operational notes"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
        />
      </div>

      {state.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Student saved successfully.
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-5 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? "Saving..."
            : initialValues
              ? "Update student"
              : "Register student"}
        </button>
      </div>
    </form>
  );
}