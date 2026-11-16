import Link from "next/link";
import {
  hasPermission,
  requirePermission,
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

type Deployment = {
  id: string;
  product: Product;
  moduleCount: number;
};

export default async function ControlPlanePage() {
  await requirePermission("organization.read");

  const context = await getOrganizationContext();
  const supabase = await createClient();

  const canReadWorkflows = await hasPermission(
    "core.workflows.read"
  );

  const canReadTasks = await hasPermission(
    "core.tasks.read"
  );

  const canReadAutomation = await hasPermission(
    "core.automation.read"
  );

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

            <a
              href="/control"
              className="block rounded-xl bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white"
            >
              Control Plane
            </a>

            <a
              href="/control/catalog"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Product Catalogue
            </a>

            <span
              title="Control Plane surface not implemented yet"
              className="block cursor-default rounded-xl px-3 py-2.5 text-sm text-slate-600"
            >
              Product Families
            </span>

            <a
              href="/control/verification/modules"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Modules
            </a>
            <a
              href="/preferences"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Preferences
            </a>

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
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >Organizations</Link>

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

            <a
              href="/control/configuration"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Configuration
            </a>

            <a
              href="/control/workflows"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Workflows
            </a>

            <a
              href="/control/automation"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Automations
            </a>

            <a
              href="/control/tasks"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Tasks
            </a>

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

            <a
              href="/control/verification/notifications"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Audit &amp; Evidence
            </a>

            <span
              title="Control Plane surface not implemented yet"
              className="block cursor-default rounded-xl px-3 py-2.5 text-sm text-slate-600"
            >
              System Health
            </span>

            <a
              href="/control/verification/modules"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Deployments
            </a>
          </div>

          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Applications
            </p>

            <Link
              href="/applications"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              My Applications
            </Link>

            <a
              href="/school"
              className="block rounded-xl bg-emerald-400/10 px-3 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/15"
            >
              School OS
            </a>
          </div>
        </div>
      </aside>

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
                Govern the platform, compose organization deployments from
                reusable capabilities, and access operational configuration
                and verification surfaces.
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


        <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

              {canReadWorkflows && (
                <Link
                  href="/control/workflows"
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  Configure Workflows
                </Link>
              )}

              {canReadTasks && (
                <Link
                  href="/control/tasks"
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  Open Task Engine
                </Link>
              )}

              {canReadAutomation && (
                <Link
                  href="/control/automation"
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
                >
                  Open Automation
                </Link>
              )}

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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              Open Configuration -&gt;
            </p>
          </Link>

          {canReadWorkflows && (
            <Link
              href="/control/workflows"
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600 hover:bg-slate-800"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Platform Capability
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Workflow Configuration
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Define reusable workflow definitions, states, and transitions
                that operating applications can execute under controlled
                runtime rules.
              </p>

              <p className="mt-4 text-sm font-semibold text-emerald-400">
                Open Workflow Configuration -&gt;
              </p>
            </Link>
          )}

          {canReadTasks && (
            <Link
              href="/control/tasks"
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600 hover:bg-slate-800"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Platform Capability
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Task Engine
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Manage reusable operational tasks, assignments, lifecycle
                states, completion controls, and task execution records.
              </p>

              <p className="mt-4 text-sm font-semibold text-emerald-400">
                Open Task Engine -&gt;
              </p>
            </Link>
          )}

          {canReadAutomation && (
            <Link
              href="/control/automation"
              className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-6 transition hover:border-cyan-500/40 hover:bg-slate-800"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
                Platform Capability
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Automation Control Center
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Govern event-driven rules, automation jobs, execution state,
                and controlled operational actions across the organization.
              </p>

              <p className="mt-4 text-sm font-semibold text-cyan-400">
                Open Automation -&gt;
              </p>
            </Link>
          )}

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
              Open School OS -&gt;
            </p>
          </Link>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
              Verification &amp; Audit
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              Operational evidence
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Governed verification surfaces for checking deployed capabilities,
              end-to-end operating chains, automation, accountability, and audit evidence.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Platform Governance
              </p>

              <h3 className="mt-2 text-xl font-bold text-slate-100">
                Module Completion Audit
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Review every deployed module against the SAKATA OS completion doctrine
                rather than treating a screen or database table as proof of completion.
              </p>

              <Link
                href="/control/verification/modules"
                className="mt-5 inline-flex items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              >
                Open Module Completion Audit
              </Link>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Platform Governance
              </p>

              <h3 className="mt-2 text-xl font-bold text-slate-100">
                Automation Pipeline Verification
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Verify the authenticated Event → Rule → Job → Executor → Notification
                chain and inspect the evidence produced by the automation pipeline.
              </p>

              <Link
                href="/control/verification/automation"
                className="mt-5 inline-flex items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              >
                Open Automation Verification
              </Link>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                School OS Evidence
              </p>

              <h3 className="mt-2 text-xl font-bold text-slate-100">
                Admission → Student Verification
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Inspect the verified admission-to-student chain, including identity,
                relationships, platform events, automation, workflow accountability,
                and atomic behavior.
              </p>

              <Link
                href="/control/verification/admission-student"
                className="mt-5 inline-flex items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                Open Admission → Student Verification
              </Link>
            </article>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-800 pt-6 text-sm text-slate-500">
          SAKATA Operating Systems - Control Plane
        </footer>
      </div>
    </main>
  );
}
