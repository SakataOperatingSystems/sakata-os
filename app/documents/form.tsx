"use client";

import { useActionState } from "react";
import { createDocument, type DocumentActionState } from "./actions";
import { DOCUMENT_CATEGORIES } from "./validation";

const initialState: DocumentActionState = {
  success: false,
  error: null,
};

const categoryLabels: Record<(typeof DOCUMENT_CATEGORIES)[number], string> = {
  general: "General",
  policy: "Policy",
  contract: "Contract",
  financial: "Financial",
  personnel: "Personnel",
  compliance: "Compliance",
  other: "Other",
};

export default function DocumentForm() {
  const [state, formAction, pending] = useActionState(
    createDocument,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
          Add register entry
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-100">
          Record document metadata
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          This records descriptive metadata only. It does not upload or store a
          document file.
        </p>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          Document metadata saved.
        </p>
      )}

      <div>
        <label htmlFor="document-title" className="block text-sm font-medium text-slate-300">
          Title
        </label>
        <input
          id="document-title"
          name="title"
          type="text"
          required
          maxLength={200}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
          placeholder="e.g. Safeguarding policy"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="document-category" className="block text-sm font-medium text-slate-300">
            Category
          </label>
          <select
            id="document-category"
            name="category"
            defaultValue="general"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
          >
            {DOCUMENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="document-reference" className="block text-sm font-medium text-slate-300">
            Reference number <span className="text-slate-500">(optional)</span>
          </label>
          <input
            id="document-reference"
            name="reference_number"
            type="text"
            maxLength={100}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
            placeholder="Internal reference"
          />
        </div>
      </div>

      <div>
        <label htmlFor="document-description" className="block text-sm font-medium text-slate-300">
          Description <span className="text-slate-500">(optional)</span>
        </label>
        <textarea
          id="document-description"
          name="description"
          rows={4}
          maxLength={5000}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
          placeholder="Record a short description without including file contents."
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save metadata"}
      </button>
    </form>
  );
}
