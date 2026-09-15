export type ClassLevelStatus = "active" | "inactive" | "archived";

export type ClassLevelInput = {
  educationLevelId: string;
  code: string;
  name: string;
  displayOrder: string | number;
  status: string;
};

export type ValidatedClassLevelInput = {
  educationLevelId: string;
  code: string;
  name: string;
  displayOrder: number;
  status: ClassLevelStatus;
};

const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

const VALID_STATUSES: ClassLevelStatus[] = [
  "active",
  "inactive",
  "archived",
];

export function validateClassLevelInput(
  input: ClassLevelInput
): ValidatedClassLevelInput {
  const educationLevelId = input.educationLevelId.trim();
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  const displayOrder =
    typeof input.displayOrder === "number"
      ? input.displayOrder
      : Number(input.displayOrder);
  const status = input.status.trim().toLowerCase();

  if (!educationLevelId) {
    throw new Error("Education level is required.");
  }

  if (!code) {
    throw new Error("Class level code is required.");
  }

  if (!CODE_PATTERN.test(code)) {
    throw new Error(
      "Class level code must contain only letters, numbers, and single hyphens between segments."
    );
  }

  if (!name) {
    throw new Error("Class level name is required.");
  }

  if (!Number.isInteger(displayOrder) || displayOrder < 0) {
    throw new Error("Display order must be a whole number greater than or equal to 0.");
  }

  if (!VALID_STATUSES.includes(status as ClassLevelStatus)) {
    throw new Error("Invalid class level status.");
  }

  return {
    educationLevelId,
    code,
    name,
    displayOrder,
    status: status as ClassLevelStatus,
  };
}