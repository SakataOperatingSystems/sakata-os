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

export interface WorkflowStateInput {
  workflowDefinitionId: string;
  code: string;
  name: string;
  description: string | null;
  sequence: number;
  isInitial: boolean;
  isTerminal: boolean;
}

export interface WorkflowTransitionInput {
  workflowDefinitionId: string;
  fromStateId: string;
  toStateId: string;
  code: string;
  name: string;
  description: string | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const WORKFLOW_CODE_PATTERN =
  /^[a-z0-9][a-z0-9._-]*$/;

function readTrimmed(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function readOptionalDescription(
  formData: FormData,
  field: string
): string | null {
  const raw = String(formData.get(field) ?? "");
  const value = raw.trim();

  if (raw.length > 0 && value === "") {
    throw new Error(
      `${field === "description" ? "Description" : field} cannot be empty when provided.`
    );
  }

  if (value.length > 5000) {
    throw new Error("Description must be 5000 characters or fewer.");
  }

  return value || null;
}

function validateCode(code: string, label: string): void {
  if (!code) {
    throw new Error(`${label} is required.`);
  }

  if (code.length > 100) {
    throw new Error(`${label} must be 100 characters or fewer.`);
  }

  if (!WORKFLOW_CODE_PATTERN.test(code)) {
    throw new Error(
      `${label} must use lowercase letters, numbers, dots, underscores, or hyphens, and must start with a letter or number.`
    );
  }
}

function validateName(name: string, label: string): void {
  if (!name) {
    throw new Error(`${label} is required.`);
  }

  if (name.length > 200) {
    throw new Error(`${label} must be 200 characters or fewer.`);
  }
}

function validateUuid(value: string, label: string): void {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  if (!UUID_PATTERN.test(value)) {
    throw new Error(`Invalid ${label.toLowerCase()}.`);
  }
}

export function validateWorkflowDefinitionInput(
  formData: FormData
): WorkflowDefinitionInput {
  const code = readTrimmed(formData, "code");
  const name = readTrimmed(formData, "name");
  const status = readTrimmed(formData, "status");

  const description = readOptionalDescription(formData, "description");

  validateCode(code, "Workflow code");
  validateName(name, "Workflow name");

  if (!WORKFLOW_STATUSES.includes(status as WorkflowStatus)) {
    throw new Error("Invalid workflow status.");
  }

  return {
    code,
    name,
    description,
    status: status as WorkflowStatus,
  };
}

export function validateWorkflowStateInput(
  formData: FormData
): WorkflowStateInput {
  const workflowDefinitionId = readTrimmed(
    formData,
    "workflow_definition_id"
  );
  const code = readTrimmed(formData, "code");
  const name = readTrimmed(formData, "name");

  const description = readOptionalDescription(formData, "description");

  const rawSequence = readTrimmed(formData, "sequence");
  const rawIsInitial = readTrimmed(formData, "is_initial");
  const rawIsTerminal = readTrimmed(formData, "is_terminal");

  validateUuid(workflowDefinitionId, "workflow definition");
  validateCode(code, "State code");
  validateName(name, "State name");

  if (!/^\d+$/.test(rawSequence)) {
    throw new Error("State sequence must be a non-negative integer.");
  }

  const sequence = Number.parseInt(rawSequence, 10);

  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new Error("State sequence must be a non-negative integer.");
  }

  return {
    workflowDefinitionId,
    code,
    name,
    description,
    sequence,
    isInitial: rawIsInitial === "true",
    isTerminal: rawIsTerminal === "true",
  };
}

export function validateWorkflowTransitionInput(
  formData: FormData
): WorkflowTransitionInput {
  const workflowDefinitionId = readTrimmed(
    formData,
    "workflow_definition_id"
  );
  const fromStateId = readTrimmed(formData, "from_state_id");
  const toStateId = readTrimmed(formData, "to_state_id");
  const code = readTrimmed(formData, "code");
  const name = readTrimmed(formData, "name");

  const description = readOptionalDescription(formData, "description");

  validateUuid(workflowDefinitionId, "workflow definition");
  validateUuid(fromStateId, "from state");
  validateUuid(toStateId, "to state");

  if (fromStateId === toStateId) {
    throw new Error(
      "A workflow transition must move from one state to a different state."
    );
  }

  validateCode(code, "Transition code");
  validateName(name, "Transition name");

  return {
    workflowDefinitionId,
    fromStateId,
    toStateId,
    code,
    name,
    description,
  };
}
