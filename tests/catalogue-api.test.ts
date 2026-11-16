import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  getOrganizationContext: vi.fn(),
  createClient: vi.fn(),
  results: new Map<
    string,
    { data: unknown[] | null; error: { message: string } | null }
  >(),
  filters: new Map<string, [string, string][]>(),
}));

vi.mock("@/app/lib/auth/authorization", () => ({
  requirePermission: mocks.requirePermission,
}));
vi.mock("@/app/lib/auth/organization-context", () => ({
  getOrganizationContext: mocks.getOrganizationContext,
}));
vi.mock("@/app/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { GET } from "../app/api/control/catalog/route";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  eq: (column: string, value: string) => QueryBuilder;
  in: (column: string, values: string[]) => QueryBuilder;
  order: (column: string) => QueryBuilder;
  then: Promise<QueryResult>["then"];
};

function createQuery(table: string): QueryBuilder {
  const result = mocks.results.get(table) ?? { data: [], error: null };
  const promise = Promise.resolve(result);
  const builder: QueryBuilder = {
    select: () => builder,
    eq: (column, value) => {
      const filters = mocks.filters.get(table) ?? [];
      filters.push([column, value]);
      mocks.filters.set(table, filters);
      return builder;
    },
    in: () => builder,
    order: () => builder,
    then: promise.then.bind(promise),
  };
  return builder;
}

function setResults(
  overrides: Partial<Record<string, QueryResult>> = {},
) {
  mocks.results.clear();
  mocks.filters.clear();
  mocks.results.set("product_definitions", {
    data: [
      {
        id: "product-business",
        code: "business_os",
        name: "SAKATA Business OS",
        description: null,
        status: "active",
      },
    ],
    error: null,
  });
  mocks.results.set("module_definitions", {
    data: [
      {
        id: "module-tasks",
        code: "tasks",
        name: "Tasks",
        status: "active",
      },
    ],
    error: null,
  });
  mocks.results.set("product_modules", {
    data: [
      {
        product_definition_id: "product-business",
        module_definition_id: "module-tasks",
        status: "active",
        display_order: 10,
      },
    ],
    error: null,
  });
  mocks.results.set("organization_products", {
    data: [
      {
        product_definition_id: "product-business",
        status: "active",
      },
    ],
    error: null,
  });

  for (const [table, result] of Object.entries(overrides)) {
    if (result) mocks.results.set(table, result);
  }

  mocks.requirePermission.mockResolvedValue(undefined);
  mocks.getOrganizationContext.mockResolvedValue({
    organizationId: "org-authorized",
  });
  mocks.createClient.mockResolvedValue({
    from: (table: string) => createQuery(table),
  });
}

describe("GET /api/control/catalog", () => {
  beforeEach(() => {
    setResults();
  });

  it("returns live product, module-link, and current-organization status", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(body).toMatchObject({
      source: "supabase",
      products: [
        {
          id: "product-business",
          code: "business_os",
          status: "active",
          modules: [
            {
              id: "module-tasks",
              code: "tasks",
              definitionStatus: "active",
              assignmentStatus: "active",
              displayOrder: 10,
            },
          ],
        },
      ],
      organizationProducts: [
        {
          productDefinitionId: "product-business",
          status: "active",
        },
      ],
      moduleDefinitionCount: 1,
      activeModuleDefinitionCount: 1,
    });
    expect(mocks.filters.get("organization_products")).toContainEqual([
      "organization_id",
      "org-authorized",
    ]);
    expect(mocks.requirePermission).toHaveBeenCalledWith("organization.read");
  });

  it("returns an empty database inventory without fabricating product records", async () => {
    setResults({
      product_definitions: { data: [], error: null },
      module_definitions: { data: [], error: null },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.products).toEqual([]);
    expect(body.organizationProducts).toEqual([]);
    expect(body.moduleDefinitionCount).toBe(0);
    expect(body.activeModuleDefinitionCount).toBe(0);
    expect(mocks.filters.has("organization_products")).toBe(false);
  });

  it("surfaces database errors instead of returning a success-shaped fallback", async () => {
    setResults({
      product_definitions: {
        data: null,
        error: { message: "permission denied" },
      },
    });

    const response = await GET();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to load catalogue products.",
    });
  });

  it("rejects unexpected product identities and broken module references", async () => {
    setResults({
      product_definitions: {
        data: [
          {
            id: "wrong",
            code: "business_os",
            name: "SAKATA Commerce OS",
            description: null,
            status: "active",
          },
        ],
        error: null,
      },
    });
    const wrongIdentityResponse = await GET();
    expect(wrongIdentityResponse.status).toBe(500);

    setResults({
      product_modules: {
        data: [
          {
            product_definition_id: "product-business",
            module_definition_id: "missing-module",
            status: "active",
            display_order: 10,
          },
        ],
        error: null,
      },
    });
    const brokenLinkResponse = await GET();
    expect(brokenLinkResponse.status).toBe(500);
  });

  it("keeps unauthorized and forbidden requests out of the registry", async () => {
    mocks.requirePermission.mockRejectedValue(
      new Error("Forbidden: missing permission organization.read"),
    );
    expect((await GET()).status).toBe(403);

    mocks.requirePermission.mockRejectedValue({
      digest: "NEXT_REDIRECT;replace;/login;307;",
    });
    expect((await GET()).status).toBe(401);
  });
});
