const ENROLLMENT_STATUSES = [
  "active",
  "completed",
  "withdrawn",
  "transferred",
  "cancelled",
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export interface EnrollmentInput {
  studentId: string;
  classId: string;
  academicPeriodId: string;
  enrollmentDate: string;
  exitDate: string | null;
  status: EnrollmentStatus;
  notes: string | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validateUuid(value: string, label: string): void {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  if (!UUID_PATTERN.test(value)) {
    throw new Error(`Invalid ${label.toLowerCase()} selection.`);
  }
}

function validateDate(value: string, label: string): void {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  if (!DATE_PATTERN.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label.toLowerCase()}.`);
  }

  const [year, month, day] = value.split("-").map(Number);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid ${label.toLowerCase()}.`);
  }
}

export function validateEnrollmentInput(
  formData: FormData
): EnrollmentInput {
  const studentId = String(
    formData.get("student_id") ?? ""
  ).trim();

  const classId = String(
    formData.get("class_id") ?? ""
  ).trim();

  const academicPeriodId = String(
    formData.get("academic_period_id") ?? ""
  ).trim();

  const enrollmentDate = String(
    formData.get("enrollment_date") ?? ""
  ).trim();

  const rawExitDate = String(
    formData.get("exit_date") ?? ""
  ).trim();

  const exitDate = rawExitDate || null;

  const status = String(
    formData.get("status") ?? ""
  ).trim();

  const rawNotes = String(
    formData.get("notes") ?? ""
  );

  const notes = rawNotes.trim();

  validateUuid(studentId, "Student");
  validateUuid(classId, "Class");
  validateUuid(academicPeriodId, "Academic period");

  validateDate(enrollmentDate, "Enrollment date");

  if (exitDate) {
    validateDate(exitDate, "Exit date");

    if (exitDate < enrollmentDate) {
      throw new Error(
        "Exit date cannot be earlier than enrollment date."
      );
    }
  }

  if (!ENROLLMENT_STATUSES.includes(status as EnrollmentStatus)) {
    throw new Error("Invalid enrollment status.");
  }

  if (rawNotes.length > 0 && notes === "") {
    throw new Error("Notes cannot be empty when provided.");
  }

  if (notes.length > 2000) {
    throw new Error("Notes must be 2000 characters or fewer.");
  }

  return {
    studentId,
    classId,
    academicPeriodId,
    enrollmentDate,
    exitDate,
    status: status as EnrollmentStatus,
    notes: notes || null,
  };
}