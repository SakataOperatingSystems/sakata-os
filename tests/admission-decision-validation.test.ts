import { describe, expect, it } from "vitest";
import {
  validateAdmissionDecisionEvidence,
} from "../app/school/admissions/validation";

describe("admission decision evidence", () => {
  it("accepts an approval with a decision reason", () => {
    expect(
      validateAdmissionDecisionEvidence({
        decisionCode: "approve_admission",
        decisionReason: "Required admission information was verified.",
      })
    ).toEqual({
      valid: true,
      decisionCode: "approve_admission",
      decisionReason:
        "Required admission information was verified.",
    });
  });

  it("accepts a rejection with a decision reason", () => {
    expect(
      validateAdmissionDecisionEvidence({
        decisionCode: "reject_admission",
        decisionReason: "Admission requirements were not satisfied.",
      })
    ).toEqual({
      valid: true,
      decisionCode: "reject_admission",
      decisionReason:
        "Admission requirements were not satisfied.",
    });
  });

  it("accepts request changes with a decision note", () => {
    expect(
      validateAdmissionDecisionEvidence({
        decisionCode: "request_admission_changes",
        decisionReason:
          "Birth documentation and previous school record are still required.",
      })
    ).toEqual({
      valid: true,
      decisionCode: "request_admission_changes",
      decisionReason:
        "Birth documentation and previous school record are still required.",
    });
  });

  it("rejects an empty decision reason", () => {
    const result = validateAdmissionDecisionEvidence({
      decisionCode: "approve_admission",
      decisionReason: "   ",
    });

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(result.errors).toContain(
        "A decision reason or decision note is required."
      );
    }
  });

  it("rejects an invalid decision code", () => {
    const result = validateAdmissionDecisionEvidence({
      decisionCode: "something_else",
      decisionReason: "Some reason.",
    });

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(result.errors).toContain(
        "Invalid admission decision."
      );
    }
  });
});