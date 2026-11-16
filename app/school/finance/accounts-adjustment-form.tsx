"use client";

import { useActionState } from "react";

import type { StudentFeeAccountActionState } from "./accounts-actions";

type AdjustmentAction = (
  previousState: StudentFeeAccountActionState,
  formData: FormData
) => Promise<StudentFeeAccountActionState>;

type Props = {
  accountId: string;
  currentSupportAmount: number;
  action: AdjustmentAction;
};

const initialState: StudentFeeAccountActionState = {
  success: false,
  error: null,
};

export default function StudentFeeAccountAdjustmentForm({
  accountId,
  currentSupportAmount,
  action,
}: Props) {
  const [state, formAction, pending] = useActionState(
    action,
    initialState
  );

  return (
    <details className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-300">
        Adjust approved support
      </summary>

      <form action={formAction} className="space-y-4 border-t border-slate-800 p-4">
        <input type="hidden" name="account_id" value={accountId} />

        {state.error && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {state.error}
          </div>
        )}

        {state.success && (
          <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
            Approved support adjusted successfully. The account balance has been recalculated.
          </div>
        )}

        <div>
          <label
            htmlFor={`support-${accountId}`}
            className="text-xs uppercase tracking-wide text-slate-500"
          >
            New approved support (UGX)
          </label>

          <input
            id={`support-${accountId}`}
            name="new_approved_support_amount"
            type="number"
            min="0"
            step="1"
            defaultValue={currentSupportAmount}
            required
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-500"
          />

          <p className="mt-1 text-xs text-slate-500">
            Current support: UGX{" "}
            {currentSupportAmount.toLocaleString("en-UG")}
          </p>
        </div>

        <div>
          <label
            htmlFor={`reason-${accountId}`}
            className="text-xs uppercase tracking-wide text-slate-500"
          >
            Correction reason
          </label>

          <textarea
            id={`reason-${accountId}`}
            name="reason"
            required
            maxLength={500}
            rows={3}
            placeholder="Explain why the approved support is being corrected."
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-500"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving correction..." : "Save support correction"}
        </button>

        <p className="text-xs leading-5 text-slate-500">
          Corrections are recorded with the previous amount, new amount,
          operator and reason. Financial records are not deleted.
        </p>
      </form>
    </details>
  );
}
