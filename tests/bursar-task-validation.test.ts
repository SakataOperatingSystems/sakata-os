import { describe, expect, it } from "vitest";
import {
  getBursarFollowUpTaskDetails,
  getBursarOperationalState,
  type BursarAccount,
} from "../app/school/finance/bursar/validation";

const baseAccount: BursarAccount = {
  id: "11111111-1111-4111-8111-111111111111",
  studentName: "Amina Example",
  feeItem: "Tuition",
  feeCategory: "School Fees",
  grossRequired: 1000000,
  approvedSupport: 0,
  netRequired: 1000000,
  confirmedPayments: 250000,
  balance: 750000,
  dueDate: "2026-10-01",
  status: "open",
};

describe("Bursar follow-up task details", () => {
  it("creates an overdue follow-up task with the fee due date", () => {
    const result = getBursarFollowUpTaskDetails(baseAccount, "2026-10-06");

    expect(getBursarOperationalState(baseAccount, "2026-10-06").state)
      .toBe("overdue");
    expect(result).not.toBeNull();
    expect(result?.title).toContain("Fee follow-up");
    expect(result?.description).toContain("Amina Example");
    expect(result?.description).toContain("UGX 750,000");
    expect(result?.priority).toBe("normal");
    expect(result?.dueAt).toBe("2026-10-01T23:59:59.999Z");
  });

  it("creates a deadline-review task when the account has no due date", () => {
    const account = { ...baseAccount, dueDate: null };
    const result = getBursarFollowUpTaskDetails(account, "2026-10-06");

    expect(getBursarOperationalState(account, "2026-10-06").state)
      .toBe("no_deadline");
    expect(result?.title).toContain("Fee deadline review");
    expect(result?.description).toContain("Deadline missing");
    expect(result?.dueAt).toBeNull();
  });

  it("does not create an exception task for a current account", () => {
    const account = { ...baseAccount, dueDate: "2026-10-10" };

    expect(getBursarFollowUpTaskDetails(account, "2026-10-06"))
      .toBeNull();
  });
});
