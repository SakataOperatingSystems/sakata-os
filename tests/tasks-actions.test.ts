import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClient,
  getOrganizationContext,
  insertTask,
  revalidatePath,
  requirePermission,
} = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOrganizationContext: vi.fn(),
  insertTask: vi.fn(),
  revalidatePath: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/app/lib/auth/authorization", () => ({ requirePermission }));
vi.mock("@/app/lib/auth/organization-context", () => ({
  getOrganizationContext,
}));
vi.mock("@/app/lib/supabase/server", () => ({ createClient }));

import { createTask } from "@/app/control/tasks/actions";

const organizationId = "123e4567-e89b-42d3-a456-426614174000";

function createForm(): FormData {
  const formData = new FormData();
  formData.set("title", "Review attendance register");
  formData.set("description", "");
  formData.set("status", "open");
  formData.set("priority", "normal");
  formData.set("assigned_to_user_id", "");
  formData.set("due_at", "");
  return formData;
}

describe("task actions from tenant School OS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue(undefined);
    getOrganizationContext.mockResolvedValue({ organizationId });
    insertTask.mockResolvedValue({ error: null });
    createClient.mockResolvedValue({
      from: (table: string) => {
        expect(table).toBe("tasks");
        return { insert: insertTask };
      },
    });
  });

  it("creates the task in the active organization and refreshes both task surfaces", async () => {
    const result = await createTask(
      { success: false, error: null },
      createForm(),
    );

    expect(result).toEqual({ success: true, error: null });
    expect(requirePermission).toHaveBeenCalledWith("core.tasks.manage");
    expect(insertTask).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: organizationId,
        title: "Review attendance register",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/control/tasks");
    expect(revalidatePath).toHaveBeenCalledWith("/school/tasks");
    expect(revalidatePath).toHaveBeenCalledWith("/school");
  });

  it("does not write or refresh when task management permission is denied", async () => {
    requirePermission.mockRejectedValue(new Error("Forbidden"));

    const result = await createTask(
      { success: false, error: null },
      createForm(),
    );

    expect(result).toEqual({ success: false, error: "Forbidden" });
    expect(insertTask).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
