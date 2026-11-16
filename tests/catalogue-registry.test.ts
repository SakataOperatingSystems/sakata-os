import { describe, expect, it } from "vitest";
import {
  CURATED_PRODUCT_IDENTITIES,
  parseCatalogueRegistryResponse,
} from "../app/control/catalog/catalogue-registry";

const validResponse = {
  source: "supabase",
  products: [
    {
      id: "product-1",
      code: "business_os",
      name: "SAKATA Business OS",
      description: null,
      status: "active",
      modules: [
        {
          id: "module-1",
          code: "admissions",
          name: "Admissions",
          definitionStatus: "active",
          assignmentStatus: "active",
          displayOrder: 10,
        },
      ],
    },
  ],
  organizationProducts: [
    { productDefinitionId: "product-1", status: "active" },
  ],
  moduleDefinitionCount: 1,
  activeModuleDefinitionCount: 1,
};

describe("database-backed catalogue registry response", () => {
  it("identifies all 16 curated products with stable, unique registry codes", () => {
    expect(CURATED_PRODUCT_IDENTITIES).toHaveLength(16);
    expect(new Set(CURATED_PRODUCT_IDENTITIES.map(({ id }) => id)).size).toBe(
      16,
    );
    expect(
      new Set(CURATED_PRODUCT_IDENTITIES.map(({ code }) => code)).size,
    ).toBe(16    );
    expect(CURATED_PRODUCT_IDENTITIES.map(({ code }) => code)).toEqual([
      "school_os",
      "business_os",
      "retail_os",
      "finance_os",
      "fleet_mobility_os",
      "real_estate_os",
      "hotel_os",
      "garage_os",
      "parking_access_os",
      "factory_os",
      "microfinance_os",
      "wholesale_os",
      "hospital_os",
      "construction_os",
      "agriculture_os",
      "workforce_os",
    ]);
  });

  it("accepts empty database results without implying registered products", () => {
    expect(
      parseCatalogueRegistryResponse({
        source: "supabase",
        products: [],
        organizationProducts: [],
        moduleDefinitionCount: 0,
        activeModuleDefinitionCount: 0,
      }),
    ).toEqual({
      source: "supabase",
      products: [],
      organizationProducts: [],
      moduleDefinitionCount: 0,
      activeModuleDefinitionCount: 0,
    });
  });

  it("preserves actual product, module, and organization statuses", () => {
    expect(parseCatalogueRegistryResponse(validResponse)).toEqual(validResponse);
  });

  it("rejects malformed product, module, and status data", () => {
    expect(() =>
      parseCatalogueRegistryResponse({
        ...validResponse,
        products: [{ ...validResponse.products[0], modules: [null] }],
      }),
    ).toThrow("invalid module");
    expect(() =>
      parseCatalogueRegistryResponse({
        ...validResponse,
        products: [{ ...validResponse.products[0], status: "ready" }],
      }),
    ).toThrow("invalid product");
    expect(() =>
      parseCatalogueRegistryResponse({
        ...validResponse,
        products: [
          {
            ...validResponse.products[0],
            modules: [
              {
                ...validResponse.products[0].modules[0],
                displayOrder: -1,
              },
            ],
          },
        ],
      }),
    ).toThrow("invalid module");
  });

  it("rejects duplicate product identities and module assignments", () => {
    expect(() =>
      parseCatalogueRegistryResponse({
        ...validResponse,
        products: [
          ...validResponse.products,
          { ...validResponse.products[0], id: "product-2" },
        ],
      }),
    ).toThrow("duplicate products");
    expect(() =>
      parseCatalogueRegistryResponse({
        ...validResponse,
        products: [
          {
            ...validResponse.products[0],
            modules: [
              validResponse.products[0].modules[0],
              { ...validResponse.products[0].modules[0], name: "Other" },
            ],
          },
        ],
      }),
    ).toThrow("duplicate module assignments");
  });

  it("rejects names that conflict with a curated product code", () => {
    expect(() =>
      parseCatalogueRegistryResponse({
        ...validResponse,
        products: [
          { ...validResponse.products[0], name: "SAKATA Commerce OS" },
        ],
      }),
    ).toThrow("unexpected product identity");
  });

  it("rejects duplicate or cross-product organization assignments", () => {
    expect(() =>
      parseCatalogueRegistryResponse({
        ...validResponse,
        organizationProducts: [
          ...validResponse.organizationProducts,
          ...validResponse.organizationProducts,
        ],
      }),
    ).toThrow("duplicate organization assignments");
    expect(() =>
      parseCatalogueRegistryResponse({
        ...validResponse,
        organizationProducts: [
          { productDefinitionId: "another-product", status: "active" },
        ],
      }),
    ).toThrow("invalid organization assignment");
  });

  it("rejects a wrong source, malformed collection, or invalid counts", () => {
    expect(() =>
      parseCatalogueRegistryResponse({ ...validResponse, source: "cache" }),
    ).toThrow("Invalid catalogue registry response");
    expect(() =>
      parseCatalogueRegistryResponse({
        ...validResponse,
        products: {},
      }),
    ).toThrow("Invalid catalogue registry response");
    expect(() =>
      parseCatalogueRegistryResponse({
        ...validResponse,
        activeModuleDefinitionCount: -1,
      }),
    ).toThrow("Invalid catalogue registry response");
    expect(() =>
      parseCatalogueRegistryResponse({
        ...validResponse,
        moduleDefinitionCount: 0,
      }),
    ).toThrow("Invalid catalogue registry response");
  });
});
