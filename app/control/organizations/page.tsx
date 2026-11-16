import Link from "next/link";
import { requirePermission } from "@/app/lib/auth/authorization";
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
  status: string;
};

type OrganizationDeployment = {
  id: string;
  organization_id: string;
  product: Product;
  moduleCount: number;
};

export default async function OrganizationsPage() {
  await requirePermission("organization.read");

  const context = await getOrganizationContext();
  const supabase = await createClient();

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select(
      `
        id,
        organization_id,
        status,
        joined_at,
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
    .eq("status", "active")
    .order("joined_at");

  if (membershipsError) {
    throw new Error(
      `Failed to load available organizations: ${membershipsError.message}`
    );
  }

  const organizations: Organization[] = [];

  for (const membership of memberships ?? []) {
    const organization = Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations;

    if (organization) {
      organizations.push(organization as Organization);
    }
  }

  if (!organizations.some((organization) => organization.id === context.organization.id)) {
    throw new Error(
      "The current organization is missing from the user's active memberships."
    );
  }

  const organizationIds = organizations.map((organization) => organization.id);
  const deploymentsByOrganization = new Map<
    string,
    OrganizationDeployment[]
  >();

  if (organizationIds.length > 0) {
    const { data: organizationProducts, error: deploymentsError } =
      await supabase
        .from("organization_products")
        .select(
          `
            id,
            organization_id,
            product_definitions (
              id,
              code,
              name,
              status
            )
          `
        )
        .in("organization_id", organizationIds)
        .eq("status", "active")
        .order("created_at");

    if (deploymentsError) {
      throw new Error(
        `Failed to load organization deployments: ${deploymentsError.message}`
      );
    }

    const validOrganizationProducts = (organizationProducts ?? [])
      .map((organizationProduct) => {
        const product = Array.isArray(organizationProduct.product_definitions)
          ? organizationProduct.product_definitions[0]
          : organizationProduct.product_definitions;

        if (!product) {
          return null;
        }

        return {
          id: organizationProduct.id,
          organization_id: organizationProduct.organization_id,
          product: product as Product,
          moduleCount: 0,
        };
      })
      .filter((deployment) => deployment !== null);

    const organizationProductIds = validOrganizationProducts.map(
      (deployment) => deployment.id
    );
    const moduleCounts = new Map<string, number>();

    if (organizationProductIds.length > 0) {
      const { data: modules, error: modulesError } = await supabase
        .from("organization_product_modules")
        .select("organization_product_id")
        .in("organization_product_id", organizationProductIds)
        .eq("status", "active");

      if (modulesError) {
        throw new Error(
          `Failed to load active organization product modules: ${modulesError.message}`
        );
      }

      for (const productModule of modules ?? []) {
        moduleCounts.set(
          productModule.organization_product_id,
          (moduleCounts.get(productModule.organization_product_id) ?? 0) + 1
        );
      }
    }

    for (const deployment of validOrganizationProducts) {
      const organizationDeployments =
        deploymentsByOrganization.get(deployment.organization_id) ?? [];

      organizationDeployments.push({
        ...deployment,
        moduleCount: moduleCounts.get(deployment.id) ?? 0,
      });
      deploymentsByOrganization.set(
        deployment.organization_id,
        organizationDeployments
      );
    }
  }

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

            <span
              title="Control Plane surface not implemented yet"
              className="block cursor-default rounded-xl px-3 py-2.5 text-sm text-slate-600"
            >
              Product Families
            </span>

            <Link
              href="/control/verification/modules"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Modules
            </Link>

            <span
              title="Control Plane surface not implemented yet"
              className="block cursor-default rounded-xl px-3 py-2.5 text-sm text-slate-600"
            >
              Capabilities
            </span>
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

            <span
              title="Control Plane surface not implemented yet"
              className="block cursor-default rounded-xl px-3 py-2.5 text-sm text-slate-600"
            >
              Entitlements
            </span>

            <span
              title="Control Plane surface not implemented yet"
              className="block cursor-default rounded-xl px-3 py-2.5 text-sm text-slate-600"
            >
              Subscriptions
            </span>

            <span
              title="Control Plane surface not implemented yet"
              className="block cursor-default rounded-xl px-3 py-2.5 text-sm text-slate-600"
            >
              Users &amp; Roles
            </span>

            <span
              title="Control Plane surface not implemented yet"
              className="block cursor-default rounded-xl px-3 py-2.5 text-sm text-slate-600"
            >
              Permissions
            </span>
          </div>

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

            <Link
              href="/control/workflows"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Workflows
            </Link>

            <Link
              href="/control/automation"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Automations
            </Link>

            <Link
              href="/control/tasks"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Tasks
            </Link>

            <span
              title="Control Plane surface not implemented yet"
              className="block cursor-default rounded-xl px-3 py-2.5 text-sm text-slate-600"
            >
              Integrations
            </span>
          </div>

          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Governance
            </p>

            <Link
              href="/control/verification/notifications"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Audit &amp; Evidence
            </Link>

            <span
              title="Control Plane surface not implemented yet"
              className="block cursor-default rounded-xl px-3 py-2.5 text-sm text-slate-600"
            >
              System Health
            </span>

            <Link
              href="/control/verification/modules"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Deployments
            </Link>
          </div>

          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Applications
            </p>

            <Link
              href="/school"
              className="block rounded-xl bg-emerald-400/10 px-3 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/15"
            >
              School OS
            </Link>
          </div>
        </div>
      </aside>

      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400">
                SAKATA Operating Systems
              </p>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Organizations
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
                Review organizations available to your Control Plane account,
                their current status, and the products deployed to each.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                Current Organization
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                {context.organization.name}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {context.organization.organization_type}
              </p>
            </div>
          </div>
        </header>

        <section aria-label="Available organizations">
          <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Organization Governance
              </p>
              <h2 className="mt-2 text-2xl font-bold">Available organizations</h2>
            </div>
            <p className="text-sm text-slate-400">
              {organizations.length} active{" "}
              {organizations.length === 1 ? "organization" : "organizations"}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {organizations.map((organization) => {
              const deployments =
                deploymentsByOrganization.get(organization.id) ?? [];
              const isCurrent =
                organization.id === context.organization.id;

              return (
                <article
                  key={organization.id}
                  className={`rounded-2xl border bg-slate-900 p-6 ${
                    isCurrent
                      ? "border-emerald-500/40"
                      : "border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-slate-500">
                        {organization.slug}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-100">
                        {organization.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {organization.organization_type}
                      </p>
                    </div>
                    {isCurrent ? (
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        Current
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                        {organization.status}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 border-t border-slate-800 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Active Product Deployments
                      </p>
                      <p className="text-sm font-semibold text-slate-200">
                        {deployments.length}
                      </p>
                    </div>

                    {deployments.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {deployments.map((deployment) => (
                          <li
                            key={deployment.id}
                            className="flex items-center justify-between gap-4 text-sm"
                          >
                            <span className="min-w-0">
                              <span className="font-mono text-xs text-slate-500">
                                {deployment.product.code}
                              </span>
                              <span className="ml-2 text-slate-200">
                                {deployment.product.name}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs text-slate-400">
                              {deployment.moduleCount} active modules
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        No active product deployments.
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/control/organizations/${organization.id}`}
                    className="mt-5 inline-flex text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
                  >
                    View organization details
                    <span className="ml-2" aria-hidden="true">
                      -&gt;
                    </span>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

      </div>
    </main>
  );
}
