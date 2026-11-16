"use client";

import { useActionState, useEffect } from "react";
import {
  createPayment,
  type PaymentActionState,
} from "./payments-actions";
import { PAYMENT_METHODS } from "./payments-validation";

type AccountOption = {
  id: string;
  label: string;
  balance: number;
};

type StaffOption = {
  id: string;
  displayName: string;
};

type Props = {
  accounts: AccountOption[];
  staff: StaffOption[];
};

const initialState: PaymentActionState = {
  success: false,
  error: null,
};

const labels: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  mobile_money: "Mobile money",
  bank_transfer: "Bank transfer",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

export default function PaymentsForm({ accounts, staff }: Props) {
  const [state, formAction, pending] = useActionState(
    createPayment,
    initialState,
  );

  useEffect(() => {
    const accountId = new URLSearchParams(window.location.search).get(
      "account_id",
    );

    if (!accountId) {
      return;
    }

    const select = document.getElementById(
      "student_fee_account_id",
    ) as HTMLSelectElement | null;

    if (!select) {
      return;
    }

    const optionExists = Array.from(select.options).some(
      (option) => option.value === accountId,
    );

    if (optionExists) {
      select.value = accountId;
    }
  }, []);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200">
          Payment recorded successfully.
        </div>
      ) : null}

      <div>
        <label htmlFor="student_fee_account_id" className="mb-1 block text-sm font-medium text-slate-200">
          Fee account
        </label>
        <p className="mb-2 text-xs text-slate-500">
          Outstanding accounts can be opened directly from the fee account register.
        </p>
        <select
          id="student_fee_account_id"
          name="student_fee_account_id"
          required
          defaultValue=""
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">Select outstanding account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.label} — UGX {account.balance.toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="amount" className="mb-1 block text-sm font-medium text-slate-200">
            Amount (UGX)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="0.01"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label htmlFor="payment_date" className="mb-1 block text-sm font-medium text-slate-200">
            Payment date
          </label>
          <input
            id="payment_date"
            name="payment_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="payment_method" className="mb-1 block text-sm font-medium text-slate-200">
            Payment method
          </label>
          <select
            id="payment_method"
            name="payment_method"
            defaultValue="cash"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {labels[method]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="received_by_user_id" className="mb-1 block text-sm font-medium text-slate-200">
            Received by
          </label>
          <select
            id="received_by_user_id"
            name="received_by_user_id"
            defaultValue=""
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            <option value="">Select staff member</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="reference" className="mb-1 block text-sm font-medium text-slate-200">
          Payment reference
        </label>
        <input
          id="reference"
          name="reference"
          required
          placeholder="Receipt number / transaction reference"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-slate-200">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </div>

      <input type="hidden" name="status" value="pending" />
      <input type="hidden" name="receipt_status" value="pending" />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Recording..." : "Record payment"}
      </button>
    </form>
  );
}
