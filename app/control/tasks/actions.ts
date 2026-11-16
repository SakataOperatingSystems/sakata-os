"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import {
  isTaskStatus,
  isValidTaskStateTransition,
  type TaskStatus,
  validateTaskInput,
} from "./validation";

export type TaskActionState = {
  success: boolean;
  error: string | null;
};

function getErrorMessage(
  error: { code?: string; message?: string } | unknown,
  operation: "create" | "update"
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23503"
  ) {
    return "The task references an invalid or inactive organization member.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23514"
  ) {
    return "The task contains a value that violates the database rules.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return "The task conflicts with an existing database record.";
  }

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

  return `Failed to ${operation} task.`;
}

async function validateTaskAssignee(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  assignedToUserId: string | null
): Promise<void> {
  if (!assignedToUserId) {
    return;
  }

  const { data, error } = await supabase
    .from("organization_memberships")
    .select(
      "user_profile_id, status, user_profiles!inner(id, status)"
    )
    .eq("organization_id", organizationId)
    .eq("user_profile_id", assignedToUserId)
    .eq("status", "active")
    .eq("user_profiles.status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to validate task assignee: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "The selected assignee is not an active member of this organization."
    );
  }
}
async function validateTaskStateTransition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  taskId: string,
  requestedStatus: TaskStatus
): Promise<void> {
  const { data: currentTask, error } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error(
        "Task not found or you do not have access to it."
      );
    }

    throw new Error(
      `Failed to load current task state: ${error.message}`
    );
  }

  const currentStatus = currentTask.status as string;

  if (
    !isTaskStatus(currentStatus) ||
    !isValidTaskStateTransition(currentStatus, requestedStatus)
  ) {
    throw new Error(
      `Invalid task state transition: ${currentStatus} ? ${requestedStatus}.`
    );
  }
}
export async function createTask(
  _previousState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  try {
    await requirePermission("core.tasks.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const {
      title,
      description,
      status,
      priority,
      assignedToUserId,
      dueAt,
    } = validateTaskInput(formData);

    if (status !== "open") {
      return {
        success: false,
        error: "New tasks must start in the open state.",
      };
    }

    await validateTaskAssignee(
      supabase,
      organizationId,
      assignedToUserId
    );

    const { error } = await supabase.from("tasks").insert({
      organization_id: organizationId,
      title,
      description,
      status,
      priority,
      assigned_to_user_id: assignedToUserId,
      due_at: dueAt,
    });

    if (error) {
      return {
        success: false,
        error: getErrorMessage(error, "create"),
      };
    }

    revalidatePath("/control/tasks");
    revalidatePath("/school/tasks");
    revalidatePath("/school");
    revalidatePath("/business");
    revalidatePath("/business/tasks");

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

export async function updateTask(
  _previousState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  try {
    await requirePermission("core.tasks.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return {
        success: false,
        error: "Task ID is required for an update.",
      };
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return {
        success: false,
        error: "Invalid task ID.",
      };
    }

    const {
      title,
      description,
      status,
      priority,
      assignedToUserId,
      dueAt,
    } = validateTaskInput(formData);

    await validateTaskAssignee(
      supabase,
      organizationId,
      assignedToUserId
    );

    await validateTaskStateTransition(
      supabase,
      organizationId,
      id,
      status
    );

    const { data, error } = await supabase
      .from("tasks")
      .update({
        title,
        description,
        status,
        priority,
        assigned_to_user_id: assignedToUserId,
        due_at: dueAt,
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Task not found or you do not have access to it.",
        };
      }

      return {
        success: false,
        error: getErrorMessage(error, "update"),
      };
    }

    if (!data) {
      return {
        success: false,
        error:
          "Task was not updated because the record could not be found.",
      };
    }

    revalidatePath("/control/tasks");
    revalidatePath("/school/tasks");
    revalidatePath("/school");
    revalidatePath("/business");
    revalidatePath("/business/tasks");

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "update"),
    };
  }
}
