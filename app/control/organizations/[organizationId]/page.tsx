import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPermissionsForOrganization,
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
  status: string;
};

type Deployment = {
  id: string;
  product: Product;
  moduleCount: number;
};

type PageProps = {
  params: Promise<{ organizationId: string }>;
};

export default async function OrganizationDetailPage({ params }: PageProps) {
  await requirePermission("organization.read");

  const { organizationId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      organizationId
    )
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
        organization_id,
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

  const organizationData = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  if (!organizationData) {
    notFound();
  }

  const organization = organizationData as Organization;
  const isCurrentOrganization =
    organization.id === context.organization.id;
  const organizationPermissions = await getPermissionsForOrganization(
    organization.id
  );
  const canReadMemberships =
    organizationPermissions.has("memberships.read");

  const { data: organizationProducts, error: deploymentsError } =
    await supabase
      .from("organization_products")
      .select(
        `
          id,
          product_definitions (
            id,
            code,
            name,
            status
          )
        `
      )
      .eq("organization_id", organization.id)
      .eq("status", "active")
      .order("created_at");

  if (deploymentsError) {
    throw new Error(
      `Failed to load deployments for ${organization.name}: ${deploymentsError.message}`
    );
  }

  const productDeployments = (organizationProducts ?? [])
    .map((organizationProduct) => {
      const product = Array.isArray(organizationProduct.product_definitions)
        ? organizationProduct.product_definitions[0]
        : organizationProduct.product_definitions;

      if (!product) {
        return null;
      }

      return {
        id: organizationProduct.id,
        product: product as Product,
        moduleCount: 0,
      };
    })
    .filter((deployment) => deployment !== null);

  const deploymentIds = productDeployments.map((deployment) => deployment.id);
  const moduleCounts = new Map<string, number>();

  if (deploymentIds.length > 0) {
    const { data: modules, error: modulesError } = await supabase
      .from("organization_product_modules")
      .select("organization_product_id")
      .in("organization_product_id", deploymentIds)
      .eq("status", "active");

    if (modulesError) {
      throw new Error(
        `Failed to load active modules for ${organization.name}: ${modulesError.message}`
      );
    }

    for (const productModule of modules ?? []) {
      moduleCounts.set(
        productModule.organization_product_id,
        (moduleCounts.get(productModule.organization_product_id) ?? 0) + 1
      );
    }
  }

  const deployments: Deployment[] = productDeployments.map((deployment) => ({
    ...deployment,
    moduleCount: moduleCounts.get(deployment.id) ?? 0,
  }));
  const activeModuleCount = deployments.reduce(
    (total, deployment) => total + deployment.moduleCount,
    0
  );

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
            {canReadMemberships && (
              <Link
                href={`/control/organizations/${organization.id}/users`}
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                Users &amp; Roles
              </Link>
            )}
          </div>

          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Operations
            </p>
            {isCurrentOrganization && (
              <Link
                href="/control/configuration"
                className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                Configuration
              </Link>
            )}
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
        </div>
      </aside>

      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-10">
          <Link
            href="/control/organizations"
            className="text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
          >
            &lt;- All organizations
          </Link>

          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400">
                Organization Governance
              </p>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                {organization.name}
              </h1>
              <p className="mt-3 font-mono text-sm text-slate-500">
                {organization.slug}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {isCurrentOrganization && (
                <span className="rounded-full bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                  Current Organization
                </span>
              )}
              <span className="rounded-full bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200">
                {organization.status}
              </span>
            </div>
          </div>
        </header>

        <section
          className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Organization overview"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Organization Type</p>
            <p className="mt-2 text-xl font-semibold">
              {organization.organization_type}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Active Product Deployments</p>
            <p className="mt-2 text-3xl font-bold">{deployments.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Active Modules &amp; Capabilities
            </p>
            <p className="mt-2 text-3xl font-bold">{activeModuleCount}</p>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Organization Composition
            </p>
            <h2 className="mt-2 text-2xl font-bold">Product deployments</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Active products and reusable modules assigned to this
              organization.
            </p>
          </div>

          {deployments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {deployments.map((deployment) => (
                <Link
                  key={deployment.id}
                  href={`/control/organizations/${organization.id}/deployments/${deployment.id}`}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-emerald-500/40 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-slate-500">
                        {deployment.product.code}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold">
                        {deployment.product.name}
                      </h3>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      {deployment.product.status}
                    </span>
                  </div>
                  <div className="mt-5 border-t border-slate-800 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-400">
                        Active modules and capabilities
                      </p>
                      <span className="text-sm font-semibold text-slate-200">
                        View deployment -&gt;
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {deployment.moduleCount}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
              <p className="font-semibold text-amber-200">
                No active product deployments
              </p>
              <p className="mt-2 text-sm text-amber-300/70">
                No active products are assigned to this organization.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Operations
          </p>
          <h2 className="mt-2 text-2xl font-bold">Organization controls</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Review deployed configuration and operational controls for this
            organization.
          </p>

          {isCurrentOrganization ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {canReadMemberships && (
                <Link
                  href={`/control/organizations/${organization.id}/users`}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  Organization Users &amp; Roles
                </Link>
              )}
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
                  Workflow Configuration
                </Link>
              )}
              {canReadTasks && (
                <Link
                  href="/control/tasks"
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  Task Engine
                </Link>
              )}
              {canReadAutomation && (
                <Link
                  href="/control/automation"
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
                >
                  Automation Control Center
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
