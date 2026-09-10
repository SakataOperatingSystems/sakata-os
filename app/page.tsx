import { requirePermission } from "@/app/lib/auth/authorization";

export default async function Home() {
  await requirePermission("organization.read");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <header className="mb-12">
          <p className="text-sm font-medium tracking-[0.25em] text-sky-300">
            SAKATA OPERATING SYSTEMS
          </p>

          <h1 className="mt-4 text-5xl font-bold tracking-tight">
            Control Center
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-slate-400">
            Central operating platform for organizations, products,
            permissions, workflows, and operational control.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Platform</p>

            <h2 className="mt-2 text-2xl font-semibold">
              SAKATA OS Core
            </h2>

            <p className="mt-3 text-slate-500">
              Core platform for identity, access control, organization
              management, audit, configuration, and shared system services.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Architecture</p>

            <h2 className="mt-2 text-2xl font-semibold">
              Multi-Tenant
            </h2>

            <p className="mt-3 text-slate-500">
              One platform serving isolated organizations through controlled
              tenant data, roles, permissions, and configuration.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">First Product</p>

            <h2 className="mt-2 text-2xl font-semibold">
              School OS
            </h2>

            <p className="mt-3 text-slate-500">
              School operations control system built on the SAKATA OS core
              platform.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Security</p>

            <h2 className="mt-2 text-2xl font-semibold">
              Permission Controlled
            </h2>

            <p className="mt-3 text-slate-500">
              Access to protected application areas is determined by the
              authenticated user&apos;s organization permissions.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}