import { describe, expect, it } from "vitest";
import {
  isValidEnrollmentStatusTransition,
  validateEnrollmentInput,
} from "@/app/school/enrollments/validation";

function makeFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

const studentId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";
const academicPeriodId =
  "33333333-3333-4333-8333-333333333333";

describe("enrollment lifecycle validation", () => {
  it("allows active enrollment to close", () => {
    expect(
      isValidEnrollmentStatusTransition("active", "completed")
    ).toBe(true);

    expect(
      isValidEnrollmentStatusTransition("active", "withdrawn")
    ).toBe(true);

    expect(
      isValidEnrollmentStatusTransition("active", "transferred")
    ).toBe(true);

    expect(
      isValidEnrollmentStatusTransition("active", "cancelled")
    ).toBe(true);
  });

  it("rejects reopening terminal enrollment", () => {
    expect(
      isValidEnrollmentStatusTransition("completed", "active")
    ).toBe(false);

    expect(
      isValidEnrollmentStatusTransition("withdrawn", "active")
    ).toBe(false);

    expect(
      isValidEnrollmentStatusTransition("transferred", "active")
    ).toBe(false);

    expect(
      isValidEnrollmentStatusTransition("cancelled", "active")
    ).toBe(false);
  });

  it("validates normal enrollment FormData", () => {
    const result = validateEnrollmentInput(
      makeFormData({
        student_id: studentId,
        class_id: classId,
        academic_period_id: academicPeriodId,
        enrollment_date: "2026-09-17",
        exit_date: "",
        status: "active",
        notes: "Normal active enrollment",
      })
    );

    expect(result.studentId).toBe(studentId);
    expect(result.classId).toBe(classId);
    expect(result.academicPeriodId).toBe(academicPeriodId);
    expect(result.status).toBe("active");
  });

  it("rejects an exit date before enrollment date", () => {
    expect(() =>
      validateEnrollmentInput(
        makeFormData({
          student_id: studentId,
          class_id: classId,
          academic_period_id: academicPeriodId,
          enrollment_date: "2026-09-17",
          exit_date: "2026-09-16",
          status: "completed",
          notes: "",
        })
      )
    ).toThrow();
  });
});
