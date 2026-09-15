import { describe, expect, it } from "vitest";
import {
  validateClassInput,
} from "../app/school/classes/validation";

const EDUCATION_LEVEL_ID = "11111111-1111-4111-8111-111111111111";
const CLASS_LEVEL_ID = "22222222-2222-4222-8222-222222222222";

function createFormData(
  overrides: Record<string, string> = {}
): FormData {
  const values = {
    name: "P1 A",
    code: "P1-A",
    education_level_id: EDUCATION_LEVEL_ID,
    class_level_id: CLASS_LEVEL_ID,
    stream: "",
    status: "planned",
    ...overrides,
  };

  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("validateClassInput", () => {
  it("accepts valid class input", () => {
    const result = validateClassInput(createFormData());

    expect(result).toEqual({
      name: "P1 A",
      code: "P1-A",
      educationLevelId: EDUCATION_LEVEL_ID,
      classLevelId: CLASS_LEVEL_ID,
      stream: null,
      status: "planned",
    });
  });

  it("normalizes class name, code, IDs, and stream", () => {
    const result = validateClassInput(
      createFormData({
        name: "  P1 A  ",
        code: "  p1-a  ",
        education_level_id: `  ${EDUCATION_LEVEL_ID}  `,
        class_level_id: `  ${CLASS_LEVEL_ID}  `,
        stream: "  A  ",
      })
    );

    expect(result).toEqual({
      name: "P1 A",
      code: "P1-A",
      educationLevelId: EDUCATION_LEVEL_ID,
      classLevelId: CLASS_LEVEL_ID,
      stream: "A",
      status: "planned",
    });
  });

  it("converts an empty stream to null", () => {
    const result = validateClassInput(
      createFormData({
        stream: "",
      })
    );

    expect(result.stream).toBeNull();
  });

  it("rejects a missing class name", () => {
    expect(() =>
      validateClassInput(
        createFormData({
          name: "",
        })
      )
    ).toThrow("Class name is required.");
  });

  it("rejects a missing class code", () => {
    expect(() =>
      validateClassInput(
        createFormData({
          code: "",
        })
      )
    ).toThrow("Class code is required.");
  });

  it("rejects an invalid class code format", () => {
    expect(() =>
      validateClassInput(
        createFormData({
          code: "P1 A",
        })
      )
    ).toThrow(
      "Class code must contain only uppercase letters, numbers, and hyphens."
    );
  });

  it("rejects a missing education level", () => {
    expect(() =>
      validateClassInput(
        createFormData({
          education_level_id: "",
        })
      )
    ).toThrow("Education level is required.");
  });

  it("rejects an invalid education level ID", () => {
    expect(() =>
      validateClassInput(
        createFormData({
          education_level_id: "Primary",
        })
      )
    ).toThrow("Invalid education level selection.");
  });

  it("rejects a missing class level", () => {
    expect(() =>
      validateClassInput(
        createFormData({
          class_level_id: "",
        })
      )
    ).toThrow("Class level is required.");
  });

  it("rejects an invalid class level ID", () => {
    expect(() =>
      validateClassInput(
        createFormData({
          class_level_id: "P1",
        })
      )
    ).toThrow("Invalid class level selection.");
  });

  it("rejects a stream containing only whitespace", () => {
    expect(() =>
      validateClassInput(
        createFormData({
          stream: "   ",
        })
      )
    ).toThrow("Stream cannot be empty when provided.");
  });

  it("rejects an invalid status", () => {
    expect(() =>
      validateClassInput(
        createFormData({
          status: "invalid",
        })
      )
    ).toThrow("Invalid class status.");
  });

  it("accepts every supported class status", () => {
    for (const status of [
      "planned",
      "active",
      "closed",
      "cancelled",
    ]) {
      expect(() =>
        validateClassInput(
          createFormData({
            status,
          })
        )
      ).not.toThrow();
    }
  });
});