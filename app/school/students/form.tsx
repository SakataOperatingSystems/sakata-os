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

const STUDENT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "graduated", label: "Graduated" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "transferred", label: "Transferred" },
  { value: "deceased", label: "Deceased" },
] as const;

const GENDER_OPTIONS = [
  { value: "", label: "Not recorded" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unspecified", label: "Unspecified" },
] as const;

export default function StudentForm({
  action,
  initialValues,
}: StudentFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    success: false,
    error: null,
    studentId: null,
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

      {initialValues?.studentId && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Student ID
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-slate-200">
            {initialValues.studentId}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            System-managed identity
          </p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
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
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
            {STUDENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-300">
          <p className="font-semibold">
            Student saved successfully.
          </p>

          {state.studentId && (
            <p className="mt-2">
              Student ID:{" "}
              <span className="font-mono font-semibold">
                {state.studentId}
              </span>
            </p>
          )}
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
