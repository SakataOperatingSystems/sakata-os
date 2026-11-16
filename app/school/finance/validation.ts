export const FEE_CATEGORIES = [
  "tuition",
  "meals",
  "boarding",
  "transport",
  "examination",
  "development",
  "uniforms",
  "books",
  "swimming",
  "fieldwork",
  "activities",
  "ict",
  "medical",
  "library",
  "registration_admission",
  "other",
] as const;

export type FeeCategory = (typeof FEE_CATEGORIES)[number];

export const PAYMENT_FREQUENCIES = [
  "per_term",
  "per_month",
  "per_year",
  "one_time",
  "other",
] as const;

export type PaymentFrequency = (typeof PAYMENT_FREQUENCIES)[number];

export const FEE_APPLICABILITIES = [
  "all_eligible",
  "specific_class",
  "optional",
  "conditional",
] as const;

export type FeeApplicability = (typeof FEE_APPLICABILITIES)[number];

export const FEE_STATUSES = [
  "draft",
  "active",
  "inactive",
  "closed",
] as const;

export type FeeStatus = (typeof FEE_STATUSES)[number];

export const FEE_STATUS_TRANSITIONS: Record<
  FeeStatus,
  readonly FeeStatus[]
> = {
  draft: ["draft", "active"],
  active: ["active", "inactive"],
  inactive: ["inactive", "active", "closed"],
  closed: ["closed"],
};

export function isValidFeeStatusTransition(
  currentStatus: FeeStatus,
  nextStatus: FeeStatus
): boolean {
  return FEE_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export type FeeStructureInput = {
  academicPeriodId: string;
  classId: string | null;
  feeCategory: string;
  feeItem: string;
  amount: string;
  paymentFrequency: string;
  dueDate: string | null;
  applicability: string;
  status: string;
  notes: string | null;
};

export type FeeValidationResult = {
  valid: boolean;
  errors: string[];
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function validateFeeStructureInput(
  input: FeeStructureInput
): FeeValidationResult {
  const errors: string[] = [];

  if (!isUuid(input.academicPeriodId)) {
    errors.push("Select a valid academic period.");
  }

  if (!input.feeItem.trim()) {
    errors.push("Fee item is required.");
  }

  const amount = Number(input.amount);

  if (!input.amount.trim() || !Number.isFinite(amount)) {
    errors.push("Amount must be a valid number.");
  } else if (amount < 0) {
    errors.push("Amount cannot be negative.");
  }

  if (!FEE_CATEGORIES.includes(input.feeCategory as FeeCategory)) {
    errors.push("Select a valid fee category.");
  }

  if (
    !PAYMENT_FREQUENCIES.includes(
      input.paymentFrequency as PaymentFrequency
    )
  ) {
    errors.push("Select a valid payment frequency.");
  }

  if (!FEE_APPLICABILITIES.includes(
    input.applicability as FeeApplicability
  )) {
    errors.push("Select a valid applicability.");
  }

  if (
    input.applicability === "specific_class" &&
    (!input.classId || !isUuid(input.classId))
  ) {
    errors.push("Select a class when applicability is specific class.");
  }

  if (!FEE_STATUSES.includes(input.status as FeeStatus)) {
    errors.push("Select a valid fee structure status.");
  }

  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    errors.push("Due date must be a valid calendar date.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export type FeeOperatorException =
  | "missing_class_for_specific_applicability"
  | "missing_due_date"
  | "inactive_structure"
  | "closed_structure";

export type FeeOperatorState = {
  nextAction: string;
  exceptions: FeeOperatorException[];
};

export function getFeeOperatorState(input: {
  applicability: string;
  classId: string | null;
  dueDate: string | null;
  status: FeeStatus;
}): FeeOperatorState {
  const exceptions: FeeOperatorException[] = [];

  if (
    input.applicability === "specific_class" &&
    !input.classId
  ) {
    exceptions.push("missing_class_for_specific_applicability");
  }

  if (input.status === "active" && !input.dueDate) {
    exceptions.push("missing_due_date");
  }

  if (input.status === "inactive") {
    exceptions.push("inactive_structure");
  }

  if (input.status === "closed") {
    exceptions.push("closed_structure");
  }

  let nextAction = "Edit structure";

  if (input.status === "draft") {
    nextAction = "Complete and activate";
  } else if (input.status === "active") {
    nextAction = "Use for student fee accounts";
  } else if (input.status === "inactive") {
    nextAction = "Review or reactivate";
  } else if (input.status === "closed") {
    nextAction = "Closed";
  }

  return { nextAction, exceptions };
}

export function getFeeStatusLabel(status: FeeStatus): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getFeeCategoryLabel(category: FeeCategory): string {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getPaymentFrequencyLabel(
  frequency: PaymentFrequency
): string {
  return frequency
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
