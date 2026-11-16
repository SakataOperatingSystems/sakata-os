export const PAYMENT_STATUSES = [
  "pending",
  "confirmed",
  "reversed",
  "cancelled",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "mobile_money",
  "bank_transfer",
  "card",
  "cheque",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const RECEIPT_STATUSES = [
  "pending",
  "issued",
  "voided",
] as const;

export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export type PaymentInput = {
  studentFeeAccountId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference: string;
  receivedByUserId: string;
  receiptStatus: ReceiptStatus;
  status: PaymentStatus;
  notes: string;
};

export type PaymentOperatorException =
  | "invalid_amount"
  | "account_closed"
  | "no_balance"
  | "missing_reference"
  | "pending_payment"
  | "reversal_required"
  | "payment_cancelled";

export type PaymentOperatorState = {
  nextAction: string;
  exceptions: PaymentOperatorException[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validatePaymentInput(input: PaymentInput): string[] {
  const errors: string[] = [];

  if (!UUID_PATTERN.test(input.studentFeeAccountId)) {
    errors.push("A valid student fee account is required.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.push("Payment amount must be greater than zero.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate)) {
    errors.push("Payment date is required.");
  }

  if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
    errors.push("Payment method is invalid.");
  }

  if (!input.reference.trim()) {
    errors.push("Payment reference is required.");
  }

  if (!UUID_PATTERN.test(input.receivedByUserId)) {
    errors.push("A valid receiving staff member is required.");
  }

  if (!RECEIPT_STATUSES.includes(input.receiptStatus)) {
    errors.push("Receipt status is invalid.");
  }

  if (!PAYMENT_STATUSES.includes(input.status)) {
    errors.push("Payment status is invalid.");
  }

  return errors;
}

export const PAYMENT_STATUS_TRANSITIONS: Record<
  PaymentStatus,
  readonly PaymentStatus[]
> = {
  pending: ["pending", "confirmed", "cancelled"],
  confirmed: ["confirmed", "reversed"],
  reversed: ["reversed"],
  cancelled: ["cancelled"],
};

export function isValidPaymentStatusTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  return PAYMENT_STATUS_TRANSITIONS[from].includes(to);
}

export function getPaymentOperatorState(input: {
  status: PaymentStatus;
  amount: number;
  accountBalance: number;
  accountClosed: boolean;
  reference: string;
}): PaymentOperatorState {
  const exceptions: PaymentOperatorException[] = [];

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    exceptions.push("invalid_amount");
  }

  if (input.accountClosed) {
    exceptions.push("account_closed");
  }

  if (input.accountBalance <= 0) {
    exceptions.push("no_balance");
  }

  if (!input.reference.trim()) {
    exceptions.push("missing_reference");
  }

  let nextAction = "Closed";

  if (input.status === "pending") {
    nextAction = "Confirm or cancel payment";
    exceptions.push("pending_payment");
  } else if (input.status === "confirmed") {
    nextAction = "Payment confirmed";
  } else if (input.status === "reversed") {
    nextAction = "Reversal recorded";
  } else if (input.status === "cancelled") {
    nextAction = "Payment cancelled";
    exceptions.push("payment_cancelled");
  }

  return {
    nextAction,
    exceptions: [...new Set(exceptions)],
  };
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return {
    pending: "Pending",
    confirmed: "Confirmed",
    reversed: "Reversed",
    cancelled: "Cancelled",
  }[status];
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return {
    cash: "Cash",
    mobile_money: "Mobile money",
    bank_transfer: "Bank transfer",
    card: "Card",
    cheque: "Cheque",
    other: "Other",
  }[method];
}

export function receiptStatusLabel(status: ReceiptStatus): string {
  return {
    pending: "Pending",
    issued: "Issued",
    voided: "Voided",
  }[status];
}
