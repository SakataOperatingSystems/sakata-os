import { describe, expect, it } from "vitest";
import {
  validateAcademicPeriodInput,
} from "../app/school/academic-periods/validation";

function createFormData(
  overrides: Record<string, string> = {}
): FormData {
  const values = {
    name: "Term 1",
    code: "TERM-1-2026",
    academic_year: "2026",
    period_number: "1",
    start_date: "2026-02-02",
    end_date: "2026-05-01",
    status: "planned",
    ...overrides,
  };

  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("validateAcademicPeriodInput", () => {
  it("accepts valid academic period input", () => {
    const result = validateAcademicPeriodInput(createFormData());

    expect(result).toEqual({
      name: "Term 1",
      code: "TERM-1-2026",
      academicYear: 2026,
      periodNumber: 1,
      startDate: "2026-02-02",
      endDate: "2026-05-01",
      status: "planned",
    });
  });

  it("normalizes the period name and code", () => {
    const result = validateAcademicPeriodInput(
      createFormData({
        name: "  Term 1  ",
        code: "  term-1-2026  ",
      })
    );

    expect(result.name).toBe("Term 1");
    expect(result.code).toBe("TERM-1-2026");
  });

  it("rejects a missing period name", () => {
    expect(() =>
      validateAcademicPeriodInput(
        createFormData({
          name: "",
        })
      )
    ).toThrow("Academic period name is required.");
  });

  it("rejects a missing period code", () => {
    expect(() =>
      validateAcademicPeriodInput(
        createFormData({
          code: "",
        })
      )
    ).toThrow("Academic period code is required.");
  });

  it("rejects an academic year outside the allowed range", () => {
    expect(() =>
      validateAcademicPeriodInput(
        createFormData({
          academic_year: "1999",
        })
      )
    ).toThrow("Academic year must be between 2000 and 2100.");
  });

  it("rejects a period number outside the allowed range", () => {
    expect(() =>
      validateAcademicPeriodInput(
        createFormData({
          period_number: "21",
        })
      )
    ).toThrow("Period number must be between 1 and 20.");
  });

  it("rejects an end date before the start date", () => {
    expect(() =>
      validateAcademicPeriodInput(
        createFormData({
          start_date: "2026-02-02",
          end_date: "2026-01-01",
        })
      )
    ).toThrow("End date cannot be before start date.");
  });

  it("rejects an invalid status", () => {
    expect(() =>
      validateAcademicPeriodInput(
        createFormData({
          status: "invalid",
        })
      )
    ).toThrow("Invalid academic period status.");
  });

  it("accepts every supported academic period status", () => {
    for (const status of [
      "planned",
      "active",
      "closed",
      "cancelled",
    ]) {
      expect(() =>
        validateAcademicPeriodInput(
          createFormData({
            status,
          })
        )
      ).not.toThrow();
    }
  });
});