export const DOCUMENT_CATEGORIES = [
  "general",
  "policy",
  "contract",
  "financial",
  "personnel",
  "compliance",
  "other",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export type DocumentInput = {
  title: string;
  category: DocumentCategory;
  referenceNumber: string | null;
  description: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateDocumentInput(formData: FormData): DocumentInput {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const rawReferenceNumber = String(
    formData.get("reference_number") ?? "",
  );
  const referenceNumber = rawReferenceNumber.trim();
  const rawDescription = String(formData.get("description") ?? "");
  const description = rawDescription.trim();

  if (!title) {
    throw new Error("Document title is required.");
  }

  if (title.length > 200) {
    throw new Error("Document title must be 200 characters or fewer.");
  }

  if (!DOCUMENT_CATEGORIES.includes(category as DocumentCategory)) {
    throw new Error("Select a valid document category.");
  }

  if (referenceNumber.length > 100) {
    throw new Error("Reference number must be 100 characters or fewer.");
  }

  if (rawDescription.length > 0 && description.length === 0) {
    throw new Error("Description cannot contain only whitespace.");
  }

  if (description.length > 5000) {
    throw new Error("Description must be 5000 characters or fewer.");
  }

  return {
    title,
    category: category as DocumentCategory,
    referenceNumber: referenceNumber || null,
    description: description || null,
  };
}

export function validateDocumentId(value: string): string {
  const id = value.trim();

  if (!UUID_PATTERN.test(id)) {
    throw new Error("Invalid document ID.");
  }

  return id;
}
