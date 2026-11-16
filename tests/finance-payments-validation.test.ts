import { expect, test } from "vitest";
import {
  getPaymentOperatorState,
  isValidPaymentStatusTransition,
  validatePaymentInput,
} from "../app/school/finance/payments-validation";

const validInput = {
  studentFeeAccountId: "11111111-1111-4111-8111-111111111111",
  amount: 50000,
  paymentDate: "2026-09-30",
  paymentMethod: "cash" as const,
  reference: "RCPT-001",
  receivedByUserId: "22222222-2222-4222-8222-222222222222",
  receiptStatus: "pending" as const,
  status: "pending" as const,
  notes: "",
};

test("accepts valid pending payment input", () => {
  expect(validatePaymentInput(validInput)).toEqual([]);
});

test("rejects zero payment amount", () => {
  expect(
    validatePaymentInput({ ...validInput, amount: 0 }),
  ).toContain("Payment amount must be greater than zero.");
});

test("rejects invalid payment reference", () => {
  expect(
    validatePaymentInput({ ...validInput, reference: "" }),
  ).toContain("Payment reference is required.");
});

test("rejects invalid payment method", () => {
  expect(
    validatePaymentInput({
      ...validInput,
      paymentMethod: "invalid" as never,
    }),
  ).toContain("Payment method is invalid.");
});

test("rejects invalid account id", () => {
  expect(
    validatePaymentInput({
      ...validInput,
      studentFeeAccountId: "bad",
    }),
  ).toContain("A valid student fee account is required.");
});

test("pending can become confirmed", () => {
  expect(
    isValidPaymentStatusTransition("pending", "confirmed"),
  ).toBe(true);
});

test("pending can become cancelled", () => {
  expect(
    isValidPaymentStatusTransition("pending", "cancelled"),
  ).toBe(true);
});

test("confirmed can become reversed", () => {
  expect(
    isValidPaymentStatusTransition("confirmed", "reversed"),
  ).toBe(true);
});

test("cancelled cannot reopen", () => {
  expect(
    isValidPaymentStatusTransition("cancelled", "pending"),
  ).toBe(false);
});

test("reversed cannot reopen", () => {
  expect(
    isValidPaymentStatusTransition("reversed", "confirmed"),
  ).toBe(false);
});

test("pending state requires confirmation or cancellation", () => {
  const state = getPaymentOperatorState({
    status: "pending",
    amount: 50000,
    accountBalance: 100000,
    accountClosed: false,
    reference: "RCPT-001",
  });

  expect(state.nextAction).toBe("Confirm or cancel payment");
  expect(state.exceptions).toContain("pending_payment");
});

test("closed account is an exception", () => {
  const state = getPaymentOperatorState({
    status: "pending",
    amount: 50000,
    accountBalance: 100000,
    accountClosed: true,
    reference: "RCPT-001",
  });

  expect(state.exceptions).toContain("account_closed");
});

test("zero balance is an exception", () => {
  const state = getPaymentOperatorState({
    status: "confirmed",
    amount: 50000,
    accountBalance: 0,
    accountClosed: false,
    reference: "RCPT-001",
  });

  expect(state.exceptions).toContain("no_balance");
});


test("reversed payment is operationally closed", () => {
  const state = getPaymentOperatorState({
    status: "reversed",
    amount: 20000,
    accountBalance: 50000,
    accountClosed: false,
    reference: "RCPT-002",
  });

  expect(state.nextAction).toBe("Reversal recorded");
  expect(state.exceptions).not.toContain("reversal_required");
  expect(state.exceptions).not.toContain("pending_payment");
});

test("cancelled payment is operationally closed", () => {
  const state = getPaymentOperatorState({
    status: "cancelled",
    amount: 20000,
    accountBalance: 50000,
    accountClosed: false,
    reference: "RCPT-003",
  });

  expect(state.nextAction).toBe("Payment cancelled");
  expect(state.exceptions).toContain("payment_cancelled");
  expect(state.exceptions).not.toContain("pending_payment");
});

test("missing reference is an exception", () => {
  const state = getPaymentOperatorState({
    status: "pending",
    amount: 50000,
    accountBalance: 100000,
    accountClosed: false,
    reference: "",
  });

  expect(state.exceptions).toContain("missing_reference");
});
