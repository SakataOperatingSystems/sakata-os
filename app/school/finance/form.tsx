"use client";

import { useActionState } from "react";

import type { FeeActionState } from "./actions";
import {
  FEE_APPLICABILITIES,
  FEE_CATEGORIES,
  FEE_STATUSES,
  PAYMENT_FREQUENCIES,
  getFeeCategoryLabel,
  getFeeStatusLabel,
  getPaymentFrequencyLabel,
} from "./validation";

type AcademicPeriodOption = {
  id: string;
  name: string;
};

type ClassOption = {
  id: string;
  name: string;
};

type FeeStructureInitialValues = {
  id: string;
  academicPeriodId: string;
  classId: string;
  feeCategory: string;
  feeItem: string;
  amount: string;
  paymentFrequency: string;
  dueDate: string;
  applicability: string;
  status: string;
  notes: string;
};

type Props = {
  action: (
    previousState: FeeActionState,
    formData: FormData
  ) => Promise<FeeActionState>;
  academicPeriods: AcademicPeriodOption[];
  classes: ClassOption[];
  initialValues?: FeeStructureInitialValues;
};

const INITIAL_STATE: FeeActionState = {
  success: false,
  error: null,
};

export default function FeeStructureForm({
  action,
  academicPeriods,
  classes,
  initialValues,
}: Props) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_STATE
  );

  const editing = Boolean(initialValues?.id);

  return (
    <form action={formAction} className="space-y-5">
      {initialValues?.id && (
        <input type="hidden" name="id" value={initialValues.id} />
      )}

      {state.error && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          Fee structure saved successfully.
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Academic period
          </span>
          <select
            name="academic_period_id"
            required
            defaultValue={initialValues?.academicPeriodId ?? ""}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          >
            <option value="">Select academic period</option>
            {academicPeriods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Class
          </span>
          <select
            name="class_id"
            defaultValue={initialValues?.classId ?? ""}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          >
            <option value="">All classes / not class-specific</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Fee category
          </span>
          <select
            name="fee_category"
            required
            defaultValue={initialValues?.feeCategory ?? "tuition"}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          >
            {FEE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {getFeeCategoryLabel(category)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Fee item
          </span>
          <input
            name="fee_item"
            required
            defaultValue={initialValues?.feeItem ?? ""}
            placeholder="e.g. Term 1 Tuition"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Amount (UGX)
          </span>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={initialValues?.amount ?? ""}
            placeholder="0"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Payment frequency
          </span>
          <select
            name="payment_frequency"
            required
            defaultValue={initialValues?.paymentFrequency ?? "per_term"}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          >
            {PAYMENT_FREQUENCIES.map((frequency) => (
              <option key={frequency} value={frequency}>
                {getPaymentFrequencyLabel(frequency)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Due date
          </span>
          <input
            name="due_date"
            type="date"
            defaultValue={initialValues?.dueDate ?? ""}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Applicability
          </span>
          <select
            name="applicability"
            required
            defaultValue={initialValues?.applicability ?? "all_eligible"}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          >
            {FEE_APPLICABILITIES.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Status
          </span>
          <select
            name="status"
            required
            defaultValue={initialValues?.status ?? "draft"}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          >
            {FEE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getFeeStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span className="mb-2 block text-sm font-medium text-slate-200">
          Notes
        </span>
        <textarea
          name="notes"
          rows={4}
          defaultValue={initialValues?.notes ?? ""}
          placeholder="Optional operational notes"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "Saving..."
          : editing
            ? "Save changes"
            : "Create fee structure"}
      </button>
    </form>
  );
}
