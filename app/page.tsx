import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

export default async function Home() {
  await requirePermission("organization.read");

  const { organizationId } = await getOrganizationContext();
  const supabase = await createClient();

  const { data: products, error: productsError } = await supabase
    .from("product_definitions")
    .select("id, code, name, description, status")
    .eq("status", "active")
    .order("name");

  if (productsError) {
    throw new Error(
      `Failed to load product definitions: ${productsError.message}`
    );
  }

  const productIds = (products ?? []).map((product) => product.id);

  const { data: assignments, error: assignmentsError } =
    await supabase
      .from("organization_products")
      .select("product_definition_id, status")
      .eq("organization_id", organizationId)
      .eq("status", "active");

  if (assignmentsError) {
    throw new Error(
      `Failed to load organization products: ${assignmentsError.message}`
    );
  }

  const assignedProductIds = new Set(
    (assignments ?? []).map(
      (assignment) => assignment.product_definition_id
    )
  );

  const { data: productModules, error: modulesError } = await supabase
    .from("product_modules")
    .select(
      `
        product_definition_id,
        module_definition_id,
        status,
        display_order,
        module_definitions (
          code,
          name,
          category,
          status
        )
      `
    )
    .in("product_definition_id", productIds)
    .eq("status", "active")
    .order("display_order");

  if (modulesError) {
    throw new Error(
      `Failed to load product modules: ${modulesError.message}`
    );
  }

  const modulesByProduct = new Map<
    string,
    Array<{
      code: string;
      name: string;
      category: string | null;
    }>
  >();

  for (const row of productModules ?? []) {
    const module = Array.isArray(row.module_definitions)
      ? row.module_definitions[0]
      : row.module_definitions;

    if (!module || module.status !== "active") {
      continue;
    }

    const existing = modulesByProduct.get(row.product_definition_id) ?? [];

    existing.push({
      code: module.code,
      name: module.name,
      category: module.category,
    });

    modulesByProduct.set(row.product_definition_id, existing);
  }

  const assignedProducts = (products ?? []).filter((product) =>
    assignedProductIds.has(product.id)
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-10">
          <p className="text-sm font-medium tracking-[0.25em] text-sky-300">
            SAKATA OPERATING SYSTEMS
          </p>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Control Center
              </h1>

              <p className="mt-3 max-w-3xl text-lg text-slate-400">
                Central operating platform for organizations, products,
                capabilities, permissions, workflows, and operational control.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Organization
              </p>

              <p className="mt-1 font-medium text-white">
                SAKATA Operating Systems
              </p>
            </div>
          </div>
        </header>

        <section className="mb-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Active Products</p>

            <p className="mt-3 text-4xl font-bold">
              {assignedProducts.length}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Products currently assigned to this organization.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Product Catalogue</p>

            <p className="mt-3 text-4xl font-bold">
              {(products ?? []).length}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              SAKATA products available in the platform catalogue.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Platform Model</p>

            <p className="mt-3 text-2xl font-bold">
              Multi-Product
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Products are composed from reusable operational capabilities.
            </p>
          </div>
        </section>

        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-semibold">
              SAKATA Products
            </h2>

            <p className="mt-1 text-slate-400">
              Products available through the SAKATA operating platform.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {(products ?? []).map((product) => {
              const modules =
                modulesByProduct.get(product.id) ?? [];

              const assigned = assignedProductIds.has(product.id);

              return (
                <article
                  key={product.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-sky-300">
                        {product.code}
                      </p>

                      <h3 className="mt-2 text-2xl font-semibold">
                        {product.name}
                      </h3>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        assigned
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {assigned ? "Active" : "Catalogue"}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    {product.description}
                  </p>

                  <div className="mt-6 border-t border-slate-800 pt-5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-200">
                        Reusable Capabilities
                      </h4>

                      <span className="text-sm text-slate-500">
                        {modules.length}
                      </span>
                    </div>

                    {modules.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {modules.map((module) => (
                          <span
                            key={module.code}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300"
                          >
                            {module.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        No active capabilities assigned.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}