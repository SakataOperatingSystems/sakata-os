import { expect, test } from "vitest";

import {
  FEE_STATUS_TRANSITIONS,
  getFeeOperatorState,
  isValidFeeStatusTransition,
  validateFeeStructureInput,
} from "../app/school/finance/validation";

const academicPeriodId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";

test("accepts a valid fee structure", () => {
  const result = validateFeeStructureInput({
    academicPeriodId,
    classId: null,
    feeCategory: "tuition",
    feeItem: "Term 1 Tuition",
    amount: "1500000",
    paymentFrequency: "per_term",
    dueDate: "2026-10-15",
    applicability: "all_eligible",
    status: "active",
    notes: null,
  });

  expect(result.valid).toBe(true);
  expect(result.errors).toEqual([]);
});

test("rejects a negative amount", () => {
  const result = validateFeeStructureInput({
    academicPeriodId,
    classId: null,
    feeCategory: "tuition",
    feeItem: "Term 1 Tuition",
    amount: "-1",
    paymentFrequency: "per_term",
    dueDate: "2026-10-15",
    applicability: "all_eligible",
    status: "draft",
    notes: null,
  });

  expect(result.valid).toBe(false);
  expect(result.errors).toContain("Amount cannot be negative.");
});

test("requires a class for specific-class applicability", () => {
  const result = validateFeeStructureInput({
    academicPeriodId,
    classId: null,
    feeCategory: "transport",
    feeItem: "Transport",
    amount: "200000",
    paymentFrequency: "per_term",
    dueDate: null,
    applicability: "specific_class",
    status: "draft",
    notes: null,
  });

  expect(result.valid).toBe(false);
  expect(result.errors).toContain(
    "Select a class when applicability is specific class."
  );
});

test("accepts specific-class applicability with a class", () => {
  const result = validateFeeStructureInput({
    academicPeriodId,
    classId,
    feeCategory: "transport",
    feeItem: "Transport",
    amount: "200000",
    paymentFrequency: "per_term",
    dueDate: null,
    applicability: "specific_class",
    status: "draft",
    notes: null,
  });

  expect(result.valid).toBe(true);
});

test("flags active fee structures without a due date", () => {
  const state = getFeeOperatorState({
    applicability: "all_eligible",
    classId: null,
    dueDate: null,
    status: "active",
  });

  expect(state.nextAction).toBe("Use for student fee accounts");
  expect(state.exceptions).toContain("missing_due_date");
});

test("draft structures require completion before activation", () => {
  const state = getFeeOperatorState({
    applicability: "all_eligible",
    classId: null,
    dueDate: null,
    status: "draft",
  });

  expect(state.nextAction).toBe("Complete and activate");
});

test("closed structures are operationally closed", () => {
  const state = getFeeOperatorState({
    applicability: "all_eligible",
    classId: null,
    dueDate: "2026-10-15",
    status: "closed",
  });

  expect(state.nextAction).toBe("Closed");
  expect(state.exceptions).toContain("closed_structure");
});


test("allows draft to active", () => {
  expect(isValidFeeStatusTransition("draft", "active")).toBe(true);
});

test("allows active to inactive", () => {
  expect(isValidFeeStatusTransition("active", "inactive")).toBe(true);
});

test("allows inactive to active", () => {
  expect(isValidFeeStatusTransition("inactive", "active")).toBe(true);
});

test("allows inactive to closed", () => {
  expect(isValidFeeStatusTransition("inactive", "closed")).toBe(true);
});

test("rejects active to closed", () => {
  expect(isValidFeeStatusTransition("active", "closed")).toBe(false);
});

test("rejects active to draft", () => {
  expect(isValidFeeStatusTransition("active", "draft")).toBe(false);
});

test("rejects closed reopening", () => {
  expect(isValidFeeStatusTransition("closed", "active")).toBe(false);
});

test("closed is terminal", () => {
  expect(FEE_STATUS_TRANSITIONS.closed).toEqual(["closed"]);
});
