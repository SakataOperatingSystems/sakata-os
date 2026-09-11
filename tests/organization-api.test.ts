import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrganizationContext: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("@/app/lib/auth/organization-context", () => ({
  getOrganizationContext: mocks.getOrganizationContext,
}));

vi.mock("@/app/lib/auth/authorization", () => ({
  requirePermission: mocks.requirePermission,
}));

import { GET } from "@/app/api/organization/route";

describe("GET /api/organization", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getOrganizationContext.mockResolvedValue({
      organization: {
        id: "org-1",
        name: "SAKATA Operating Systems",
        slug: "sakata-operating-systems",
        organization_type: "platform",
        status: "active",
      },
    });

    mocks.requirePermission.mockResolvedValue(undefined);
  });

  it("returns 200 for an authorized request", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);

    expect(body).toEqual({
      ok: true,
      organization: {
        id: "org-1",
        name: "SAKATA Operating Systems",
        slug: "sakata-operating-systems",
        type: "platform",
        status: "active",
      },
    });

    expect(mocks.requirePermission).toHaveBeenCalledWith(
      "organization.read"
    );
  });

  it("returns 403 when organization.read permission is denied", async () => {
    mocks.requirePermission.mockRejectedValueOnce(
      new Error("Forbidden: missing permission organization.read")
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);

    expect(body).toEqual({
      ok: false,
      error: "Forbidden",
    });
  });

  it("returns 500 for unexpected server errors", async () => {
    mocks.getOrganizationContext.mockRejectedValueOnce(
      new Error("Database unavailable")
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);

    expect(body).toEqual({
      ok: false,
      error: "Internal server error",
    });
  });
});