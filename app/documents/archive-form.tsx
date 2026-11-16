"use client";

import { useActionState } from "react";
import { archiveDocument, type DocumentActionState } from "./actions";

const initialState: DocumentActionState = {
  success: false,
  error: null,
};

export default function ArchiveDocumentForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(
    archiveDocument,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="id" value={id} />
      {state.error && (
        <p role="alert" className="mb-3 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="mb-3 text-sm text-emerald-300">
          Document archived.
        </p>
      )}
      {!state.success && (
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-amber-500/60 hover:text-amber-200 disabled:opacity-60"
        >
          {pending ? "Archiving…" : "Archive entry"}
        </button>
      )}
    </form>
  );
}
