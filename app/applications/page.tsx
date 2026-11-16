import OrganizationSwitcher from "./organization-switcher";
import ThemeToggle from "@/app/components/theme-toggle";
import Link from "next/link";
import {
  getCurrentPermissions,
  getPlatformControlPlaneAccess,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

type Product = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
};

type OrganizationDeployment = {
  id: string;
  status: string;
  product: Product;
};

const APPLICATION_ENTRY_POINTS: Record<
  string,
  { href: string; permission: string }
> = {
  school_os: {
    href: "/school",
    permission: "school.academic_periods.read",
  },
};

export default async function ApplicationsPage() {
  const { organization } = await getOrganizationContext();
  const permissions = await getCurrentPermissions();
  const supabase = await createClient();

  const { data: organizationProducts, error: deploymentsError } =
    await supabase
      .from("organization_products")
      .select(
        `
          id,
          status,
          product_definitions (
            id,
            code,
            name,
            description,
            status
          )
        `
      )
      .eq("organization_id", organization.id)
      .eq("status", "active")
      .order("created_at");

  if (deploymentsError) {
    throw new Error(
      `Failed to load applications for ${organization.name}: ${deploymentsError.message}`
    );
  }

  const deployments: OrganizationDeployment[] = [];

  for (const organizationProduct of organizationProducts ?? []) {
    const product = Array.isArray(organizationProduct.product_definitions)
      ? organizationProduct.product_definitions[0]
      : organizationProduct.product_definitions;

    if (!product || product.status !== "active") {
      continue;
    }

    deployments.push({
      id: organizationProduct.id,
      status: organizationProduct.status,
      product: product as Product,
    });
  }

  const deployedProductIds = deployments.map(
    (deployment) => deployment.id
  );
  const activeModuleCounts = new Map<string, number>();

  if (deployedProductIds.length > 0) {
    const { data: modules, error: modulesError } = await supabase
      .from("organization_product_modules")
      .select("organization_product_id")
      .in("organization_product_id", deployedProductIds)
      .eq("status", "active");

    if (modulesError) {
      throw new Error(
        `Failed to load application capabilities for ${organization.name}: ${modulesError.message}`
      );
    }

    for (const productModule of modules ?? []) {
      activeModuleCounts.set(
        productModule.organization_product_id,
        (activeModuleCounts.get(productModule.organization_product_id) ?? 0) + 1
      );
    }
  }

  const availableApplications = deployments.flatMap((deployment) => {
    const entryPoint = APPLICATION_ENTRY_POINTS[deployment.product.code];
    if (!entryPoint || !permissions.has(entryPoint.permission)) {
      return [];
    }

    return [{ ...deployment, href: entryPoint.href }];
  });
  const canAccessControlPlane = await getPlatformControlPlaneAccess();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
            SAKATA OS
          </p>
          <div className="mt-5 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
      <OrganizationSwitcher />

                      My Applications
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
                Open the applications available to your organization.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <ThemeToggle />
              {canAccessControlPlane && (
                <Link
                  href="/control"
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Control Plane
                </Link>
              )}
              <Link
                href="/preferences"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Preferences
              </Link>
              <div className="rounded-2xl border border-sky-500/20 bg-slate-900 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Active Organization
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-100">
                  {organization.name}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {organization.organization_type}
                </p>
              </div>
            </div>
          </div>
        </header>

        {availableApplications.length > 0 ? (
          <section aria-label="Available applications">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Deployed for your organization
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Available applications
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {availableApplications.map((application) => (
                <article
                  key={application.id}
                  className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-500/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-sky-300">
                        {application.product.code}
                      </p>
                      <h3 className="mt-3 text-2xl font-semibold text-white">
                        {application.product.name}
                      </h3>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      Available
                    </span>
                  </div>

                  {application.product.description && (
                    <p className="mt-4 flex-1 text-sm leading-6 text-slate-400">
                      {application.product.description}
                    </p>
                  )}

                  <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                    <p className="text-sm text-slate-400">
                      {activeModuleCounts.get(application.id) ?? 0} active
                      capabilities
                    </p>
                    <Link
                      href={application.href}
                      className="inline-flex items-center rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/50"
                    >
                      Open
                      <span className="ml-2" aria-hidden="true">
                        -&gt;
                      </span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              No applications available
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Your organization has no accessible applications yet
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Applications appear here when they are actively deployed to your
              organization and have an available customer application surface.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
