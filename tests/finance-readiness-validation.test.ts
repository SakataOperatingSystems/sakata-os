import { describe, expect, it } from "vitest";

import {
  isFeeStructureApplicableToEnrollment,
} from "../app/school/finance/accounts-validation";

describe("fee structure enrollment applicability", () => {
  it("accepts an all-class fee in the enrolled academic period", () => {
    expect(
      isFeeStructureApplicableToEnrollment(
        {
          academicPeriodId: "term-3",
          classId: null,
        },
        {
          academicPeriodId: "term-3",
          classId: "p1",
        }
      )
    ).toBe(true);
  });

  it("accepts a class-specific fee for the enrolled class", () => {
    expect(
      isFeeStructureApplicableToEnrollment(
        {
          academicPeriodId: "term-3",
          classId: "p1",
        },
        {
          academicPeriodId: "term-3",
          classId: "p1",
        }
      )
    ).toBe(true);
  });

  it("rejects a class-specific fee for another class", () => {
    expect(
      isFeeStructureApplicableToEnrollment(
        {
          academicPeriodId: "term-3",
          classId: "p2",
        },
        {
          academicPeriodId: "term-3",
          classId: "p1",
        }
      )
    ).toBe(false);
  });

  it("rejects a fee structure from another academic period", () => {
    expect(
      isFeeStructureApplicableToEnrollment(
        {
          academicPeriodId: "term-2",
          classId: null,
        },
        {
          academicPeriodId: "term-3",
          classId: "p1",
        }
      )
    ).toBe(false);
  });
});