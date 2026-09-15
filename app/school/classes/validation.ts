const CLASS_STATUSES = [
  "planned",
  "active",
  "closed",
  "cancelled",
] as const;

export type ClassStatus = (typeof CLASS_STATUSES)[number];

export interface ClassInput {
  name: string;
  code: string;
  educationLevelId: string;
  classLevelId: string;
  stream: string | null;
  status: ClassStatus;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateClassInput(formData: FormData): ClassInput {
  const name = String(formData.get("name") ?? "").trim();
  const rawCode = String(formData.get("code") ?? "").trim();
  const educationLevelId = String(
    formData.get("education_level_id") ?? ""
  ).trim();
  const classLevelId = String(
    formData.get("class_level_id") ?? ""
  ).trim();
  const rawStream = String(formData.get("stream") ?? "");
  const stream = rawStream.trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!name) {
    throw new Error("Class name is required.");
  }

  if (!rawCode) {
    throw new Error("Class code is required.");
  }

  const code = rawCode.toUpperCase();

  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)) {
    throw new Error(
      "Class code must contain only uppercase letters, numbers, and hyphens."
    );
  }

  if (!educationLevelId) {
    throw new Error("Education level is required.");
  }

  if (!UUID_PATTERN.test(educationLevelId)) {
    throw new Error("Invalid education level selection.");
  }

  if (!classLevelId) {
    throw new Error("Class level is required.");
  }

  if (!UUID_PATTERN.test(classLevelId)) {
    throw new Error("Invalid class level selection.");
  }

  if (rawStream.length > 0 && stream === "") {
    throw new Error("Stream cannot be empty when provided.");
  }

  if (!CLASS_STATUSES.includes(status as ClassStatus)) {
    throw new Error("Invalid class status.");
  }

  return {
    name,
    code,
    educationLevelId,
    classLevelId,
    stream: stream || null,
    status: status as ClassStatus,
  };
}