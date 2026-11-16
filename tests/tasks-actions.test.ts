import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClient,
  getOrganizationContext,
  insertTask,
  memberQuery,
  revalidatePath,
  requirePermission,
} = vi.hoisted(() => ({
  createClient: vi.fn(),
  getOrganizationContext: vi.fn(),
  insertTask: vi.fn(),
  memberQuery: {
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  },
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
const assigneeId = "723e4567-e89b-42d3-a456-426614174001";

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
    memberQuery.eq.mockReturnValue(memberQuery);
    memberQuery.maybeSingle.mockResolvedValue({
      data: {
        user_profile_id: assigneeId,
        status: "active",
        user_profiles: { id: assigneeId, status: "active" },
      },
      error: null,
    });
    createClient.mockResolvedValue({
      from: (table: string) => {
        if (table === "organization_memberships") {
          return { select: () => memberQuery };
        }

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
    expect(revalidatePath).toHaveBeenCalledWith("/business");
    expect(revalidatePath).toHaveBeenCalledWith("/business/tasks");
  });

  it("validates the assignee against active membership in the current organization", async () => {
    const formData = createForm();
    formData.set("assigned_to_user_id", assigneeId);

    const result = await createTask(
      { success: false, error: null },
      formData,
    );

    expect(result).toEqual({ success: true, error: null });
    expect(memberQuery.eq.mock.calls).toEqual([
      ["organization_id", organizationId],
      ["user_profile_id", assigneeId],
      ["status", "active"],
      ["user_profiles.status", "active"],
    ]);
    expect(insertTask).toHaveBeenCalledWith(
      expect.objectContaining({ assigned_to_user_id: assigneeId }),
    );
  });

  it("does not create a task for a user outside the active organization membership", async () => {
    const formData = createForm();
    formData.set("assigned_to_user_id", assigneeId);
    memberQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await createTask(
      { success: false, error: null },
      formData,
    );

    expect(result).toEqual({
      success: false,
      error: "The selected assignee is not an active member of this organization.",
    });
    expect(insertTask).not.toHaveBeenCalled();
  });

  it("rejects a task created directly in a terminal state", async () => {
    const formData = createForm();
    formData.set("status", "completed");

    const result = await createTask(
      { success: false, error: null },
      formData,
    );

    expect(result).toEqual({
      success: false,
      error: "New tasks must start in the open state.",
    });
    expect(insertTask).not.toHaveBeenCalled();
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
