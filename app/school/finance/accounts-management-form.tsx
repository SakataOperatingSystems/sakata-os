"use client";

import { useActionState } from "react";

import type { StudentFeeAccountActionState } from "./accounts-actions";

type ManagementAction = (
  previousState: StudentFeeAccountActionState,
  formData: FormData
) => Promise<StudentFeeAccountActionState>;

type Props = {
  accountId: string;
  currentSupportAmount: number;
  currentDueDate: string | null;
  supportAction: ManagementAction;
  dueDateAction: ManagementAction;
};

const initialState: StudentFeeAccountActionState = {
  success: false,
  error: null,
};

function ResultMessage({
  state,
}: {
  state: StudentFeeAccountActionState;
}) {
  if (state.error) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
        {state.error}
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
        Account change saved successfully.
      </div>
    );
  }

  return null;
}

export default function StudentFeeAccountManagementForm({
  accountId,
  currentSupportAmount,
  currentDueDate,
  supportAction,
  dueDateAction,
}: Props) {
  const [supportState, supportFormAction, supportPending] = useActionState(
    supportAction,
    initialState
  );

  const [dueDateState, dueDateFormAction, dueDatePending] = useActionState(
    dueDateAction,
    initialState
  );

  return (
    <details className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-200">
        Manage account
      </summary>

      <div className="space-y-6 border-t border-slate-800 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">
            Account controls
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Correct controlled operational fields without changing the
            student, fee structure, original gross obligation, or payment
            history.
          </p>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Due date
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Correct an incorrect deadline or restore a missing deadline.
            </p>
          </div>

          <form action={dueDateFormAction} className="space-y-4">
            <input type="hidden" name="account_id" value={accountId} />

            <ResultMessage state={dueDateState} />

            <div>
              <label
                htmlFor={`due-date-${accountId}`}
                className="text-xs uppercase tracking-wide text-slate-500"
              >
                Due date
              </label>

              <input
                id={`due-date-${accountId}`}
                name="new_due_date"
                type="date"
                defaultValue={currentDueDate ?? ""}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-500"
              />

              <p className="mt-1 text-xs text-slate-500">
                Current due date: {currentDueDate ?? "No due date"}
              </p>
            </div>

            <div>
              <label
                htmlFor={`due-date-reason-${accountId}`}
                className="text-xs uppercase tracking-wide text-slate-500"
              >
                Correction reason
              </label>

              <textarea
                id={`due-date-reason-${accountId}`}
                name="due_date_reason"
                required
                maxLength={500}
                rows={3}
                placeholder="Explain why the due date is being corrected."
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={dueDatePending}
              className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {dueDatePending ? "Saving due date..." : "Save due date"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Approved support
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Correct approved support without changing the original gross
              obligation.
            </p>
          </div>

          <form action={supportFormAction} className="space-y-4">
            <input type="hidden" name="account_id" value={accountId} />

            <ResultMessage state={supportState} />

            <div>
              <label
                htmlFor={`support-${accountId}`}
                className="text-xs uppercase tracking-wide text-slate-500"
              >
                Approved support (UGX)
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
            </div>

            <div>
              <label
                htmlFor={`support-reason-${accountId}`}
                className="text-xs uppercase tracking-wide text-slate-500"
              >
                Correction reason
              </label>

              <textarea
                id={`support-reason-${accountId}`}
                name="reason"
                required
                maxLength={500}
                rows={3}
                placeholder="Explain why approved support is being corrected."
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={supportPending}
              className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {supportPending ? "Saving support..." : "Save support"}
            </button>
          </form>
        </section>

        <p className="text-xs leading-5 text-slate-500">
          Student identity, fee structure, gross obligation and confirmed
          payment history are controlled financial facts. They are not
          casually overwritten here.
        </p>
      </div>
    </details>
  );
}
