import Link from "next/link";
import { hasPermission, requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import { createBursarFollowUpTask } from "./actions";
import {
  getBursarOperationalState,
  sortBursarAccounts,
  type BursarAccount,
} from "./validation";

type AccountRow = {
  id: string;
  student_id: string;
  fee_structure_id: string;
  gross_required_amount: number | string;
  approved_support_amount: number | string;
  net_required_amount: number | string;
  confirmed_payments_amount: number | string;
  balance_amount: number | string;
  due_date: string | null;
  status: string;
};

type StudentRow = {
  id: string;
  full_name: string;
};

type FeeStructureRow = {
  id: string;
  fee_category: string;
  fee_item: string;
};

function money(value: number | string) {
  return Number(value).toLocaleString();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function stateLabel(state: BursarAccount, today: string) {
  return getBursarOperationalState(state, today);
}

export default async function BursarQueuePage() {
  await requirePermission("school.fees.read");

  const { organizationId } = await getOrganizationContext();
  const canCreateFollowUpTasks = await hasPermission("core.tasks.manage");
  const supabase = await createClient();

  const [
    { data: accounts, error: accountsError },
    { data: students, error: studentsError },
    { data: feeStructures, error: feeStructuresError },
  ] = await Promise.all([
    supabase
      .from("school_student_fee_accounts")
      .select(
        "id, student_id, fee_structure_id, gross_required_amount, approved_support_amount, net_required_amount, confirmed_payments_amount, balance_amount, due_date, status",
      )
      .eq("organization_id", organizationId)
      .gt("balance_amount", 0)
      .neq("status", "closed"),
    supabase
      .from("students")
      .select("id, full_name")
      .eq("organization_id", organizationId)
      .order("full_name"),
    supabase
      .from("school_fee_structures")
      .select("id, fee_category, fee_item")
      .eq("organization_id", organizationId),
  ]);

  if (accountsError) {
    throw new Error(accountsError.message);
  }

  if (studentsError) {
    throw new Error(studentsError.message);
  }

  if (feeStructuresError) {
    throw new Error(feeStructuresError.message);
  }

  const studentById = new Map(
    ((students ?? []) as StudentRow[]).map((student) => [
      student.id,
      student.full_name,
    ]),
  );

  const feeStructureById = new Map(
    ((feeStructures ?? []) as FeeStructureRow[]).map((structure) => [
      structure.id,
      structure,
    ]),
  );

  const today = todayIso();

  const bursarAccounts = sortBursarAccounts(
    ((accounts ?? []) as AccountRow[]).map((account) => {
      const structure = feeStructureById.get(account.fee_structure_id);

      return {
        id: account.id,
        studentName:
          studentById.get(account.student_id) ?? "Unknown student",
        feeItem: structure?.fee_item ?? "Unknown fee item",
        feeCategory: structure?.fee_category ?? "Other",
        grossRequired: Number(account.gross_required_amount),
        approvedSupport: Number(account.approved_support_amount),
        netRequired: Number(account.net_required_amount),
        confirmedPayments: Number(account.confirmed_payments_amount),
        balance: Number(account.balance_amount),
        dueDate: account.due_date,
        status: account.status,
      };
    }),
  );

  const overdueAccounts = bursarAccounts.filter(
    (account) =>
      getBursarOperationalState(account, today).state === "overdue",
  );

  const noDeadlineAccounts = bursarAccounts.filter(
    (account) =>
      getBursarOperationalState(account, today).state === "no_deadline",
  );

  const outstandingTotal = bursarAccounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  );

  const overdueTotal = overdueAccounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      <header>
        <Link
          href="/school/finance"
          className="text-sm text-slate-400 hover:text-white"
        >
          &larr; Finance
        </Link>

        <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
              Financial Operations
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              Bursar Queue
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Outstanding student fee accounts requiring financial attention.
              Accounts are ordered by due date first, then outstanding balance.
            </p>
          </div>

          <Link
            href="/school/finance/payments"
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Open Payment Ledger
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Outstanding accounts
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {bursarAccounts.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Outstanding balance
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            UGX {money(outstandingTotal)}
          </p>
        </div>

        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-5">
          <p className="text-xs uppercase tracking-wide text-amber-400">
            Overdue accounts
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-200">
            {overdueAccounts.length}
          </p>
        </div>

        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-5">
          <p className="text-xs uppercase tracking-wide text-amber-400">
            Overdue balance
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-200">
            UGX {money(overdueTotal)}
          </p>
        </div>
      </section>

      {noDeadlineAccounts.length > 0 ? (
        <section className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-5">
          <p className="font-semibold text-amber-200">
            {noDeadlineAccounts.length} outstanding account
            {noDeadlineAccounts.length === 1 ? "" : "s"} have no due date.
          </p>

          <p className="mt-1 text-sm text-amber-300/70">
            Review the fee structure or account configuration before relying
            on overdue follow-up.
          </p>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-6 py-5">
          <h2 className="text-lg font-semibold text-white">
            Outstanding fee accounts
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Due date ascending, then balance descending.
          </p>
        </div>

        <div className="divide-y divide-slate-800">
          {bursarAccounts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-emerald-300">
                No outstanding fee accounts.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                The bursar queue is clear.
              </p>
            </div>
          ) : (
            bursarAccounts.map((account) => {
              const state = stateLabel(account, today);

              return (
                <article
                  key={account.id}
                  className="space-y-5 px-6 py-5"
                >
                  <div className="grid gap-5 lg:grid-cols-6">
                    <div className="lg:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Student
                      </p>

                      <p className="mt-1 text-base font-semibold text-white">
                        {account.studentName}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {account.feeCategory} &middot; {account.feeItem}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Gross
                      </p>

                      <p className="mt-1 text-sm text-white">
                        UGX {money(account.grossRequired)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Support UGX {money(account.approvedSupport)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Net required
                      </p>

                      <p className="mt-1 text-sm text-white">
                        UGX {money(account.netRequired)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Paid UGX {money(account.confirmedPayments)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Balance
                      </p>

                      <p className="mt-1 text-lg font-semibold text-white">
                        UGX {money(account.balance)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Due date
                      </p>

                      <p className="mt-1 text-sm text-white">
                        {account.dueDate ?? "No due date"}
                      </p>

                      <p
                        className={
                          state.state === "overdue"
                            ? "mt-1 text-xs font-semibold text-amber-300"
                            : "mt-1 text-xs text-slate-500"
                        }
                      >
                        {state.state === "overdue"
                          ? "Overdue"
                          : state.state === "no_deadline"
                            ? "Deadline missing"
                            : "Current"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Next action
                      </p>

                      <p className="mt-1 text-sm font-medium text-white">
                        {state.nextAction}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canCreateFollowUpTasks && state.state !== "current" && (
                        <form action={createBursarFollowUpTask}>
                          <input
                            type="hidden"
                            name="accountId"
                            value={account.id}
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 hover:border-amber-400/60 hover:bg-amber-500/20"
                          >
                            {state.state === "overdue"
                              ? "Create follow-up task"
                              : "Create deadline review task"}
                          </button>
                        </form>
                      )}
                      <Link
                        href={`/school/finance/payments?account_id=${encodeURIComponent(account.id)}`}
                        className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200"
                      >
                        Record payment
                      </Link>

                      <Link
                        href={`/school/finance/accounts#account-${encodeURIComponent(account.id)}`}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
                      >
                        Open account
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}


