"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { validateTaskInput } from "./validation";

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
