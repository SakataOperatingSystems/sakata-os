"use client";

import { useActionState } from "react";
import type {
  ClassLevelActionState,
} from "./class-level-actions";

type EducationLevelOption = {
  id: string;
  code: string;
  name: string;
};

type ClassLevelFormValues = {
  id?: string;
  educationLevelId: string;
  code: string;
  name: string;
  displayOrder: number;
  status: string;
};

type ClassLevelFormProps = {
  action: (
    previousState: ClassLevelActionState,
    formData: FormData
  ) => Promise<ClassLevelActionState>;
  educationLevels: EducationLevelOption[];
  initialValues?: ClassLevelFormValues;
};

const initialState: ClassLevelActionState = {
  success: false,
  message: "",
};

export default function ClassLevelForm({
  action,
  educationLevels,
  initialValues,
}: ClassLevelFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      {initialValues?.id && (
        <input type="hidden" name="id" value={initialValues.id} />
      )}

      <div>
        <label
          htmlFor="educationLevelId"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          Education Level
        </label>

        <select
          id="educationLevelId"
          name="educationLevelId"
          defaultValue={initialValues?.educationLevelId ?? ""}
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
        >
          <option value="">Select education level</option>

          {educationLevels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.name} ({level.code})
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="classLevelCode"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Class Level Code
          </label>

          <input
            id="classLevelCode"
            name="code"
            type="text"
            defaultValue={initialValues?.code ?? ""}
            placeholder="P1"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm uppercase text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
          />
        </div>

        <div>
          <label
            htmlFor="classLevelName"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Class Level Name
          </label>

          <input
            id="classLevelName"
            name="name"
            type="text"
            defaultValue={initialValues?.name ?? ""}
            placeholder="Primary 1"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="classLevelDisplayOrder"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Display Order
          </label>

          <input
            id="classLevelDisplayOrder"
            name="displayOrder"
            type="number"
            min="0"
            step="1"
            defaultValue={initialValues?.displayOrder ?? 0}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
          />
        </div>

        <div>
          <label
            htmlFor="classLevelStatus"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Status
          </label>

          <select
            id="classLevelStatus"
            name="status"
            defaultValue={initialValues?.status ?? "active"}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {state.message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.success
              ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
              : "border-red-800 bg-red-950/40 text-red-300"
          }`}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "Saving..."
          : initialValues?.id
            ? "Update Class Level"
            : "Create Class Level"}
      </button>
    </form>
  );
}