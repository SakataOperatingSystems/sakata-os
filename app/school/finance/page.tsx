import Link from "next/link";

import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

import FeeStructureForm from "./form";
import {
  getFeeCategoryLabel,
  getFeeOperatorState,
  getFeeStatusLabel,
  getPaymentFrequencyLabel,
  type FeeStatus,
} from "./validation";
import {
  createFeeStructure,
  updateFeeStructure,
} from "./actions";

type FeeStructureRow = {
  id: string;
  academic_period_id: string;
  class_id: string | null;
  fee_category: string;
  fee_item: string;
  amount: number | string;
  payment_frequency: string;
  due_date: string | null;
  applicability: string;
  status: FeeStatus;
  notes: string | null;
};

type Option = {
  id: string;
  name: string;
};

const statusStyles: Record<FeeStatus, string> = {
  draft: "border-amber-900/60 bg-amber-950/30 text-amber-300",
  active: "border-emerald-900/60 bg-emerald-950/30 text-emerald-300",
  inactive: "border-slate-700 bg-slate-800/70 text-slate-300",
  closed: "border-red-900/60 bg-red-950/30 text-red-300",
};

function money(value: number | string) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requirePermission("school.fees.read");

  const { edit: editId } = await searchParams;

  const { organizationId } = await getOrganizationContext();
  const supabase = await createClient();

  const [
    { data: feeStructures, error: feeError },
    { data: academicPeriods, error: periodError },
    { data: classes, error: classError },
  ] = await Promise.all([
    supabase
      .from("school_fee_structures")
      .select(
        "id, academic_period_id, class_id, fee_category, fee_item, amount, payment_frequency, due_date, applicability, status, notes"
      )
      .eq("organization_id", organizationId)
      .order("status", { ascending: true })
      .order("due_date", { ascending: true }),
    supabase
      .from("academic_periods")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("classes")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name"),
  ]);

  if (feeError) {
    throw new Error(feeError.message);
  }

  if (periodError) {
    throw new Error(periodError.message);
  }

  if (classError) {
    throw new Error(classError.message);
  }

  const rows = (feeStructures ?? []) as FeeStructureRow[];
  const periods = (academicPeriods ?? []) as Option[];
  const classesRows = (classes ?? []) as Option[];

  const periodById = new Map(
    periods.map((period) => [period.id, period.name])
  );

  const classById = new Map(
    classesRows.map((schoolClass) => [schoolClass.id, schoolClass.name])
  );

  const counts = {
    active: rows.filter((row) => row.status === "active").length,
    draft: rows.filter((row) => row.status === "draft").length,
    inactive: rows.filter((row) => row.status === "inactive").length,
    closed: rows.filter((row) => row.status === "closed").length,
  };

  const editingRow = editId
    ? rows.find((row) => row.id === editId) ?? null
    : null;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              School Finance
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Fee Structures
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Configure gross school fee obligations before student accounts,
              support and confirmed payments.
            </p>
          </div>

          <Link
            href="/school"
            className="text-sm font-medium text-slate-300 hover:text-white"
          >
            Back to School OS
          </Link>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Active", counts.active],
            ["Draft", counts.draft],
            ["Inactive", counts.inactive],
            ["Closed", counts.closed],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section
          id="fee-structure-form"
          className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
        >
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
{editingRow ? "Edit fee structure" : "Create fee structure"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {editingRow
                ? "Update the fee structure while respecting its controlled lifecycle."
                : "Define the gross obligation first. Payment and support accounting will build on this foundation."}
            </p>
          </div>

          <FeeStructureForm
            action={editingRow ? updateFeeStructure : createFeeStructure}
            academicPeriods={periods}
            classes={classesRows}
            initialValues={
              editingRow
                ? {
                    id: editingRow.id,
                    academicPeriodId: editingRow.academic_period_id,
                    classId: editingRow.class_id ?? "",
                    feeCategory: editingRow.fee_category,
                    feeItem: editingRow.fee_item,
                    amount: String(editingRow.amount),
                    paymentFrequency: editingRow.payment_frequency,
                    dueDate: editingRow.due_date ?? "",
                    applicability: editingRow.applicability,
                    status: editingRow.status,
                    notes: editingRow.notes ?? "",
                  }
                : undefined
            }
          />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-lg font-semibold">
              Fee structure register
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Status, next action and exceptions are visible for each
              structure.
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No fee structures configured yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {rows.map((row) => {
                const operator = getFeeOperatorState({
                  applicability: row.applicability,
                  classId: row.class_id,
                  dueDate: row.due_date,
                  status: row.status,
                });

                return (
                  <div key={row.id} className="px-6 py-6">
                    <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr_1fr_1.2fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {row.fee_item}
                          </h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[row.status]}`}
                          >
                            {getFeeStatusLabel(row.status)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-400">
                          {getFeeCategoryLabel(row.fee_category as never)}
                          {" · "}
                          {getPaymentFrequencyLabel(
                            row.payment_frequency as never
                          )}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {periodById.get(row.academic_period_id) ??
                            "Unknown academic period"}
                          {" · "}
                          {row.class_id
                            ? classById.get(row.class_id) ?? "Unknown class"
                            : "All classes"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Amount
                        </p>
                        <p className="mt-1 font-semibold">
                          {money(row.amount)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Due date
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {row.due_date ?? "No due date"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Next action
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {operator.nextAction}
                        </p>

                        {operator.exceptions.length > 0 && (
                          <p className="mt-1 text-xs text-amber-400">
                            {operator.exceptions.length} exception
                            {operator.exceptions.length === 1 ? "" : "s"}
                          </p>
                        )}

                        <Link
                          href={`/school/finance?edit=${encodeURIComponent(
                            row.id
                          )}#fee-structure-form`}
                          className="mt-2 inline-block text-xs font-medium text-slate-400 hover:text-white"
                        >
                          Edit structure
                        </Link>
                      </div>
                    </div>

                    {row.notes && (
                      <p className="mt-4 text-sm leading-6 text-slate-500">
                        {row.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

