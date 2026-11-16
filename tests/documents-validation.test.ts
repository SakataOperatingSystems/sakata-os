import { describe, expect, it } from "vitest";
import {
  DOCUMENT_CATEGORIES,
  validateDocumentId,
  validateDocumentInput,
} from "@/app/documents/validation";

function createDocumentForm(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("document register validation", () => {
  it("accepts valid metadata and normalizes optional fields", () => {
    expect(
      validateDocumentInput(
        createDocumentForm({
          title: "  Safety policy ",
          category: "policy",
          reference_number: "  POL-01 ",
          description: "  Reviewed annually. ",
        }),
      ),
    ).toEqual({
      title: "Safety policy",
      category: "policy",
      referenceNumber: "POL-01",
      description: "Reviewed annually.",
    });
  });

  it("accepts all documented categories", () => {
    for (const category of DOCUMENT_CATEGORIES) {
      expect(() =>
        validateDocumentInput(
          createDocumentForm({ title: "Record", category }),
        ),
      ).not.toThrow();
    }
  });

  it("requires a non-empty title", () => {
    expect(() =>
      validateDocumentInput(
        createDocumentForm({ title: "  ", category: "general" }),
      ),
    ).toThrow("Document title is required.");
  });

  it("rejects unsupported categories and overlong metadata", () => {
    expect(() =>
      validateDocumentInput(
        createDocumentForm({ title: "Record", category: "unknown" }),
      ),
    ).toThrow("Select a valid document category.");
    expect(() =>
      validateDocumentInput(
        createDocumentForm({
          title: "x".repeat(201),
          category: "general",
        }),
      ),
    ).toThrow("Document title must be 200 characters or fewer.");
    expect(() =>
      validateDocumentInput(
        createDocumentForm({
          title: "Record",
          category: "general",
          description: "x".repeat(5001),
        }),
      ),
    ).toThrow("Description must be 5000 characters or fewer.");
  });

  it("accepts only UUID record identifiers", () => {
    expect(
      validateDocumentId("  123e4567-e89b-42d3-a456-426614174000  "),
    ).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(() => validateDocumentId("another-organization-document"))
      .toThrow("Invalid document ID.");
  });

  it("does not accept organization identifiers as metadata input", () => {
    const input = validateDocumentInput(
      createDocumentForm({
        title: "Record",
        category: "general",
        organization_id: "123e4567-e89b-42d3-a456-426614174000",
      }),
    );

    expect(input).not.toHaveProperty("organization_id");
  });
});
