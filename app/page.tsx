export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <p className="text-sm font-medium tracking-widest text-slate-400">
              SAKATA OPERATING SYSTEMS
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Control Center
            </h1>
          </div>

          <div className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">
            Platform
          </div>
        </header>

        <section className="mt-12">
          <p className="text-sm uppercase tracking-widest text-slate-500">
            System Status
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            SAKATA OS is alive.
          </h2>

          <p className="mt-4 max-w-2xl text-lg text-slate-400">
            The foundation of the SAKATA Operating System is now running.
            This control center will become the command layer for organizations,
            operations, workflows, intelligence and decision-making.
          </p>
        </section>

        <section className="mt-12 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Platform</p>
            <h3 className="mt-2 text-xl font-semibold">SAKATA OS</h3>
            <p className="mt-2 text-sm text-slate-500">
              Core operating platform
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Architecture</p>
            <h3 className="mt-2 text-xl font-semibold">Multi-Tenant</h3>
            <p className="mt-2 text-sm text-slate-500">
              One platform, isolated organizations
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">First Product</p>
            <h3 className="mt-2 text-xl font-semibold">School OS</h3>
            <p className="mt-2 text-sm text-slate-500">
              School operations control system
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}