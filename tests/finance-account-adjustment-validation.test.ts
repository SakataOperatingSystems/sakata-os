import { describe, expect, it } from "vitest";

import {
  validateStudentFeeAccountSupportAdjustment,
} from "../app/school/finance/accounts-validation";

describe("student fee account support adjustment validation", () => {
  it("accepts zero support with a correction reason", () => {
    expect(
      validateStudentFeeAccountSupportAdjustment({
        newApprovedSupportAmount: "0",
        reason: "Admission support was entered against the wrong student obligation.",
      })
    ).toEqual({
      valid: true,
      newApprovedSupportAmount: 0,
      reason:
        "Admission support was entered against the wrong student obligation.",
    });
  });

  it("accepts a positive support amount", () => {
    const result = validateStudentFeeAccountSupportAdjustment({
      newApprovedSupportAmount: "50000",
      reason: "Approved bursary support was corrected after verification.",
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.newApprovedSupportAmount).toBe(50000);
    }
  });

  it("rejects negative support", () => {
    expect(
      validateStudentFeeAccountSupportAdjustment({
        newApprovedSupportAmount: "-1",
        reason: "Correction",
      })
    ).toEqual({
      valid: false,
      errors: ["Approved support must be zero or greater."],
    });
  });

  it("requires a correction reason", () => {
    expect(
      validateStudentFeeAccountSupportAdjustment({
        newApprovedSupportAmount: "0",
        reason: "   ",
      })
    ).toEqual({
      valid: false,
      errors: ["A correction reason is required."],
    });
  });

  it("rejects an excessively long correction reason", () => {
    expect(
      validateStudentFeeAccountSupportAdjustment({
        newApprovedSupportAmount: "0",
        reason: "x".repeat(501),
      })
    ).toEqual({
      valid: false,
      errors: ["The correction reason must be 500 characters or fewer."],
    });
  });
});
