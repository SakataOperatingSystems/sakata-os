import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  archiveMaybeSingle,
  archiveSelect,
  archiveUpdate,
  archiveEq,
  createClient,
  getOrganizationContext,
  insertDocument,
  revalidatePath,
  requirePermission,
} = vi.hoisted(() => ({
  archiveMaybeSingle: vi.fn(),
  archiveSelect: vi.fn(),
  archiveUpdate: vi.fn(),
  archiveEq: vi.fn(),
  createClient: vi.fn(),
  getOrganizationContext: vi.fn(),
  insertDocument: vi.fn(),
  revalidatePath: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/app/lib/auth/authorization", () => ({ requirePermission }));
vi.mock("@/app/lib/auth/organization-context", () => ({
  getOrganizationContext,
}));
vi.mock("@/app/lib/supabase/server", () => ({ createClient }));

import {
  archiveDocument,
  createDocument,
} from "@/app/documents/actions";

const organizationId = "123e4567-e89b-42d3-a456-426614174000";
const profileId = "123e4567-e89b-42d3-a456-426614174001";
const documentId = "123e4567-e89b-42d3-a456-426614174002";

function createForm(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("document register server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue(undefined);
    getOrganizationContext.mockResolvedValue({
      organizationId,
      profile: { id: profileId },
    });
    archiveEq.mockReturnValue({
      eq: archiveEq,
      select: archiveSelect,
    });
    archiveSelect.mockReturnValue({ maybeSingle: archiveMaybeSingle });
    archiveUpdate.mockReturnValue({ eq: archiveEq });
    createClient.mockResolvedValue({
      from: (table: string) => {
        expect(table).toBe("organization_documents");
        return {
          insert: insertDocument,
          update: archiveUpdate,
        };
      },
    });
  });

  it("creates metadata under the authenticated active organization", async () => {
    insertDocument.mockResolvedValue({ error: null });
    const formData = createForm({
      title: "Safety policy",
      category: "policy",
      organization_id: "123e4567-e89b-42d3-a456-426614174099",
    });

    const result = await createDocument(
      { success: false, error: null },
      formData,
    );

    expect(result).toEqual({ success: true, error: null });
    expect(requirePermission).toHaveBeenCalledWith("core.documents.manage");
    expect(insertDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: organizationId,
        created_by_user_id: profileId,
        title: "Safety policy",
      }),
    );
    expect(insertDocument.mock.calls[0][0].organization_id).not.toBe(
      "123e4567-e89b-42d3-a456-426614174099",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/documents");
  });

  it("filters archive updates by the active organization and denies unmatched rows", async () => {
    archiveMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await archiveDocument(
      { success: false, error: null },
      createForm({ id: documentId }),
    );

    expect(result).toEqual({
      success: false,
      error: "Document not found or you do not have access to it.",
    });
    expect(archiveUpdate).toHaveBeenCalledWith({ status: "archived" });
    expect(archiveEq).toHaveBeenNthCalledWith(1, "id", documentId);
    expect(archiveEq).toHaveBeenNthCalledWith(
      2,
      "organization_id",
      organizationId,
    );
    expect(archiveEq).toHaveBeenNthCalledWith(3, "status", "active");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not write when the caller lacks management permission", async () => {
    requirePermission.mockRejectedValue(new Error("Forbidden"));

    const result = await createDocument(
      { success: false, error: null },
      createForm({ title: "Safety policy", category: "policy" }),
    );

    expect(result).toEqual({ success: false, error: "Forbidden" });
    expect(insertDocument).not.toHaveBeenCalled();
  });
});
