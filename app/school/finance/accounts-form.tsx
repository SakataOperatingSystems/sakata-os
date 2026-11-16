"use client";

import { useActionState } from "react";

import type { StudentFeeAccountActionState } from "./accounts-actions";

type StudentOption = {
  id: string;
  full_name: string;
};

type FeeStructureOption = {
  id: string;
  fee_item: string;
  amount: number | string;
  academic_period_name: string;
  class_name: string | null;
};

type Props = {
  action: (
    previousState: StudentFeeAccountActionState,
    formData: FormData
  ) => Promise<StudentFeeAccountActionState>;
  students: StudentOption[];
  feeStructures: FeeStructureOption[];
  initialStudentId?: string;
};

const INITIAL_STATE: StudentFeeAccountActionState = {
  success: false,
  error: null,
};

export default function StudentFeeAccountForm({
  action,
  students,
  feeStructures,
  initialStudentId = "",
}: Props) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_STATE
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          Student fee account created successfully.
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Student
          </span>
          <select
            name="student_id"
            required
            defaultValue={initialStudentId}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Active fee structure
          </span>
          <select
            name="fee_structure_id"
            required
            defaultValue=""
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          >
            <option value="">Select fee structure</option>
            {feeStructures.map((fee) => (
              <option key={fee.id} value={fee.id}>
                {fee.fee_item} · UGX{" "}
                {Number(fee.amount).toLocaleString("en-UG")} ·{" "}
                {fee.academic_period_name}
                {fee.class_name
                  ? " · " + fee.class_name
                  : " · All classes"}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Approved support (UGX)
          </span>
          <input
            name="approved_support_amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Support reduces the net required amount but never changes
            the original gross obligation.
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "Creating..."
          : "Create student fee account"}
      </button>
    </form>
  );
}
