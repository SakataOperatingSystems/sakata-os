"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import {
  validateWorkflowDefinitionInput,
} from "./validation";

type WorkflowDefinitionActionState = {
  success: boolean;
  error: string | null;
};

function getErrorMessage(
  error: unknown,
  operation: "create"
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return `Failed to ${operation} workflow definition.`;
}

export async function createWorkflowDefinition(
  _previousState: WorkflowDefinitionActionState,
  formData: FormData
): Promise<WorkflowDefinitionActionState> {
  try {
    await requirePermission("core.workflows.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const {
      code,
      name,
      description,
      status,
    } = validateWorkflowDefinitionInput(formData);

    const { data, error } = await supabase
      .from("workflow_definitions")
      .insert({
        organization_id: organizationId,
        code,
        name,
        description,
        status,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          error:
            "A workflow definition with this code already exists in this organization.",
        };
      }

      return {
        success: false,
        error: getErrorMessage(error, "create"),
      };
    }

    if (!data) {
      return {
        success: false,
        error:
          "Workflow definition was not created because the record could not be confirmed.",
      };
    }

    revalidatePath("/control/workflows");

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "create"),
    };
  }
}
