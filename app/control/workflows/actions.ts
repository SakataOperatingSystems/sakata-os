"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
export async function configureStudentAdmissionDecisionPath(): Promise<void> {
  await requirePermission("core.workflows.manage");

  const { organizationId } = await getOrganizationContext();
  const supabase = await createClient();

  const { data: workflow, error: workflowError } = await supabase
    .from("workflow_definitions")
    .select("id, code, name, status")
    .eq("organization_id", organizationId)
    .eq("code", "student_admission")
    .eq("status", "active")
    .maybeSingle();

  if (workflowError) {
    throw new Error(
      `Failed to load the student admission workflow: ${workflowError.message}`
    );
  }

  if (!workflow) {
    throw new Error(
      "The active student_admission workflow is not configured for this organization."
    );
  }

  const { data: states, error: statesError } = await supabase
    .from("workflow_states")
    .select(
      "id, code, name, description, sequence, is_initial, is_terminal"
    )
    .eq("organization_id", organizationId)
    .eq("workflow_definition_id", workflow.id)
    .order("sequence");

  if (statesError) {
    throw new Error(
      `Failed to load admission workflow states: ${statesError.message}`
    );
  }

  const existingStates = states ?? [];

  const reviewState = existingStates.find(
    (state) => state.code === "admission_review"
  );

  const requestedState = existingStates.find(
    (state) => state.code === "admission_requested"
  );

  if (!reviewState) {
    throw new Error(
      "The student admission workflow is missing the admission_review state."
    );
  }

  if (!requestedState) {
    throw new Error(
      "The student admission workflow is missing the admission_requested state."
    );
  }

  let nextSequence =
    existingStates.reduce(
      (maximum, state) => Math.max(maximum, state.sequence),
      0
    ) + 1;

  const desiredStates = [
    {
      code: "admission_approved",
      name: "Admission Approved",
      description:
        "Admission decision approved and ready for student conversion.",
      is_initial: false,
      is_terminal: false,
    },
    {
      code: "admission_rejected",
      name: "Admission Rejected",
      description: "Admission decision rejected and closed.",
      is_initial: false,
      is_terminal: true,
    },
  ];

  const stateByCode = new Map(
    existingStates.map((state) => [state.code, state])
  );

  for (const desiredState of desiredStates) {
    if (stateByCode.has(desiredState.code)) {
      continue;
    }

    const { data: createdState, error: createStateError } = await supabase
      .from("workflow_states")
      .insert({
        organization_id: organizationId,
        workflow_definition_id: workflow.id,
        code: desiredState.code,
        name: desiredState.name,
        description: desiredState.description,
        sequence: nextSequence,
        is_initial: desiredState.is_initial,
        is_terminal: desiredState.is_terminal,
      })
      .select(
        "id, code, name, description, sequence, is_initial, is_terminal"
      )
      .single();

    if (createStateError) {
      throw new Error(
        `Failed to create ${desiredState.name}: ${createStateError.message}`
      );
    }

    if (!createdState) {
      throw new Error(
        `Failed to confirm creation of ${desiredState.name}.`
      );
    }

    stateByCode.set(createdState.code, createdState);
    nextSequence += 1;
  }

  const approvedState = stateByCode.get("admission_approved");
  const rejectedState = stateByCode.get("admission_rejected");

  if (!approvedState || !rejectedState) {
    throw new Error(
      "Admission decision states could not be resolved after configuration."
    );
  }

  const { data: existingTransitions, error: transitionsError } = await supabase
    .from("workflow_transitions")
    .select(
      "id, from_state_id, to_state_id, code, name, description"
    )
    .eq("organization_id", organizationId)
    .eq("workflow_definition_id", workflow.id);

  if (transitionsError) {
    throw new Error(
      `Failed to load admission workflow transitions: ${transitionsError.message}`
    );
  }

  const transitionByCode = new Map(
    (existingTransitions ?? []).map((transition) => [
      transition.code,
      transition,
    ])
  );

  const desiredTransitions = [
    {
      code: "approve_admission",
      name: "Approve Admission",
      description:
        "Approve the application and move it to the student conversion stage.",
      from_state_id: reviewState.id,
      to_state_id: approvedState.id,
    },
    {
      code: "reject_admission",
      name: "Reject Admission",
      description:
        "Reject the application and close the admission workflow.",
      from_state_id: reviewState.id,
      to_state_id: rejectedState.id,
    },
    {
      code: "request_admission_changes",
      name: "Request Changes",
      description:
        "Return the application to the requested state for additional information or correction.",
      from_state_id: reviewState.id,
      to_state_id: requestedState.id,
    },
  ];

  for (const desiredTransition of desiredTransitions) {
    if (transitionByCode.has(desiredTransition.code)) {
      continue;
    }

    const { error: createTransitionError } = await supabase
      .from("workflow_transitions")
      .insert({
        organization_id: organizationId,
        workflow_definition_id: workflow.id,
        from_state_id: desiredTransition.from_state_id,
        to_state_id: desiredTransition.to_state_id,
        code: desiredTransition.code,
        name: desiredTransition.name,
        description: desiredTransition.description,
      });

    if (createTransitionError) {
      throw new Error(
        `Failed to create ${desiredTransition.name}: ${createTransitionError.message}`
      );
    }
  }

  revalidatePath("/control/workflows");
  revalidatePath("/control/workflows/admission-setup");
  revalidatePath("/school");
  revalidatePath("/school/admissions");

  redirect("/control/workflows/admission-setup?configured=1");
}
