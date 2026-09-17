import Link from "next/link";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

type Product = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
};

type Deployment = {
  id: string;
  product: Product;
  moduleCount: number;
};

export default async function ControlPlanePage() {
  await requirePermission("organization.read");

  const context = await getOrganizationContext();
  const supabase = await createClient();

  const { data: products, error: productsError } = await supabase
    .from("product_definitions")
    .select("id, code, name, description, status")
    .eq("status", "active")
    .order("name");

  if (productsError) {
    throw new Error(
      `Failed to load operating product catalogue: ${productsError.message}`
    );
  }

  const activeProducts = (products ?? []) as Product[];

  const { data: organizationProducts, error: deploymentsError } =
    await supabase
      .from("organization_products")
      .select(
        `
          id,
          product_definition_id,
          product_definitions (
            id,
            code,
            name,
            description,
            status
          )
        `
      )
      .eq("organization_id", context.organization.id)
      .eq("status", "active")
      .order("created_at");

  if (deploymentsError) {
    throw new Error(
      `Failed to load organization deployments: ${deploymentsError.message}`
    );
  }

  const deployments: Deployment[] = [];

  for (const organizationProduct of organizationProducts ?? []) {
    const product = Array.isArray(organizationProduct.product_definitions)
      ? organizationProduct.product_definitions[0]
      : organizationProduct.product_definitions;

    if (!product) {
      continue;
    }

    const { data: modules, error: modulesError } = await supabase
      .from("organization_product_modules")
      .select("id")
      .eq("organization_product_id", organizationProduct.id)
      .eq("status", "active");

    if (modulesError) {
      throw new Error(
        `Failed to load active modules for ${product.code}: ${modulesError.message}`
      );
    }

    deployments.push({
      id: organizationProduct.id,
      product: product as Product,
      moduleCount: modules?.length ?? 0,
    });
  }

  const deployedProductIds = new Set(
    deployments.map((deployment) => deployment.product.id)
  );

  const activeDeploymentModuleCount = deployments.reduce(
    (total, deployment) => total + deployment.moduleCount,
    0
  );

  const { count: reusableCapabilityCount, error: capabilityError } =
    await supabase
      .from("module_definitions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

  if (capabilityError) {
    throw new Error(
      `Failed to count reusable capabilities: ${capabilityError.message}`
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400">
                SAKATA Operating Systems
              </p>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Control Plane
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
                The platform control surface for operating products, reusable
                capabilities, organizational deployments, and operational
                configuration.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Current Organization
              </p>

              <p className="mt-2 text-lg font-semibold text-slate-100">
                {context.organization.name}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {context.organization.organization_type}
              </p>
            </div>
          </div>
        </header>

        <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Operating Products</p>
            <p className="mt-2 text-3xl font-bold">
              {activeProducts.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Active platform catalogue
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Reusable Capabilities</p>
            <p className="mt-2 text-3xl font-bold">
              {reusableCapabilityCount ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Active module definitions
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Active Deployments</p>
            <p className="mt-2 text-3xl font-bold">{deployments.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              Products assigned to this organization
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Deployed Modules</p>
            <p className="mt-2 text-3xl font-bold">
              {activeDeploymentModuleCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Active capabilities in this organization
            </p>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Platform Catalogue
            </p>

            <h2 className="mt-2 text-2xl font-bold">Operating Products</h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              SAKATA OS is the platform. Operating products are configurable
              environments composed from reusable capabilities.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeProducts.map((product) => {
              const deployment = deployments.find(
                (item) => item.product.id === product.id
              );

              return (
                <article
                  key={product.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-slate-500">
                        {product.code}
                      </p>

                      <h3 className="mt-2 text-xl font-semibold">
                        {product.name}
                      </h3>
                    </div>

                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      Active
                    </span>
                  </div>

                  {product.description && (
                    <p className="mt-4 text-sm leading-6 text-slate-400">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-6 border-t border-slate-800 pt-4">
                    {deployment ? (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-400">
                          Active Deployment
                        </p>

                        <p className="mt-2 text-sm text-slate-300">
                          {deployment.moduleCount} active capabilities
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Available in the platform catalogue
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Organization Deployment
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {context.organization.name}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                This organization operates the products and capabilities
                assigned to its tenant. Configuration controls determine how
                those capabilities behave.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/control/configuration"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                Configure Platform
              </Link>

              <Link
                href="/school"
                className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Open School OS
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-slate-800 pt-6 sm:grid-cols-2">
            {deployments.map((deployment) => (
              <div
                key={deployment.id}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-5"
              >
                <p className="font-mono text-xs text-slate-500">
                  {deployment.product.code}
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {deployment.product.name}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {deployment.moduleCount} active modules
                </p>
              </div>
            ))}

            {deployments.length === 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
                <p className="font-semibold text-amber-200">
                  No active product deployment
                </p>

                <p className="mt-1 text-sm text-amber-300/70">
                  This organization does not currently have an active product
                  assignment.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/control/configuration"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600 hover:bg-slate-800"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Control
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Configuration Center
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Inspect and manage effective configuration across the
              organization&apos;s active product modules.
            </p>

            <p className="mt-4 text-sm font-semibold text-emerald-400">
              Open Configuration →
            </p>
          </Link>

          <Link
            href="/school"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600 hover:bg-slate-800"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Operating Application
            </p>

            <h2 className="mt-2 text-xl font-semibold">School OS</h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Open the school operating environment and continue into its
              operational capabilities.
            </p>

            <p className="mt-4 text-sm font-semibold text-emerald-400">
              Open School OS →
            </p>
          </Link>
        </section>

        <footer className="mt-10 border-t border-slate-800 pt-6 text-sm text-slate-500">
          SAKATA Operating Systems · Control Plane
        </footer>
      </div>
    </main>
  );
}