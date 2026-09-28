"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import {
  validateWorkflowDefinitionInput,
  validateWorkflowStateInput,
  validateWorkflowTransitionInput,
} from "./validation";

type WorkflowDefinitionActionState = {
  success: boolean;
  error: string | null;
};

type WorkflowStateActionState = {
  success: boolean;
  error: string | null;
};

type WorkflowTransitionActionState = {
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

  return `Failed to ${operation} workflow configuration.`;
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

export async function createWorkflowState(
  _previousState: WorkflowStateActionState,
  formData: FormData
): Promise<WorkflowStateActionState> {
  try {
    await requirePermission("core.workflows.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const {
      workflowDefinitionId,
      code,
      name,
      description,
      sequence,
      isInitial,
      isTerminal,
    } = validateWorkflowStateInput(formData);

    const { data: workflowDefinition, error: workflowError } =
      await supabase
        .from("workflow_definitions")
        .select("id")
        .eq("id", workflowDefinitionId)
        .eq("organization_id", organizationId)
        .single();

    if (workflowError || !workflowDefinition) {
      return {
        success: false,
        error:
          "Workflow definition was not found or you do not have access to it.",
      };
    }

    const { data, error } = await supabase
      .from("workflow_states")
      .insert({
        organization_id: organizationId,
        workflow_definition_id: workflowDefinitionId,
        code,
        name,
        description,
        sequence,
        is_initial: isInitial,
        is_terminal: isTerminal,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        if (isInitial) {
          return {
            success: false,
            error:
              "This workflow already has an initial state. Only one initial state is permitted.",
          };
        }

        if (error.message.includes("workflow_states_workflow_code_key")) {
          return {
            success: false,
            error:
              "A state with this code already exists in this workflow.",
          };
        }

        if (
          error.message.includes(
            "workflow_states_workflow_sequence_key"
          )
        ) {
          return {
            success: false,
            error:
              "A state with this sequence number already exists in this workflow.",
          };
        }

        return {
          success: false,
          error:
            "A state with the same workflow configuration already exists.",
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
          "Workflow state was not created because the record could not be confirmed.",
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

export async function createWorkflowTransition(
  _previousState: WorkflowTransitionActionState,
  formData: FormData
): Promise<WorkflowTransitionActionState> {
  try {
    await requirePermission("core.workflows.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const {
      workflowDefinitionId,
      fromStateId,
      toStateId,
      code,
      name,
      description,
    } = validateWorkflowTransitionInput(formData);

    const { data: workflowDefinition, error: workflowError } =
      await supabase
        .from("workflow_definitions")
        .select("id")
        .eq("id", workflowDefinitionId)
        .eq("organization_id", organizationId)
        .single();

    if (workflowError || !workflowDefinition) {
      return {
        success: false,
        error:
          "Workflow definition was not found or you do not have access to it.",
      };
    }

    const { data: fromState, error: fromStateError } =
      await supabase
        .from("workflow_states")
        .select("id, workflow_definition_id")
        .eq("id", fromStateId)
        .eq("organization_id", organizationId)
        .eq("workflow_definition_id", workflowDefinitionId)
        .single();

    if (fromStateError || !fromState) {
      return {
        success: false,
        error:
          "The selected from-state was not found or does not belong to this workflow.",
      };
    }

    const { data: toState, error: toStateError } =
      await supabase
        .from("workflow_states")
        .select("id, workflow_definition_id")
        .eq("id", toStateId)
        .eq("organization_id", organizationId)
        .eq("workflow_definition_id", workflowDefinitionId)
        .single();

    if (toStateError || !toState) {
      return {
        success: false,
        error:
          "The selected to-state was not found or does not belong to this workflow.",
      };
    }

    if (fromState.id === toState.id) {
      return {
        success: false,
        error:
          "A workflow transition must move from one state to a different state.",
      };
    }

    const { data, error } = await supabase
      .from("workflow_transitions")
      .insert({
        organization_id: organizationId,
        workflow_definition_id: workflowDefinitionId,
        from_state_id: fromStateId,
        to_state_id: toStateId,
        code,
        name,
        description,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        if (
          error.message.includes(
            "workflow_transitions_workflow_code_key"
          )
        ) {
          return {
            success: false,
            error:
              "A transition with this code already exists in this workflow.",
          };
        }

        if (
          error.message.includes(
            "workflow_transitions_workflow_route_key"
          )
        ) {
          return {
            success: false,
            error:
              "A transition for this state route already exists in this workflow.",
          };
        }

        return {
          success: false,
          error:
            "A transition with the same workflow configuration already exists.",
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
          "Workflow transition was not created because the record could not be confirmed.",
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
