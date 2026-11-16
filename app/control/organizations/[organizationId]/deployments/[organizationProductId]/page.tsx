import Link from "next/link";
import { notFound } from "next/navigation";
import {
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

type Organization = {
  id: string;
  name: string;
  slug: string;
  organization_type: string;
  status: string;
};

type Product = {
  id: string;
  code: string;
  name: string;
};

type ModuleDefinition = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  status: string;
};

type ProductModule = {
  id: string;
  status: string;
  module_definitions: ModuleDefinition | ModuleDefinition[] | null;
};

type DeploymentModule = {
  id: string;
  status: string;
  product_modules: ProductModule | ProductModule[] | null;
};

type PageProps = {
  params: Promise<{
    organizationId: string;
    organizationProductId: string;
  }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function OrganizationProductDeploymentPage({
  params,
}: PageProps) {
  await requirePermission("organization.read");

  const { organizationId, organizationProductId } = await params;
  if (
    !UUID_PATTERN.test(organizationId) ||
    !UUID_PATTERN.test(organizationProductId)
  ) {
    notFound();
  }

  const context = await getOrganizationContext();
  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select(
      `
        id,
        organizations (
          id,
          name,
          slug,
          organization_type,
          status
        )
      `
    )
    .eq("user_profile_id", context.profile.id)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Failed to verify access to the selected organization: ${membershipError.message}`
    );
  }

  if (!membership) {
    notFound();
  }

  const organization = firstRelation(membership.organizations) as
    | Organization
    | null;
  if (!organization) {
    notFound();
  }

  const { data: organizationProduct, error: deploymentError } = await supabase
    .from("organization_products")
    .select(
      `
        id,
        organization_id,
        status,
        activated_at,
        deactivated_at,
        product_definitions (
          id,
          code,
          name
        )
      `
    )
    .eq("id", organizationProductId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (deploymentError) {
    throw new Error(
      `Failed to load organization product deployment: ${deploymentError.message}`
    );
  }

  if (!organizationProduct) {
    notFound();
  }

  const product = firstRelation(organizationProduct.product_definitions) as
    | Product
    | null;
  if (!product) {
    notFound();
  }

  const { data: deploymentModules, error: modulesError } = await supabase
    .from("organization_product_modules")
    .select(
      `
        id,
        status,
        product_modules (
          id,
          status,
          module_definitions (
            id,
            code,
            name,
            category,
            status
          )
        )
      `
    )
    .eq("organization_product_id", organizationProduct.id)
    .order("created_at");

  if (modulesError) {
    throw new Error(
      `Failed to load modules for ${product.name}: ${modulesError.message}`
    );
  }

  const modules = (deploymentModules ?? [])
    .map((deploymentModule) => {
      const productModule = firstRelation(
        deploymentModule.product_modules as
          | ProductModule
          | ProductModule[]
          | null
      );
      const definition = productModule
        ? firstRelation(productModule.module_definitions)
        : null;

      if (!productModule || !definition) {
        return null;
      }

      return {
        id: deploymentModule.id,
        status: deploymentModule.status,
        productModuleStatus: productModule.status,
        definition,
      };
    })
    .filter((module) => module !== null);

  const activeModuleCount = modules.filter(
    (module) => module.status === "active"
  ).length;
  const isCurrentOrganization =
    organization.id === context.organization.id;
  const [canReadWorkflows, canReadTasks, canReadAutomation] =
    isCurrentOrganization
      ? await Promise.all([
          hasPermission("core.workflows.read"),
          hasPermission("core.tasks.read"),
          hasPermission("core.automation.read"),
        ])
      : [false, false, false];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
      <aside className="mb-8 lg:sticky lg:top-6 lg:mb-0 lg:self-start">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="px-3 pb-4 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
              SAKATA OS
            </p>
            <p className="mt-1 text-xs text-slate-500">
              System Control Plane
            </p>
          </div>
          <div className="space-y-1">
            <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Platform
            </p>
            <Link
              href="/control"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Control Plane
            </Link>
            <Link
              href="/control/catalog"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Product Catalogue
            </Link>
            <Link
              href="/control/verification/modules"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Modules
            </Link>
          </div>
          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Organization
            </p>
            <Link
              href="/control/organizations"
              className="block rounded-xl bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white"
              aria-current="page"
            >
              Organizations
            </Link>
          </div>
          {isCurrentOrganization && (
            <div className="mt-5 border-t border-slate-800 pt-4">
              <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Operations
              </p>
              <Link
                href="/control/configuration"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                Configuration
              </Link>
              {canReadWorkflows && (
                <Link
                  href="/control/workflows"
                  className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  Workflows
                </Link>
              )}
              {canReadAutomation && (
                <Link
                  href="/control/automation"
                  className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  Automations
                </Link>
              )}
              {canReadTasks && (
                <Link
                  href="/control/tasks"
                  className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  Tasks
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>

      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-10">
          <Link
            href={`/control/organizations/${organization.id}`}
            className="text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
          >
            &lt;- {organization.name}
          </Link>
          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400">
                Product Deployment
              </p>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                {product.name}
              </h1>
              <p className="mt-3 font-mono text-sm text-slate-500">
                {product.code}
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold capitalize text-slate-200">
              {organizationProduct.status}
            </span>
          </div>
        </header>

        <section
          className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Deployment overview"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Organization</p>
            <p className="mt-2 text-lg font-semibold">{organization.name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {organization.organization_type}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Product</p>
            <p className="mt-2 text-lg font-semibold">{product.name}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">
              {product.code}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Deployment Status</p>
            <p className="mt-2 text-xl font-semibold capitalize">
              {organizationProduct.status}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Active Modules</p>
            <p className="mt-2 text-3xl font-bold">{activeModuleCount}</p>
            <p className="mt-1 text-xs text-slate-500">
              {modules.length} deployed module assignments
            </p>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
              Deployment Composition
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Deployed modules and capabilities
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Module assignments currently associated with this product
              deployment.
            </p>
          </div>

          {modules.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {modules.map((module) => (
                <article
                  key={module.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {module.definition.category && (
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {module.definition.category}
                        </p>
                      )}
                      <h3 className="mt-1 text-lg font-semibold text-slate-100">
                        {module.definition.name}
                      </h3>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {module.definition.code}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        module.status === "active"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {module.status}
                    </span>
                  </div>
                  {(module.productModuleStatus !== "active" ||
                    module.definition.status !== "active") && (
                    <p className="mt-3 text-xs text-slate-500">
                      Product module: {module.productModuleStatus}; capability
                      definition: {module.definition.status}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="font-semibold text-slate-200">
                No modules are assigned to this deployment.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Operations
          </p>
          <h2 className="mt-2 text-2xl font-bold">Deployment controls</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Open the existing organization operations surfaces to review
            configuration and operational capability settings.
          </p>
          {isCurrentOrganization ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/control/configuration"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                Configuration Center
              </Link>
              {canReadWorkflows && (
                <Link
                  href="/control/workflows"
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  Workflows
                </Link>
              )}
              {canReadTasks && (
                <Link
                  href="/control/tasks"
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  Tasks
                </Link>
              )}
              {canReadAutomation && (
                <Link
                  href="/control/automation"
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
                >
                  Automations
                </Link>
              )}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
              Organization-specific operations are available for the current
              organization context only.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
