import Link from "next/link";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import PaymentsForm from "../payments-form";
import {
  cancelPayment,
  confirmPayment,
  reversePayment,
} from "../payments-actions";
import {
  getPaymentOperatorState,
  paymentMethodLabel,
  paymentStatusLabel,
  receiptStatusLabel,
  type PaymentMethod,
  type PaymentStatus,
  type ReceiptStatus,
} from "../payments-validation";

type Account = {
  id: string;
  student_id: string;
  balance_amount: number | string;
  status: string;
};

type Student = {
  id: string;
  full_name: string;
};

type Staff = {
  id: string;
  display_name: string | null;
};

type Payment = {
  id: string;
  student_fee_account_id: string;
  amount: number | string;
  payment_date: string;
  payment_method: string;
  reference: string;
  received_by_user_id: string;
  receipt_status: string;
  status: string;
  notes: string | null;
};

function money(value: number | string) {
  return Number(value).toLocaleString();
}

export default async function FinancePaymentsPage() {
  await requirePermission("school.fees.read");

  const { organizationId } = await getOrganizationContext();
  const supabase = await createClient();

  const [
    { data: payments, error: paymentsError },
    { data: accounts, error: accountsError },
    { data: students, error: studentsError },
    { data: staff, error: staffError },
  ] = await Promise.all([
    supabase
      .from("school_fee_payments")
      .select(
        "id, student_fee_account_id, amount, payment_date, payment_method, reference, received_by_user_id, receipt_status, status, notes",
      )
      .eq("organization_id", organizationId)
      .order("payment_date", { ascending: false }),
    supabase
      .from("school_student_fee_accounts")
      .select("id, student_id, balance_amount, status")
      .eq("organization_id", organizationId),
    supabase
      .from("students")
      .select("id, full_name")
      .eq("organization_id", organizationId)
      .order("full_name"),
    supabase
      .from("organization_memberships")
      .select("user_profile_id")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
  ]);

  if (paymentsError) throw new Error(paymentsError.message);
  if (accountsError) throw new Error(accountsError.message);
  if (studentsError) throw new Error(studentsError.message);
  if (staffError) throw new Error(staffError.message);

  const paymentRows = (payments ?? []) as Payment[];
  const accountRows = (accounts ?? []) as Account[];
  const studentRows = (students ?? []) as Student[];
  const receiverIds = (staff ?? []).map(
    (membership) => membership.user_profile_id,
  );

  const { data: activeReceivers, error: activeReceiversError } =
    receiverIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("id, display_name")
          .in("id", receiverIds)
          .eq("status", "active")
          .order("display_name")
      : { data: [], error: null };

  if (activeReceiversError) {
    throw new Error(activeReceiversError.message);
  }

  const staffRows = (activeReceivers ?? []) as Staff[];

  const accountById = new Map(accountRows.map((row) => [row.id, row]));
  const studentById = new Map(
    studentRows.map((row) => [row.id, row.full_name]),
  );
  const staffById = new Map(
    staffRows.map((row) => [
      row.id,
      row.display_name ?? "Unnamed staff",
    ]),
  );

  const outstandingAccounts = accountRows.filter(
    (account) =>
      Number(account.balance_amount) > 0 &&
      account.status !== "closed",
  );

  const confirmedTotal = paymentRows
    .filter((payment) => payment.status === "confirmed")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  const pendingTotal = paymentRows
    .filter((payment) => payment.status === "pending")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  const outstandingTotal = outstandingAccounts.reduce(
    (sum, account) => sum + Number(account.balance_amount),
    0,
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      <header>
        <Link
          href="/school/finance"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Finance
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Payment Ledger
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Record and control school payments. Only confirmed payments affect
          student fee account balances.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Payments", paymentRows.length.toString()],
          ["Confirmed", `UGX ${money(confirmedTotal)}`],
          ["Pending", `UGX ${money(pendingTotal)}`],
          ["Outstanding", `UGX ${money(outstandingTotal)}`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-800 bg-slate-950 p-5"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white">
          Record payment
        </h2>
        <p className="mt-1 mb-5 text-sm text-slate-400">
          Payments enter as pending and require confirmation before affecting
          the ledger balance.
        </p>

        <PaymentsForm
          accounts={outstandingAccounts.map((account) => ({
            id: account.id,
            label:
              studentById.get(account.student_id) ?? "Unknown student",
            balance: Number(account.balance_amount),
          }))}
          staff={staffRows.map((member) => ({
            id: member.id,
            displayName: member.display_name ?? "Unnamed staff",
          }))}
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-6 py-5">
          <h2 className="text-lg font-semibold text-white">
            Payment register
          </h2>
        </div>

        <div className="divide-y divide-slate-800">
          {paymentRows.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No payments recorded yet.
            </div>
          ) : (
            paymentRows.map((payment) => {
              const account = accountById.get(
                payment.student_fee_account_id,
              );

              const state = getPaymentOperatorState({
                status: payment.status as PaymentStatus,
                amount: Number(payment.amount),
                accountBalance: Number(account?.balance_amount ?? 0),
                accountClosed: account?.status === "closed",
                reference: payment.reference,
              });

              return (
                <article key={payment.id} className="space-y-4 px-6 py-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Student
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {studentById.get(account?.student_id ?? "") ??
                          "Unknown student"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Amount
                      </p>
                      <p className="mt-1 text-sm text-white">
                        UGX {money(payment.amount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Method
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {paymentMethodLabel(
                          payment.payment_method as PaymentMethod,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Status
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {paymentStatusLabel(
                          payment.status as PaymentStatus,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Receipt
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {receiptStatusLabel(
                          payment.receipt_status as ReceiptStatus,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Received by
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {staffById.get(payment.received_by_user_id) ??
                          "Unknown staff"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Reference
                      </p>
                      <p className="mt-1 break-all text-sm text-white">
                        {payment.reference}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-lg border border-slate-800 bg-slate-950 p-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Account balance
                      </p>
                      <p className="mt-1 text-sm text-white">
                        UGX {money(account?.balance_amount ?? 0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Next action
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {state.nextAction}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Payment date
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {payment.payment_date}
                      </p>
                    </div>
                  </div>

                  {payment.notes ? (
                    <p className="text-sm text-slate-400">
                      {payment.notes}
                    </p>
                  ) : null}

                  {payment.status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={confirmPayment.bind(null, payment.id)}>
                        <button
                          type="submit"
                          className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-950"
                        >
                          Confirm payment
                        </button>
                      </form>

                      <form action={cancelPayment.bind(null, payment.id)}>
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200"
                        >
                          Cancel
                        </button>
                      </form>
                    </div>
                  ) : null}

                  {payment.status === "confirmed" ? (
                    <div className="flex flex-wrap gap-2">
                      {payment.receipt_status === "issued" ? (
                        <Link
                          href={`/school/finance/payments/${payment.id}/receipt`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200"
                        >
                          Download receipt (PDF)
                        </Link>
                      ) : null}

                      <form action={reversePayment.bind(null, payment.id)}>
                        <button
                          type="submit"
                          className="rounded-lg border border-amber-800 px-3 py-2 text-sm font-medium text-amber-200"
                        >
                          Reverse payment
                        </button>
                      </form>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
