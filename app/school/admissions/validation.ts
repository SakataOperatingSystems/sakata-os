const ADMISSION_REQUEST_STATUSES = [
  "open",
  "approved",
  "rejected",
  "withdrawn",
  "converted",
] as const;

const ADMISSION_GENDERS = [
  "male",
  "female",
  "other",
] as const;

export type AdmissionRequestStatus =
  (typeof ADMISSION_REQUEST_STATUSES)[number];

export type AdmissionGender =
  (typeof ADMISSION_GENDERS)[number];

export interface AdmissionRequestInput {
  admissionRequestId: string;
  applicantName: string;
  applicantGender: AdmissionGender | null;
  applicantDateOfBirth: string | null;
  requestedAdmissionDate: string | null;
  status: AdmissionRequestStatus;
  notes: string | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validateOptionalDate(
  value: string,
  label: string
): string | null {
  if (!value) {
    return null;
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

  return value;
}

export function validateAdmissionRequestInput(
  formData: FormData
): AdmissionRequestInput {
  const admissionRequestId = String(
    formData.get("admission_request_id") ?? ""
  ).trim();

  const applicantName = String(
    formData.get("applicant_name") ?? ""
  ).trim();

  const rawGender = String(
    formData.get("applicant_gender") ?? ""
  ).trim();

  const rawDateOfBirth = String(
    formData.get("applicant_date_of_birth") ?? ""
  ).trim();

  const rawRequestedAdmissionDate = String(
    formData.get("requested_admission_date") ?? ""
  ).trim();

  const status = String(
    formData.get("status") ?? "open"
  ).trim();

  const rawNotes = String(
    formData.get("notes") ?? ""
  );

  const notes = rawNotes.trim();

  if (!admissionRequestId) {
    throw new Error("Admission request ID is required.");
  }

  if (admissionRequestId.length > 100) {
    throw new Error(
      "Admission request ID must be 100 characters or fewer."
    );
  }

  if (!applicantName) {
    throw new Error("Applicant name is required.");
  }

  if (applicantName.length > 200) {
    throw new Error(
      "Applicant name must be 200 characters or fewer."
    );
  }

  if (
    rawGender &&
    !ADMISSION_GENDERS.includes(
      rawGender as AdmissionGender
    )
  ) {
    throw new Error("Invalid applicant gender.");
  }

  if (
    !ADMISSION_REQUEST_STATUSES.includes(
      status as AdmissionRequestStatus
    )
  ) {
    throw new Error("Invalid admission request status.");
  }

  const applicantDateOfBirth = validateOptionalDate(
    rawDateOfBirth,
    "Date of birth"
  );

  const requestedAdmissionDate = validateOptionalDate(
    rawRequestedAdmissionDate,
    "Requested admission date"
  );

  if (rawNotes.length > 0 && notes === "") {
    throw new Error("Notes cannot be empty when provided.");
  }

  if (notes.length > 2000) {
    throw new Error(
      "Notes must be 2000 characters or fewer."
    );
  }

  return {
    admissionRequestId,
    applicantName,
    applicantGender: rawGender
      ? (rawGender as AdmissionGender)
      : null,
    applicantDateOfBirth,
    requestedAdmissionDate,
    status: status as AdmissionRequestStatus,
    notes: notes || null,
  };
}
