const TASK_STATUSES = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
] as const;

const TASK_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface TaskInput {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToUserId: string | null;
  dueAt: string | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DATETIME_LOCAL_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function validateUuid(value: string, label: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`Invalid ${label.toLowerCase()} selection.`);
  }
}

function validateDueDateTime(value: string): string {
  if (!DATETIME_LOCAL_PATTERN.test(value)) {
    throw new Error(
      "Due date and time must use YYYY-MM-DDTHH:mm format."
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid due date and time.");
  }

  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("Invalid due date and time.");
  }

  return date.toISOString();
}

export function validateTaskInput(formData: FormData): TaskInput {
  const title = String(formData.get("title") ?? "").trim();

  const rawDescription = String(
    formData.get("description") ?? ""
  );

  const description = rawDescription.trim();

  const status = String(
    formData.get("status") ?? ""
  ).trim();

  const priority = String(
    formData.get("priority") ?? ""
  ).trim();

  const rawAssignee = String(
    formData.get("assigned_to_user_id") ?? ""
  ).trim();

  const rawDueAt = String(
    formData.get("due_at") ?? ""
  ).trim();

  if (!title) {
    throw new Error("Task title is required.");
  }

  if (title.length > 200) {
    throw new Error("Task title must be 200 characters or fewer.");
  }

  if (rawDescription.length > 0 && description === "") {
    throw new Error("Task description cannot be empty when provided.");
  }

  if (description.length > 5000) {
    throw new Error(
      "Task description must be 5000 characters or fewer."
    );
  }

  if (!TASK_STATUSES.includes(status as TaskStatus)) {
    throw new Error("Invalid task status.");
  }

  if (!TASK_PRIORITIES.includes(priority as TaskPriority)) {
    throw new Error("Invalid task priority.");
  }

  if (rawAssignee) {
    validateUuid(rawAssignee, "assignee");
  }

  const dueAt = rawDueAt
    ? validateDueDateTime(rawDueAt)
    : null;

  return {
    title,
    description: description || null,
    status: status as TaskStatus,
    priority: priority as TaskPriority,
    assignedToUserId: rawAssignee || null,
    dueAt,
  };
}
