export const CURATED_PRODUCT_IDENTITIES = [
  { id: "education", code: "school_os", name: "SAKATA Education OS" },
  { id: "business", code: "business_os", name: "SAKATA Business OS" },
  { id: "commerce", code: "retail_os", name: "SAKATA Commerce OS" },
  { id: "finance", code: "finance_os", name: "SAKATA Finance OS" },
  {
    id: "fleet",
    code: "fleet_mobility_os",
    name: "SAKATA Fleet & Mobility OS",
  },
  { id: "property", code: "real_estate_os", name: "SAKATA Property OS" },
  {
    id: "hospitality",
    code: "hotel_os",
    name: "SAKATA Hospitality OS",
  },
  { id: "garage", code: "garage_os", name: "SAKATA Garage OS" },
  {
    id: "parking",
    code: "parking_access_os",
    name: "SAKATA Parking & Access OS",
  },
  {
    id: "manufacturing",
    code: "factory_os",
    name: "SAKATA Manufacturing OS",
  },
  {
    id: "microfinance",
    code: "microfinance_os",
    name: "SAKATA Microfinance OS",
  },
  {
    id: "supply",
    code: "wholesale_os",
    name: "SAKATA Supply Chain OS",
  },
  {
    id: "health",
    code: "hospital_os",
    name: "SAKATA Healthcare Administration OS",
  },
  {
    id: "construction",
    code: "construction_os",
    name: "SAKATA Construction OS",
  },
  {
    id: "agriculture",
    code: "agriculture_os",
    name: "SAKATA Agriculture OS",
  },
  { id: "workforce", code: "workforce_os", name: "SAKATA Workforce OS" },
] as const;

export type CatalogueStatus = "active" | "suspended" | "archived";

export type CatalogueRegistryModule = {
  id: string;
  code: string;
  name: string;
  definitionStatus: CatalogueStatus;
  assignmentStatus: CatalogueStatus;
  displayOrder: number;
};

export type CatalogueRegistryProduct = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: CatalogueStatus;
  modules: CatalogueRegistryModule[];
};

export type CatalogueOrganizationProduct = {
  productDefinitionId: string;
  status: CatalogueStatus;
};

export type CatalogueRegistryResponse = {
  source: "supabase";
  products: CatalogueRegistryProduct[];
  organizationProducts: CatalogueOrganizationProduct[];
  moduleDefinitionCount: number;
  activeModuleDefinitionCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCatalogueStatus(value: unknown): value is CatalogueStatus {
  return value === "active" || value === "suspended" || value === "archived";
}

export function parseCatalogueRegistryResponse(
  value: unknown,
): CatalogueRegistryResponse {
  if (
    !isRecord(value) ||
    value.source !== "supabase" ||
    !Array.isArray(value.products) ||
    !Array.isArray(value.organizationProducts) ||
    typeof value.moduleDefinitionCount !== "number" ||
    !Number.isSafeInteger(value.moduleDefinitionCount) ||
    value.moduleDefinitionCount < 0 ||
    typeof value.activeModuleDefinitionCount !== "number" ||
    !Number.isSafeInteger(value.activeModuleDefinitionCount) ||
    value.activeModuleDefinitionCount < 0 ||
    value.activeModuleDefinitionCount > value.moduleDefinitionCount
  ) {
    throw new Error("Invalid catalogue registry response.");
  }

  const productIds = new Set<string>();
  const productCodes = new Set<string>();
  const expectedNames = new Map<string, string>(
    CURATED_PRODUCT_IDENTITIES.map(({ code, name }) => [code, name]),
  );

  const products = value.products.map((product): CatalogueRegistryProduct => {
    if (
      !isRecord(product) ||
      !isNonEmptyString(product.id) ||
      !isNonEmptyString(product.code) ||
      !isNonEmptyString(product.name) ||
      !isCatalogueStatus(product.status) ||
      (product.description !== null &&
        typeof product.description !== "string") ||
      !Array.isArray(product.modules)
    ) {
      throw new Error("Catalogue registry contains an invalid product.");
    }

    if (expectedNames.get(product.code) !== product.name) {
      throw new Error("Catalogue registry contains an unexpected product identity.");
    }

    if (productIds.has(product.id) || productCodes.has(product.code)) {
      throw new Error("Catalogue registry contains duplicate products.");
    }

    productIds.add(product.id);
    productCodes.add(product.code);

    const moduleIds = new Set<string>();
    const moduleCodes = new Set<string>();
    const modules = product.modules.map(
      (module): CatalogueRegistryModule => {
        if (
          !isRecord(module) ||
          !isNonEmptyString(module.id) ||
          !isNonEmptyString(module.code) ||
          !isNonEmptyString(module.name) ||
          !isCatalogueStatus(module.definitionStatus) ||
          !isCatalogueStatus(module.assignmentStatus) ||
          typeof module.displayOrder !== "number" ||
          !Number.isSafeInteger(module.displayOrder) ||
          module.displayOrder < 0
        ) {
          throw new Error("Catalogue registry contains an invalid module.");
        }

        if (moduleIds.has(module.id) || moduleCodes.has(module.code)) {
          throw new Error(
            "Catalogue registry contains duplicate module assignments.",
          );
        }

        moduleIds.add(module.id);
        moduleCodes.add(module.code);

        return {
          id: module.id,
          code: module.code,
          name: module.name,
          definitionStatus: module.definitionStatus,
          assignmentStatus: module.assignmentStatus,
          displayOrder: module.displayOrder,
        };
      },
    );

    return {
      id: product.id,
      code: product.code,
      name: product.name,
      description: product.description,
      status: product.status,
      modules,
    };
  });

  const organizationProducts = value.organizationProducts.map(
    (assignment): CatalogueOrganizationProduct => {
      if (
        !isRecord(assignment) ||
        !isNonEmptyString(assignment.productDefinitionId) ||
        !isCatalogueStatus(assignment.status) ||
        !productIds.has(assignment.productDefinitionId)
      ) {
        throw new Error(
          "Catalogue registry contains an invalid organization assignment.",
        );
      }

      return {
        productDefinitionId: assignment.productDefinitionId,
        status: assignment.status,
      };
    },
  );

  if (
    new Set(
      organizationProducts.map(({ productDefinitionId }) => productDefinitionId),
    ).size !== organizationProducts.length
  ) {
    throw new Error(
      "Catalogue registry contains duplicate organization assignments.",
    );
  }

  return {
    source: "supabase",
    products,
    organizationProducts,
    moduleDefinitionCount: value.moduleDefinitionCount,
    activeModuleDefinitionCount: value.activeModuleDefinitionCount,
  };
}
