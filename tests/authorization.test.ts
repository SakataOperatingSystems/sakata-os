import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrganizationContext: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/app/lib/auth/organization-context", () => ({
  getOrganizationContext: mocks.getOrganizationContext,
}));

vi.mock("@/app/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  getCurrentPermissions,
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";

function createSupabaseMock({
  roleAssignments = [],
  roles = [],
  rolePermissions = [],
  permissions = [],
}: {
  roleAssignments?: Array<{ role_id: string }>;
  roles?: Array<{
    id: string;
    organization_id: string;
    scope: string;
    status: string;
  }>;
  rolePermissions?: Array<{ permission_id: string }>;
  permissions?: Array<{ id: string; code: string }>;
}) {
  return {
    from: (table: string) => {
      if (table === "membership_roles") {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: roleAssignments,
                error: null,
              }),
          }),
        };
      }

      if (table === "roles") {
        return {
          select: () => ({
            in: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () =>
                    Promise.resolve({
                      data: roles,
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === "role_permissions") {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: rolePermissions,
                error: null,
              }),
          }),
        };
      }

      if (table === "permissions") {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: permissions,
                error: null,
              }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

function mockActiveOrganizationContext() {
  mocks.getOrganizationContext.mockResolvedValue({
    membership: {
      id: "membership-1",
      status: "active",
    },
    organization: {
      id: "organization-1",
      status: "active",
    },
  });
}

describe("authorization", () => {
  it("returns permissions assigned through an active organization role", async () => {
    mockActiveOrganizationContext();

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        roleAssignments: [{ role_id: "role-1" }],
        roles: [
          {
            id: "role-1",
            organization_id: "organization-1",
            scope: "organization",
            status: "active",
          },
        ],
        rolePermissions: [{ permission_id: "permission-1" }],
        permissions: [
          {
            id: "permission-1",
            code: "organization.read",
          },
        ],
      })
    );

    const permissions = await getCurrentPermissions();

    expect(permissions.has("organization.read")).toBe(true);
  });

  it("denies a permission that is not assigned", async () => {
    mockActiveOrganizationContext();

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        roleAssignments: [],
      })
    );

    await expect(
      requirePermission("permissions.manage")
    ).rejects.toThrow(
      "Forbidden: missing permission permissions.manage"
    );
  });

  it("hasPermission returns false for an unassigned permission", async () => {
    mockActiveOrganizationContext();

    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        roleAssignments: [],
      })
    );

    await expect(
      hasPermission("audit.delete")
    ).resolves.toBe(false);
  });
});