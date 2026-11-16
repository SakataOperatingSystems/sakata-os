import { NextResponse } from "next/server";
import {
  CURATED_PRODUCT_IDENTITIES,
  type CatalogueStatus,
} from "@/app/control/catalog/catalogue-registry";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

type ProductDefinition = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: CatalogueStatus;
};

type ModuleDefinition = {
  id: string;
  code: string;
  name: string;
  status: CatalogueStatus;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function isAuthenticationRedirect(error: unknown): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("digest" in error) ||
    typeof error.digest !== "string"
  ) {
    return false;
  }

  const [, , destination] = error.digest.split(";");
  return destination === "/login";
}

function databaseFailure(table: string, error: { message: string }) {
  console.error(`Catalogue ${table} query failed:`, error.message);
  return jsonResponse({ error: `Unable to load catalogue ${table}.` }, 500);
}

export async function GET() {
  try {
    try {
      await requirePermission("organization.read");
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Forbidden:")) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      throw error;
    }

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();
    const productCodes = CURATED_PRODUCT_IDENTITIES.map(({ code }) => code);

    const { data: productRows, error: productsError } = await supabase
      .from("product_definitions")
      .select("id, code, name, description, status")
      .in("code", productCodes)
      .order("code");

    if (productsError) return databaseFailure("products", productsError);

    const products = (productRows ?? []) as ProductDefinition[];
    const expectedNames = new Map<string, string>(
      CURATED_PRODUCT_IDENTITIES.map(({ code, name }) => [code, name]),
    );
    const unexpectedProduct = products.find(
      (product) => expectedNames.get(product.code) !== product.name,
    );
    if (unexpectedProduct) {
      console.error(
        "Catalogue registry contains a product identity mismatch:",
        unexpectedProduct.code,
      );
      return jsonResponse(
        { error: "Catalogue registry contains an unexpected product identity." },
        500,
      );
    }

    const productIds = products.map(({ id }) => id);

    const { data: moduleRows, error: modulesError } = await supabase
      .from("module_definitions")
      .select("id, code, name, status")
      .order("code");

    if (modulesError) return databaseFailure("module definitions", modulesError);

    const modules = (moduleRows ?? []) as ModuleDefinition[];
    const moduleById = new Map(modules.map((module) => [module.id, module]));

    const assignmentQuery = productIds.length
      ? supabase
          .from("product_modules")
          .select(
            "product_definition_id, module_definition_id, status, display_order",
          )
          .in("product_definition_id", productIds)
          .order("display_order")
      : null;

    const { data: assignmentRows, error: assignmentsError } = assignmentQuery
      ? await assignmentQuery
      : { data: [], error: null };

    if (assignmentsError) {
      return databaseFailure("product-module assignments", assignmentsError);
    }

    const productById = new Map(products.map((product) => [product.id, product]));
    const modulesByProduct = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        definitionStatus: CatalogueStatus;
        assignmentStatus: CatalogueStatus;
        displayOrder: number;
      }[]
    >();
    const seenAssignments = new Set<string>();

    for (const assignment of assignmentRows ?? []) {
      const product = productById.get(assignment.product_definition_id);
      const moduleDefinition = moduleById.get(
        assignment.module_definition_id,
      );
      const assignmentKey = `${assignment.product_definition_id}:${assignment.module_definition_id}`;

      if (!product || !moduleDefinition) {
        console.error(
          "Catalogue assignment references a missing or unavailable definition.",
          assignmentKey,
        );
        return jsonResponse(
          { error: "Catalogue assignments reference unavailable definitions." },
          500,
        );
      }

      if (seenAssignments.has(assignmentKey)) {
        console.error("Catalogue contains a duplicate product-module assignment.");
        return jsonResponse(
          { error: "Catalogue contains duplicate module assignments." },
          500,
        );
      }
      seenAssignments.add(assignmentKey);

      const productModules =
        modulesByProduct.get(assignment.product_definition_id) ?? [];
      productModules.push({
        id: moduleDefinition.id,
        code: moduleDefinition.code,
        name: moduleDefinition.name,
        definitionStatus: moduleDefinition.status,
        assignmentStatus: assignment.status,
        displayOrder: assignment.display_order,
      });
      modulesByProduct.set(assignment.product_definition_id, productModules);
    }

    const organizationProductQuery = productIds.length
      ? supabase
          .from("organization_products")
          .select("product_definition_id, status")
          .eq("organization_id", organizationId)
          .in("product_definition_id", productIds)
      : null;
    const { data: organizationProductRows, error: organizationProductsError } =
      organizationProductQuery
        ? await organizationProductQuery
        : { data: [], error: null };

    if (organizationProductsError) {
      return databaseFailure(
        "organization product assignments",
        organizationProductsError,
      );
    }

    const organizationProducts = (organizationProductRows ?? []).map(
      (assignment) => ({
        productDefinitionId: assignment.product_definition_id,
        status: assignment.status,
      }),
    );

    return jsonResponse({
      source: "supabase",
      products: products.map((product) => ({
        ...product,
        modules: modulesByProduct.get(product.id) ?? [],
      })),
      organizationProducts,
      moduleDefinitionCount: modules.length,
      activeModuleDefinitionCount: modules.filter(
        (moduleDefinition) => moduleDefinition.status === "active",
      ).length,
    });
  } catch (error) {
    if (isAuthenticationRedirect(error)) {
      return jsonResponse(
        { error: "Authentication is required to read catalogue data." },
        401,
      );
    }

    console.error("Catalogue API failed:", error);
    return jsonResponse(
      { error: "Catalogue data is currently unavailable." },
      500,
    );
  }
}
