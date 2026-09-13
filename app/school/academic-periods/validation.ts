export const ALLOWED_ACADEMIC_PERIOD_STATUSES = [
  "planned",
  "active",
  "closed",
  "cancelled",
] as const;

export type AcademicPeriodStatus =
  (typeof ALLOWED_ACADEMIC_PERIOD_STATUSES)[number];

export type ValidatedAcademicPeriodInput = {
  name: string;
  code: string;
  academicYear: number;
  periodNumber: number;
  startDate: string;
  endDate: string;
  status: AcademicPeriodStatus;
};

export function validateAcademicPeriodInput(
  formData: FormData
): ValidatedAcademicPeriodInput {
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const academicYear = Number(formData.get("academic_year"));
  const periodNumber = Number(formData.get("period_number"));
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const status = String(formData.get("status") ?? "planned").trim();

  if (!name) {
    throw new Error("Academic period name is required.");
  }

  if (!code) {
    throw new Error("Academic period code is required.");
  }

  if (!Number.isInteger(academicYear)) {
    throw new Error("Academic year must be a whole number.");
  }

  if (academicYear < 2000 || academicYear > 2100) {
    throw new Error("Academic year must be between 2000 and 2100.");
  }

  if (!Number.isInteger(periodNumber)) {
    throw new Error("Period number must be a whole number.");
  }

  if (periodNumber < 1 || periodNumber > 20) {
    throw new Error("Period number must be between 1 and 20.");
  }

  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required.");
  }

  if (endDate < startDate) {
    throw new Error("End date cannot be before start date.");
  }

  if (
    !ALLOWED_ACADEMIC_PERIOD_STATUSES.includes(
      status as AcademicPeriodStatus
    )
  ) {
    throw new Error("Invalid academic period status.");
  }

  return {
    name,
    code,
    academicYear,
    periodNumber,
    startDate,
    endDate,
    status: status as AcademicPeriodStatus,
  };
}