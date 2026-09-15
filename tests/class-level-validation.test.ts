import { describe, expect, it } from "vitest";
import { validateClassLevelInput } from "../app/school/academic-structure/class-level-validation";

describe("validateClassLevelInput", () => {
  it("accepts valid class level input", () => {
    expect(
      validateClassLevelInput({
        educationLevelId: "education-level-id",
        code: "P1",
        name: "Primary One",
        displayOrder: "1",
        status: "active",
      })
    ).toEqual({
      educationLevelId: "education-level-id",
      code: "P1",
      name: "Primary One",
      displayOrder: 1,
      status: "active",
    });
  });

  it("normalizes code and name", () => {
    expect(
      validateClassLevelInput({
        educationLevelId: "education-level-id",
        code: " p2 ",
        name: " Primary Two ",
        displayOrder: "2",
        status: "ACTIVE",
      })
    ).toEqual({
      educationLevelId: "education-level-id",
      code: "P2",
      name: "Primary Two",
      displayOrder: 2,
      status: "active",
    });
  });

  it("requires an education level", () => {
    expect(() =>
      validateClassLevelInput({
        educationLevelId: "",
        code: "P1",
        name: "Primary One",
        displayOrder: "1",
        status: "active",
      })
    ).toThrow("Education level is required.");
  });

  it("requires a class level code", () => {
    expect(() =>
      validateClassLevelInput({
        educationLevelId: "education-level-id",
        code: "",
        name: "Primary One",
        displayOrder: "1",
        status: "active",
      })
    ).toThrow("Class level code is required.");
  });

  it("rejects an invalid class level code", () => {
    expect(() =>
      validateClassLevelInput({
        educationLevelId: "education-level-id",
        code: "P 1",
        name: "Primary One",
        displayOrder: "1",
        status: "active",
      })
    ).toThrow(
      "Class level code must contain only letters, numbers, and single hyphens between segments."
    );
  });

  it("requires a class level name", () => {
    expect(() =>
      validateClassLevelInput({
        educationLevelId: "education-level-id",
        code: "P1",
        name: "",
        displayOrder: "1",
        status: "active",
      })
    ).toThrow("Class level name is required.");
  });

  it("requires a non-negative integer display order", () => {
    expect(() =>
      validateClassLevelInput({
        educationLevelId: "education-level-id",
        code: "P1",
        name: "Primary One",
        displayOrder: "-1",
        status: "active",
      })
    ).toThrow(
      "Display order must be a whole number greater than or equal to 0."
    );
  });

  it("rejects a non-integer display order", () => {
    expect(() =>
      validateClassLevelInput({
        educationLevelId: "education-level-id",
        code: "P1",
        name: "Primary One",
        displayOrder: "1.5",
        status: "active",
      })
    ).toThrow(
      "Display order must be a whole number greater than or equal to 0."
    );
  });

  it("accepts inactive status", () => {
    expect(
      validateClassLevelInput({
        educationLevelId: "education-level-id",
        code: "P1",
        name: "Primary One",
        displayOrder: "1",
        status: "inactive",
      }).status
    ).toBe("inactive");
  });

  it("accepts archived status", () => {
    expect(
      validateClassLevelInput({
        educationLevelId: "education-level-id",
        code: "P1",
        name: "Primary One",
        displayOrder: "1",
        status: "archived",
      }).status
    ).toBe("archived");
  });

  it("rejects an invalid status", () => {
    expect(() =>
      validateClassLevelInput({
        educationLevelId: "education-level-id",
        code: "P1",
        name: "Primary One",
        displayOrder: "1",
        status: "deleted",
      })
    ).toThrow("Invalid class level status.");
  });
});