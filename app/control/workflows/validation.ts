const WORKFLOW_STATUSES = [
  "active",
  "suspended",
  "archived",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export interface WorkflowDefinitionInput {
  code: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
}

export function validateWorkflowDefinitionInput(
  formData: FormData
): WorkflowDefinitionInput {
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  const rawDescription = String(
    formData.get("description") ?? ""
  );

  const description = rawDescription.trim();

  const status = String(
    formData.get("status") ?? ""
  ).trim();

  if (!code) {
    throw new Error("Workflow code is required.");
  }

  if (code.length > 100) {
    throw new Error(
      "Workflow code must be 100 characters or fewer."
    );
  }

  if (!/^[a-z0-9][a-z0-9._-]*$/.test(code)) {
    throw new Error(
      "Workflow code must use lowercase letters, numbers, dots, underscores, or hyphens, and must start with a letter or number."
    );
  }

  if (!name) {
    throw new Error("Workflow name is required.");
  }

  if (name.length > 200) {
    throw new Error(
      "Workflow name must be 200 characters or fewer."
    );
  }

  if (rawDescription.length > 0 && description === "") {
    throw new Error(
      "Workflow description cannot be empty when provided."
    );
  }

  if (description.length > 5000) {
    throw new Error(
      "Workflow description must be 5000 characters or fewer."
    );
  }

  if (!WORKFLOW_STATUSES.includes(status as WorkflowStatus)) {
    throw new Error("Invalid workflow status.");
  }

  return {
    code,
    name,
    description: description || null,
    status: status as WorkflowStatus,
  };
}
