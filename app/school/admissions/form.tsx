"use client";

import { useActionState } from "react";
import type {
  AdmissionGender,
  AdmissionRequestStatus,
} from "./validation";
import type {
  AdmissionRequestActionState,
} from "./actions";

type AdmissionFormProps = {
  action: (
    previousState: AdmissionRequestActionState,
    formData: FormData
  ) => Promise<AdmissionRequestActionState>;
  initialValues?: {
    id: string;
    admissionRequestId: string;
    applicantName: string;
    applicantGender: AdmissionGender | "";
    applicantDateOfBirth: string;
    requestedAdmissionDate: string;
    status: AdmissionRequestStatus;
    notes: string;
  };
};

const GENDER_OPTIONS: Array<{
  value: AdmissionGender;
  label: string;
}> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS: Array<{
  value: AdmissionRequestStatus;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "converted", label: "Converted" },
];

const INITIAL_STATE: AdmissionRequestActionState = {
  success: false,
  error: null,
};

export default function AdmissionForm({
  action,
  initialValues,
}: AdmissionFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_STATE
  );

  return (
    <form action={formAction} className="space-y-5">
      {initialValues && (
        <input
          type="hidden"
          name="id"
          value={initialValues.id}
        />
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="admission_request_id"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Admission request ID
          </label>

          <input
            id="admission_request_id"
            name="admission_request_id"
            type="text"
            defaultValue={
              initialValues?.admissionRequestId ?? ""
            }
            placeholder="e.g. ADM-2026-001"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="applicant_name"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Applicant name
          </label>

          <input
            id="applicant_name"
            name="applicant_name"
            type="text"
            defaultValue={
              initialValues?.applicantName ?? ""
            }
            placeholder="Full applicant name"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="applicant_gender"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Gender
          </label>

          <select
            id="applicant_gender"
            name="applicant_gender"
            defaultValue={
              initialValues?.applicantGender ?? ""
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
          >
            <option value="">Not specified</option>

            {GENDER_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="applicant_date_of_birth"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Date of birth
          </label>

          <input
            id="applicant_date_of_birth"
            name="applicant_date_of_birth"
            type="date"
            defaultValue={
              initialValues?.applicantDateOfBirth ?? ""
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="requested_admission_date"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Requested admission date
          </label>

          <input
            id="requested_admission_date"
            name="requested_admission_date"
            type="date"
            defaultValue={
              initialValues?.requestedAdmissionDate ?? ""
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="status"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Request status
          </label>

          <select
            id="status"
            name="status"
            defaultValue={
              initialValues?.status ?? "open"
            }
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          Notes
        </label>

        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={initialValues?.notes ?? ""}
          placeholder="Optional admission notes"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500"
        />
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {state.error}
        </div>
      )}

      {state.success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          Admission request saved successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "Saving..."
          : initialValues
            ? "Update admission request"
            : "Create admission request"}
      </button>
    </form>
  );
}
