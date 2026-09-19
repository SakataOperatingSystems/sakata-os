import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";

export type CreateWorkflowInstanceInput = {
  workflowCode: string;
  initialStateCode: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
};

export type ExecuteWorkflowTransitionInput = {
  workflowInstanceId: string;
  workflowTransitionId: string;
  metadata?: Record<string, unknown>;
};

export type WorkflowInstance = {
  id: string;
  organization_id: string;
  workflow_definition_id: string;
  current_state_id: string;
  subject_type: string;
  subject_id: string;
  status: "active" | "completed" | "cancelled";
  started_at: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type WorkflowTransitionExecutionResult = {
  workflow_instance_id: string;
  workflow_transition_history_id: string;
  current_state_id: string;
  status: "active" | "completed" | "cancelled";
  completed_at: string | null;
};

export async function createWorkflowInstance(
  input: CreateWorkflowInstanceInput
): Promise<WorkflowInstance> {
  await requirePermission("core.workflows.manage");

  const { organizationId } = await getOrganizationContext();

  const supabase = await createClient();

  const workflowCode = input.workflowCode.trim();
  const initialStateCode = input.initialStateCode.trim();
  const subjectType = input.subjectType.trim();
  const subjectId = input.subjectId.trim();

  if (!workflowCode) {
    throw new Error("Workflow code is required.");
  }

  if (!initialStateCode) {
    throw new Error("Workflow initial state code is required.");
  }

  if (!subjectType) {
    throw new Error("Workflow instance subject type is required.");
  }

  if (!subjectId) {
    throw new Error("Workflow subject ID is required.");
  }

  const { data: workflowDefinition, error: workflowError } =
    await supabase
      .from("workflow_definitions")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("code", workflowCode)
      .single();

  if (workflowError || !workflowDefinition) {
    throw new Error(
      "Workflow definition was not found or is not available in this organization."
    );
  }

  const { data: initialState, error: stateError } =
    await supabase
      .from("workflow_states")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("workflow_definition_id", workflowDefinition.id)
      .eq("code", initialStateCode)
      .eq("is_initial", true)
      .single();

  if (stateError || !initialState) {
    throw new Error(
      "Workflow initial state was not found or is not configured as the initial state."
    );
  }

  const metadata = input.metadata ?? {};

  const { data, error } = await supabase
    .from("workflow_instances")
    .insert({
      organization_id: organizationId,
      workflow_definition_id: workflowDefinition.id,
      current_state_id: initialState.id,
      subject_type: subjectType,
      subject_id: subjectId,
      status: "active",
      metadata,
    })
    .select(
      "id, organization_id, workflow_definition_id, current_state_id, subject_type, subject_id, status, started_at, completed_at, metadata, created_at, updated_at"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "An active workflow instance already exists for this subject."
      );
    }

    throw new Error(
      `Failed to create workflow instance: ${error.message}`
    );
  }

  return data as WorkflowInstance;
}

export async function executeWorkflowTransition(
  input: ExecuteWorkflowTransitionInput
): Promise<WorkflowTransitionExecutionResult> {
  await requirePermission("core.workflows.manage");

  const { organizationId } = await getOrganizationContext();

  const supabase = await createClient();

  const workflowInstanceId = input.workflowInstanceId.trim();
  const workflowTransitionId = input.workflowTransitionId.trim();

  if (!workflowInstanceId) {
    throw new Error("Workflow instance ID is required.");
  }

  if (!workflowTransitionId) {
    throw new Error("Workflow transition ID is required.");
  }

  const metadata = input.metadata ?? {};

  const { data, error } = await supabase.rpc(
    "execute_workflow_transition",
    {
      p_organization_id: organizationId,
      p_workflow_instance_id: workflowInstanceId,
      p_workflow_transition_id: workflowTransitionId,
      p_metadata: metadata,
    }
  );

  if (error) {
    throw new Error(`Failed to execute workflow transition: ${error.message}`);
  }

  if (!data || data.length !== 1) {
    throw new Error(
      "Workflow transition executed but returned an unexpected result."
    );
  }

  return data[0] as WorkflowTransitionExecutionResult;
}
