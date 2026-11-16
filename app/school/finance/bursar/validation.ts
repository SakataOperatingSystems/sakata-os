export type BursarAccount = {
  id: string;
  studentName: string;
  feeItem: string;
  feeCategory: string;
  grossRequired: number;
  approvedSupport: number;
  netRequired: number;
  confirmedPayments: number;
  balance: number;
  dueDate: string | null;
  status: string;
};

export type BursarOperationalState = {
  state: "current" | "overdue" | "no_deadline" | "settled";
  nextAction: string;
};

export function getBursarOperationalState(
  account: BursarAccount,
  today: string,
): BursarOperationalState {
  if (account.balance <= 0) {
    return {
      state: "settled",
      nextAction: "Account settled",
    };
  }

  if (!account.dueDate) {
    return {
      state: "no_deadline",
      nextAction: "Set or review due date",
    };
  }

  if (account.dueDate < today) {
    return {
      state: "overdue",
      nextAction: "Follow up outstanding balance",
    };
  }

  return {
    state: "current",
    nextAction: "Monitor outstanding balance",
  };
}

export function sortBursarAccounts(
  accounts: BursarAccount[],
): BursarAccount[] {
  return [...accounts].sort((a, b) => {
    const aDue = a.dueDate ?? "9999-12-31";
    const bDue = b.dueDate ?? "9999-12-31";

    if (aDue !== bDue) {
      return aDue.localeCompare(bDue);
    }

    return b.balance - a.balance;
  });
}
export type BursarFollowUpTaskDetails = {
  title: string;
  description: string;
  priority: "normal";
  dueAt: string | null;
};

export function getBursarFollowUpTaskDetails(
  account: BursarAccount,
  today: string,
): BursarFollowUpTaskDetails | null {
  const state = getBursarOperationalState(account, today);

  if (state.state === "current" || state.state === "settled") {
    return null;
  }

  const overdue = state.state === "overdue";
  const exceptionLabel = overdue ? "Overdue" : "Deadline missing";
  const actionLabel = overdue
    ? "Follow up outstanding balance"
    : "Set or review due date";

  return {
    title: overdue
      ? `Fee follow-up — ${account.studentName} — ${account.feeItem}`
      : `Fee deadline review — ${account.studentName} — ${account.feeItem}`,
    description: [
      "Bursar operational follow-up required.",
      `Student: ${account.studentName}`,
      `Fee item: ${account.feeItem}`,
      `Fee category: ${account.feeCategory}`,
      `Outstanding balance: UGX ${account.balance.toLocaleString("en-US")}`,
      `Exception: ${exceptionLabel}`,
      `Next action: ${actionLabel}`,
      `Fee account ID: ${account.id}`,
      `Original due date: ${account.dueDate ?? "Not set"}`,
    ].join("\n"),
    priority: "normal",
    dueAt: account.dueDate
      ? `${account.dueDate}T23:59:59.999Z`
      : null,
  };
}
