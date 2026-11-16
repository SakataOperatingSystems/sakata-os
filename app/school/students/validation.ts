const STUDENT_STATUSES = [
  "active",
  "inactive",
  "graduated",
  "withdrawn",
  "transferred",
  "deceased",
] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export interface StudentInput {
  fullName: string;
  gender: string | null;
  dateOfBirth: string | null;
  admissionDate: string | null;
  nin: string | null;
  status: StudentStatus;
  welfareStatus: string | null;
  location: string | null;
  notes: string | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const GENDERS = [
  "male",
  "female",
  "other",
  "unspecified",
] as const;

export function validateStudentInput(
  formData: FormData
): StudentInput {
  const fullName = String(
    formData.get("full_name") ?? ""
  ).trim();

  const rawGender = String(
    formData.get("gender") ?? ""
  ).trim();

  const rawDateOfBirth = String(
    formData.get("date_of_birth") ?? ""
  ).trim();

  const rawAdmissionDate = String(
    formData.get("admission_date") ?? ""
  ).trim();

  const rawNin = String(
    formData.get("nin") ?? ""
  ).trim();

  const status = String(
    formData.get("status") ?? ""
  ).trim();

  const rawWelfareStatus = String(
    formData.get("welfare_status") ?? ""
  );

  const rawLocation = String(
    formData.get("location") ?? ""
  );

  const rawNotes = String(
    formData.get("notes") ?? ""
  );

  const welfareStatus = rawWelfareStatus.trim();
  const location = rawLocation.trim();
  const notes = rawNotes.trim();

  if (!fullName) {
    throw new Error("Student name is required.");
  }

  if (fullName.length > 200) {
    throw new Error("Student name must be 200 characters or fewer.");
  }

  if (
    rawGender &&
    !GENDERS.includes(rawGender as (typeof GENDERS)[number])
  ) {
    throw new Error("Invalid student gender.");
  }

  if (rawDateOfBirth && !DATE_PATTERN.test(rawDateOfBirth)) {
    throw new Error("Date of birth must use YYYY-MM-DD format.");
  }

  if (rawAdmissionDate && !DATE_PATTERN.test(rawAdmissionDate)) {
    throw new Error("Admission date must use YYYY-MM-DD format.");
  }

  if (!STUDENT_STATUSES.includes(status as StudentStatus)) {
    throw new Error("Invalid student status.");
  }

  if (welfareStatus.length > 200) {
    throw new Error(
      "Welfare status must be 200 characters or fewer."
    );
  }

  if (location.length > 200) {
    throw new Error(
      "Location must be 200 characters or fewer."
    );
  }

  if (notes.length > 2000) {
    throw new Error("Notes must be 2000 characters or fewer.");
  }

  return {
    fullName,
    gender: rawGender || null,
    dateOfBirth: rawDateOfBirth || null,
    admissionDate: rawAdmissionDate || null,
    nin: rawNin || null,
    status: status as StudentStatus,
    welfareStatus: welfareStatus || null,
    location: location || null,
    notes: notes || null,
  };
}
