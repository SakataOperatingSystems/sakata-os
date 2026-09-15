"use client";

import { useActionState } from "react";
import type { EducationLevelActionState } from "./education-level-actions";

type EducationLevelFormProps = {
  action: (
    previousState: EducationLevelActionState,
    formData: FormData
  ) => Promise<EducationLevelActionState>;
  initialValues?: {
    id?: string;
    code?: string;
    name?: string;
    displayOrder?: number;
    status?: string;
  };
};

const INITIAL_STATE: EducationLevelActionState = {
  success: false,
  message: "",
};

export default function EducationLevelForm({
  action,
  initialValues,
}: EducationLevelFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_STATE
  );

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-4">
      {initialValues?.id && (
        <input type="hidden" name="id" value={initialValues.id} />
      )}

      <div>
        <label
          htmlFor="education-level-code"
          className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500"
        >
          Code
        </label>

        <input
          id="education-level-code"
          name="code"
          defaultValue={initialValues?.code ?? ""}
          placeholder="PRIMARY"
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
        />
      </div>

      <div>
        <label
          htmlFor="education-level-name"
          className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500"
        >
          Name
        </label>

        <input
          id="education-level-name"
          name="name"
          defaultValue={initialValues?.name ?? ""}
          placeholder="Primary"
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
        />
      </div>

      <div>
        <label
          htmlFor="education-level-order"
          className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500"
        >
          Display order
        </label>

        <input
          id="education-level-order"
          name="displayOrder"
          type="number"
          min="0"
          step="1"
          defaultValue={initialValues?.displayOrder ?? 0}
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
        />
      </div>

      <div>
        <label
          htmlFor="education-level-status"
          className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500"
        >
          Status
        </label>

        <select
          id="education-level-status"
          name="status"
          defaultValue={initialValues?.status ?? "active"}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="md:col-span-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? "Saving..."
            : initialValues?.id
              ? "Update education level"
              : "Create education level"}
        </button>

        {state.message && (
          <p
            className={`text-sm ${
              state.success ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}