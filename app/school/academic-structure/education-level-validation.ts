export type EducationLevelInput = {
  code: string;
  name: string;
  displayOrder: string;
  status: string;
};

export type ValidatedEducationLevel = {
  code: string;
  name: string;
  displayOrder: number;
  status: "active" | "inactive" | "archived";
};

export function validateEducationLevel(
  input: EducationLevelInput
): ValidatedEducationLevel {
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  const displayOrderRaw = input.displayOrder.trim();
  const status = input.status.trim();

  if (!code) {
    throw new Error("Education level code is required.");
  }

  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)) {
    throw new Error(
      "Education level code must use uppercase letters, numbers, and hyphens."
    );
  }

  if (!name) {
    throw new Error("Education level name is required.");
  }

  const displayOrder = Number(displayOrderRaw);

  if (
    !Number.isInteger(displayOrder) ||
    displayOrder < 0
  ) {
    throw new Error("Display order must be a whole number of 0 or greater.");
  }

  if (
    status !== "active" &&
    status !== "inactive" &&
    status !== "archived"
  ) {
    throw new Error("Invalid education level status.");
  }

  return {
    code,
    name,
    displayOrder,
    status,
  };
}