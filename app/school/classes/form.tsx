"use client";

import { useActionState } from "react";

type AcademicPeriod = {
  id: string;
  name: string;
  code: string;
  academic_year: number;
  period_number: number;
  status: string;
};

type InitialValues = {
  id: string;
  academicPeriodId: string;
  name: string;
  code: string;
  educationLevel: string;
  classLevel: string;
  stream: string;
  status: string;
};

type ClassFormProps = {
  action: (
    previousState: {
      success: boolean;
      error: string | null;
    },
    formData: FormData
  ) => Promise<{
    success: boolean;
    error: string | null;
  }>;
  academicPeriods: AcademicPeriod[];
  initialValues?: InitialValues;
};

const initialState = {
  success: false,
  error: null,
};

export default function ClassForm({
  action,
  academicPeriods,
  initialValues,
}: ClassFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialState
  );

  const isEditing = Boolean(initialValues);

  return (
    <form action={formAction} className="space-y-5">
      {isEditing && (
        <input
          type="hidden"
          name="id"
          value={initialValues?.id ?? ""}
        />
      )}

      <div className="grid gap-5 md:grid-cols-2">
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
                {period.name} / {period.academic_year} / {period.code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Class name
          </label>

          <input
            id="name"
            name="name"
            type="text"
            defaultValue={initialValues?.name ?? ""}
            placeholder="P1 A"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="code"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Class code
          </label>

          <input
            id="code"
            name="code"
            type="text"
            defaultValue={initialValues?.code ?? ""}
            placeholder="P1-A"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm uppercase text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
          />

          <p className="mt-1 text-xs text-slate-600">
            Use uppercase letters, numbers, and hyphens.
          </p>
        </div>

        <div>
          <label
            htmlFor="education_level"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Education level
          </label>

          <input
            id="education_level"
            name="education_level"
            type="text"
            defaultValue={initialValues?.educationLevel ?? ""}
            placeholder="Primary"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="class_level"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Class level
          </label>

          <input
            id="class_level"
            name="class_level"
            type="text"
            defaultValue={initialValues?.classLevel ?? ""}
            placeholder="P1"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="stream"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Stream
            <span className="ml-2 text-xs font-normal text-slate-600">
              optional
            </span>
          </label>

          <input
            id="stream"
            name="stream"
            type="text"
            defaultValue={initialValues?.stream ?? ""}
            placeholder="A"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
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
            defaultValue={initialValues?.status ?? "planned"}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-slate-500"
          >
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
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
          Class {isEditing ? "updated" : "created"} successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={pending || academicPeriods.length === 0}
        className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? isEditing
            ? "Updating..."
            : "Creating..."
          : isEditing
            ? "Update class"
            : "Create class"}
      </button>
    </form>
  );
}