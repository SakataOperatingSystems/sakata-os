import { expect, test } from "vitest";
import {
  getBursarOperationalState,
  sortBursarAccounts,
  type BursarAccount,
} from "../app/school/finance/bursar/validation";

const account = (
  overrides: Partial<BursarAccount> = {},
): BursarAccount => ({
  id: "1",
  studentName: "Test Student",
  feeItem: "Tuition",
  feeCategory: "tuition",
  grossRequired: 50000,
  approvedSupport: 0,
  netRequired: 50000,
  confirmedPayments: 0,
  balance: 50000,
  dueDate: "2026-10-05",
  status: "open",
  ...overrides,
});

test("current outstanding account is operationally current", () => {
  expect(
    getBursarOperationalState(account(), "2026-10-01"),
  ).toEqual({
    state: "current",
    nextAction: "Monitor outstanding balance",
  });
});

test("past due outstanding account is operationally overdue", () => {
  expect(
    getBursarOperationalState(
      account({ dueDate: "2026-09-30" }),
      "2026-10-01",
    ),
  ).toEqual({
    state: "overdue",
    nextAction: "Follow up outstanding balance",
  });
});

test("outstanding account without due date is an exception", () => {
  expect(
    getBursarOperationalState(
      account({ dueDate: null }),
      "2026-10-01",
    ),
  ).toEqual({
    state: "no_deadline",
    nextAction: "Set or review due date",
  });
});

test("zero balance is operationally settled", () => {
  expect(
    getBursarOperationalState(
      account({ balance: 0 }),
      "2026-10-01",
    ),
  ).toEqual({
    state: "settled",
    nextAction: "Account settled",
  });
});

test("bursar queue sorts by due date first", () => {
  const sorted = sortBursarAccounts([
    account({ id: "later", dueDate: "2026-10-10", balance: 10000 }),
    account({ id: "earlier", dueDate: "2026-10-05", balance: 1000 }),
  ]);

  expect(sorted.map((item) => item.id)).toEqual([
    "earlier",
    "later",
  ]);
});

test("same due date sorts higher balance first", () => {
  const sorted = sortBursarAccounts([
    account({ id: "small", dueDate: "2026-10-05", balance: 10000 }),
    account({ id: "large", dueDate: "2026-10-05", balance: 50000 }),
  ]);

  expect(sorted.map((item) => item.id)).toEqual([
    "large",
    "small",
  ]);
});

test("missing due dates sort after dated accounts", () => {
  const sorted = sortBursarAccounts([
    account({ id: "missing", dueDate: null, balance: 90000 }),
    account({ id: "dated", dueDate: "2026-12-01", balance: 1000 }),
  ]);

  expect(sorted.map((item) => item.id)).toEqual([
    "dated",
    "missing",
  ]);
});
