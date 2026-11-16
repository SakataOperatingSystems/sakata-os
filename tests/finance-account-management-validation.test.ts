import { describe, expect, it } from "vitest";

import {
  validateStudentFeeAccountDueDateAdjustment,
} from "../app/school/finance/accounts-validation";

describe("student fee account due date adjustment validation", () => {
  it("accepts a valid due date and reason", () => {
    expect(
      validateStudentFeeAccountDueDateAdjustment({
        newDueDate: "2026-10-15",
        reason: "School finance confirmed the corrected payment deadline.",
      })
    ).toEqual({
      valid: true,
      newDueDate: "2026-10-15",
      reason: "School finance confirmed the corrected payment deadline.",
    });
  });

  it("accepts a blank due date with a reason", () => {
    expect(
      validateStudentFeeAccountDueDateAdjustment({
        newDueDate: "",
        reason:
          "The account should not carry a deadline until the fee is scheduled.",
      })
    ).toEqual({
      valid: true,
      newDueDate: null,
      reason:
        "The account should not carry a deadline until the fee is scheduled.",
    });
  });

  it("rejects an invalid calendar date", () => {
    const result = validateStudentFeeAccountDueDateAdjustment({
      newDueDate: "2026-02-31",
      reason: "Correcting the invalid deadline.",
    });

    expect(result.valid).toBe(false);
  });

  it("requires a correction reason", () => {
    const result = validateStudentFeeAccountDueDateAdjustment({
      newDueDate: "2026-10-15",
      reason: "",
    });

    expect(result.valid).toBe(false);
  });

  it("rejects an excessively long correction reason", () => {
    const result = validateStudentFeeAccountDueDateAdjustment({
      newDueDate: "2026-10-15",
      reason: "x".repeat(501),
    });

    expect(result.valid).toBe(false);
  });
});
