const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "excused",
] as const;

export type AttendanceStatus =
  (typeof ATTENDANCE_STATUSES)[number];

export interface AttendanceInput {
  enrollmentId: string;
  attendanceDate: string;
  status: AttendanceStatus;
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

export function validateAttendanceInput(
  formData: FormData
): AttendanceInput {
  const enrollmentId = String(
    formData.get("enrollment_id") ?? ""
  ).trim();

  const attendanceDate = String(
    formData.get("attendance_date") ?? ""
  ).trim();

  const status = String(
    formData.get("status") ?? ""
  ).trim();

  const rawNotes = String(
    formData.get("notes") ?? ""
  );

  const notes = rawNotes.trim();

  validateUuid(enrollmentId, "Enrollment");
  validateDate(attendanceDate, "Attendance date");

  if (
    !ATTENDANCE_STATUSES.includes(
      status as AttendanceStatus
    )
  ) {
    throw new Error("Invalid attendance status.");
  }

  if (rawNotes.length > 0 && notes === "") {
    throw new Error("Notes cannot be empty when provided.");
  }

  if (notes.length > 2000) {
    throw new Error("Notes must be 2000 characters or fewer.");
  }

  return {
    enrollmentId,
    attendanceDate,
    status: status as AttendanceStatus,
    notes: notes || null,
  };
}
