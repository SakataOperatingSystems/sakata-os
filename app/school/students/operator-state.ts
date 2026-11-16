export type StudentOperatorException =
  | "inactive_student"
  | "no_active_enrollment"
  | "missing_attendance"
  | "outstanding_balance"
  | "overdue_balance";

export type StudentOperatorState = {
  nextAction: string;
  exceptions: StudentOperatorException[];
};

export function getStudentOperatorState(input: {
  studentStatus: string;
  hasActiveEnrollment: boolean;
  attendanceRecordedToday: boolean;
  balance: number;
  isOverdue: boolean;
}): StudentOperatorState {
  const exceptions: StudentOperatorException[] = [];

  if (input.studentStatus !== "active") {
    exceptions.push("inactive_student");
  }

  if (input.studentStatus === "active" && !input.hasActiveEnrollment) {
    exceptions.push("no_active_enrollment");
  }

  if (
    input.studentStatus === "active" &&
    input.hasActiveEnrollment &&
    !input.attendanceRecordedToday
  ) {
    exceptions.push("missing_attendance");
  }

  if (input.balance > 0) {
    exceptions.push("outstanding_balance");
  }

  if (input.isOverdue && input.balance > 0) {
    exceptions.push("overdue_balance");
  }

  let nextAction = "Student record is operational.";

  if (input.studentStatus !== "active") {
    nextAction = "Review student status";
  } else if (!input.hasActiveEnrollment) {
    nextAction = "Create enrollment";
  } else if (!input.attendanceRecordedToday) {
    nextAction = "Record today's attendance";
  } else if (input.isOverdue && input.balance > 0) {
    nextAction = "Resolve overdue balance";
  } else if (input.balance > 0) {
    nextAction = "Review outstanding fees";
  }

  return {
    nextAction,
    exceptions,
  };
}