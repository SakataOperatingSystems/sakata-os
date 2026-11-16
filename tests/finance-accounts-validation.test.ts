import { expect, test } from "vitest";

import {
  calculateFeeAccountAmounts,
  getFeeAccountOperatorState,
  validateStudentFeeAccountInput,
} from "../app/school/finance/accounts-validation";

test("validates a student fee account input", () => {
  expect(
    validateStudentFeeAccountInput({
      studentId: "student-1",
      feeStructureId: "fee-1",
      approvedSupportAmount: "10000",
    })
  ).toEqual({
    valid: true,
    approvedSupportAmount: 10000,
  });
});

test("rejects missing student", () => {
  const result = validateStudentFeeAccountInput({
    studentId: "",
    feeStructureId: "fee-1",
    approvedSupportAmount: "0",
  });

  expect(result.valid).toBe(false);
});

test("rejects negative support", () => {
  const result = validateStudentFeeAccountInput({
    studentId: "student-1",
    feeStructureId: "fee-1",
    approvedSupportAmount: "-1",
  });

  expect(result.valid).toBe(false);
});

test("calculates gross support net payments and balance", () => {
  expect(
    calculateFeeAccountAmounts(50000, 10000, 15000)
  ).toEqual({
    grossRequiredAmount: 50000,
    approvedSupportAmount: 10000,
    netRequiredAmount: 40000,
    confirmedPaymentsAmount: 15000,
    balanceAmount: 25000,
  });
});

test("prevents support exceeding gross obligation", () => {
  expect(() =>
    calculateFeeAccountAmounts(50000, 60000, 0)
  ).toThrow(
    "Approved support cannot exceed gross required amount."
  );
});

test("prevents negative gross obligation", () => {
  expect(() =>
    calculateFeeAccountAmounts(-1, 0, 0)
  ).toThrow(
    "Gross required amount cannot be negative."
  );
});

test("prevents negative confirmed payments", () => {
  expect(() =>
    calculateFeeAccountAmounts(50000, 0, -1)
  ).toThrow(
    "Confirmed payments cannot be negative."
  );
});

test("flags overdue outstanding account", () => {
  expect(
    getFeeAccountOperatorState({
      status: "open",
      balanceAmount: 25000,
      dueDate: "2026-09-01",
      today: "2026-09-30",
    })
  ).toEqual({
    nextAction: "Record payment",
    exceptions: ["overdue_balance"],
  });
});

test("does not flag a paid account as overdue", () => {
  expect(
    getFeeAccountOperatorState({
      status: "paid",
      balanceAmount: 0,
      dueDate: "2026-09-01",
      today: "2026-09-30",
    }).exceptions
  ).toEqual([]);
});

test("flags missing due date for outstanding account", () => {
  expect(
    getFeeAccountOperatorState({
      status: "open",
      balanceAmount: 25000,
      dueDate: null,
      today: "2026-09-30",
    })
  ).toEqual({
    nextAction: "Record payment",
    exceptions: ["missing_due_date"],
  });
});
