import { describe, expect, it } from "vitest";
import { getStudentOperatorState } from "../app/school/students/operator-state";

describe("student operator state", () => {
  it("prioritizes inactive student status", () => {
    const result = getStudentOperatorState({
      studentStatus: "withdrawn",
      hasActiveEnrollment: false,
      attendanceRecordedToday: false,
      balance: 50000,
      isOverdue: true,
    });

    expect(result.nextAction).toBe("Review student status");
    expect(result.exceptions).toContain("inactive_student");
  });

  it("flags missing enrollment before attendance", () => {
    const result = getStudentOperatorState({
      studentStatus: "active",
      hasActiveEnrollment: false,
      attendanceRecordedToday: false,
      balance: 0,
      isOverdue: false,
    });

    expect(result.nextAction).toBe("Create enrollment");
    expect(result.exceptions).toContain("no_active_enrollment");
    expect(result.exceptions).not.toContain("missing_attendance");
  });

  it("flags missing attendance for an enrolled active student", () => {
    const result = getStudentOperatorState({
      studentStatus: "active",
      hasActiveEnrollment: true,
      attendanceRecordedToday: false,
      balance: 0,
      isOverdue: false,
    });

    expect(result.nextAction).toBe("Record today's attendance");
    expect(result.exceptions).toContain("missing_attendance");
  });

  it("prioritizes overdue finance after attendance is complete", () => {
    const result = getStudentOperatorState({
      studentStatus: "active",
      hasActiveEnrollment: true,
      attendanceRecordedToday: true,
      balance: 50000,
      isOverdue: true,
    });

    expect(result.nextAction).toBe("Resolve overdue balance");
    expect(result.exceptions).toContain("outstanding_balance");
    expect(result.exceptions).toContain("overdue_balance");
  });

  it("reports a clean operational state when all required work is complete", () => {
    const result = getStudentOperatorState({
      studentStatus: "active",
      hasActiveEnrollment: true,
      attendanceRecordedToday: true,
      balance: 0,
      isOverdue: false,
    });

    expect(result.nextAction).toBe("Student record is operational.");
    expect(result.exceptions).toEqual([]);
  });
});