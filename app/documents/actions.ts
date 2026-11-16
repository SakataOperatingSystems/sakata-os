"use server";

import { revalidatePath } from "next/cache";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { createClient } from "@/app/lib/supabase/server";
import {
  validateDocumentId,
  validateDocumentInput,
} from "./validation";

export type DocumentActionState = {
  success: boolean;
  error: string | null;
};

function getErrorMessage(
  error: unknown,
  operation: "create" | "archive",
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23514"
  ) {
    return "The document metadata violates the database rules.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23503"
  ) {
    return "The document references an invalid organization member.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return `Failed to ${operation} document.`;
}

export async function createDocument(
  _previousState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  try {
    await requirePermission("core.documents.manage");

    const { organizationId, profile } = await getOrganizationContext();
    const input = validateDocumentInput(formData);
    const supabase = await createClient();

    const { error } = await supabase.from("organization_documents").insert({
      organization_id: organizationId,
      created_by_user_id: profile.id,
      title: input.title,
      category: input.category,
      reference_number: input.referenceNumber,
      description: input.description,
    });

    if (error) {
      return { success: false, error: getErrorMessage(error, "create") };
    }

    revalidatePath("/documents");
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "create") };
  }
}

export async function archiveDocument(
  _previousState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  try {
    await requirePermission("core.documents.manage");

    const { organizationId } = await getOrganizationContext();
    const id = validateDocumentId(String(formData.get("id") ?? ""));
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organization_documents")
      .update({ status: "archived" })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (error) {
      return { success: false, error: getErrorMessage(error, "archive") };
    }

    if (!data) {
      return {
        success: false,
        error: "Document not found or you do not have access to it.",
      };
    }

    revalidatePath("/documents");
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "archive") };
  }
}
