"use client";

import { useActionState, useEffect, useRef } from "react";

type ActionState = {
  success: boolean;
  error: string | null;
};

type AcademicPeriodFormProps = {
  action: (
    previousState: ActionState,
    formData: FormData
  ) => Promise<ActionState>;
  mode: "create" | "edit";
  initialValues?: {
    id: string;
    name: string;
    code: string;
    academicYear: number;
    periodNumber: number;
    startDate: string;
    endDate: string;
    status: string;
  };
};

const INITIAL_STATE: ActionState = {
  success: false,
  error: null,
};

const STATUSES = [
  "planned",
  "active",
  "closed",
  "cancelled",
] as const;

export default function AcademicPeriodForm({
  action,
  mode,
  initialValues,
}: AcademicPeriodFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    INITIAL_STATE
  );

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && mode === "create") {
      formRef.current?.reset();
    }
  }, [state.success, mode]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {mode === "edit" && initialValues ? (
        <input type="hidden" name="id" value={initialValues.id} />
      ) : null}

      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <p className="font-semibold">Unable to save academic period</p>
          <p className="mt-1">{state.error}</p>
        </div>
      ) : null}

      {state.success ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          Academic period saved successfully.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            Period Name
          </span>
          <input
            name="name"
            required
            defaultValue={initialValues?.name ?? ""}
            disabled={isPending}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-500 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            Period Code
          </span>
          <input
            name="code"
            required
            defaultValue={initialValues?.code ?? ""}
            disabled={isPending}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm uppercase text-white outline-none transition focus:border-sky-500 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            Academic Year
          </span>
          <input
            name="academic_year"
            type="number"
            min="2000"
            max="2100"
            required
            defaultValue={initialValues?.academicYear ?? ""}
            disabled={isPending}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-500 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            Period Number
          </span>
          <input
            name="period_number"
            type="number"
            min="1"
            max="20"
            required
            defaultValue={initialValues?.periodNumber ?? ""}
            disabled={isPending}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-500 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            Start Date
          </span>
          <input
            name="start_date"
            type="date"
            required
            defaultValue={initialValues?.startDate ?? ""}
            disabled={isPending}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-500 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            End Date
          </span>
          <input
            name="end_date"
            type="date"
            required
            defaultValue={initialValues?.endDate ?? ""}
            disabled={isPending}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-500 disabled:opacity-60"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            Status
          </span>
          <select
            name="status"
            defaultValue={initialValues?.status ?? "planned"}
            disabled={isPending}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-500 disabled:opacity-60"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? mode === "create"
            ? "Creating..."
            : "Saving..."
          : mode === "create"
            ? "Create Academic Period"
            : "Save Changes"}
      </button>
    </form>
  );
}