"use client";

import { useActionState } from "react";
import { createWorkflowDefinition } from "./actions";

const initialState = {
  success: false,
  error: null,
};

export default function WorkflowDefinitionForm() {
  const [state, formAction, pending] = useActionState(
    createWorkflowDefinition,
    initialState
  );

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
          Create Workflow Definition
        </p>

        <h2 className="mt-2 text-xl font-semibold text-slate-100">
          Define a governed operational lifecycle
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Create the reusable workflow definition first. States and
          transitions will be configured as separate controlled layers.
        </p>
      </div>

      {state.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-medium text-red-300">
            {state.error}
          </p>
        </div>
      )}

      {state.success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-medium text-emerald-300">
            Workflow definition created successfully.
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="workflow-code"
          className="block text-sm font-medium text-slate-300"
        >
          Code
        </label>

        <input
          id="workflow-code"
          name="code"
          type="text"
          required
          maxLength={100}
          pattern="[a-z0-9][a-z0-9._-]*"
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-emerald-500"
          placeholder="e.g. student_admission"
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Stable organization-scoped identifier. Use lowercase letters,
          numbers, dots, underscores, or hyphens.
        </p>
      </div>

      <div>
        <label
          htmlFor="workflow-name"
          className="block text-sm font-medium text-slate-300"
        >
          Name
        </label>

        <input
          id="workflow-name"
          name="name"
          type="text"
          required
          maxLength={200}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
          placeholder="e.g. Student Admission"
        />
      </div>

      <div>
        <label
          htmlFor="workflow-description"
          className="block text-sm font-medium text-slate-300"
        >
          Description
        </label>

        <textarea
          id="workflow-description"
          name="description"
          rows={4}
          maxLength={5000}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
          placeholder="Describe the operational lifecycle this workflow governs."
        />
      </div>

      <div>
        <label
          htmlFor="workflow-status"
          className="block text-sm font-medium text-slate-300"
        >
          Status
        </label>

        <select
          id="workflow-status"
          name="status"
          defaultValue="active"
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create Workflow Definition"}
      </button>
    </form>
  );
}
