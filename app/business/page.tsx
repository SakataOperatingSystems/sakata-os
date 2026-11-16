import Link from "next/link";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

export default async function BusinessDashboard() {
  await requirePermission("core.tasks.read");

  const { organization } = await getOrganizationContext();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const activeStatuses = ["open", "in_progress"];

  const [activeTasks, overdueTasks, urgentTasks, completedTasks] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .in("status", activeStatuses),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .in("status", activeStatuses)
        .lt("due_at", now),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .in("status", activeStatuses)
        .eq("priority", "urgent"),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .eq("status", "completed"),
    ]);

  for (const [label, result] of [
    ["active tasks", activeTasks],
    ["overdue tasks", overdueTasks],
    ["urgent tasks", urgentTasks],
    ["completed tasks", completedTasks],
  ] as const) {
    if (result.error) {
      throw new Error(
        `Failed to load ${label} for ${organization.name}: ${result.error.message}`,
      );
    }
  }

  const metrics = [
    {
      label: "Active work",
      value: activeTasks.count ?? 0,
      detail: "Open or in progress",
      accent: "text-violet-200",
    },
    {
      label: "Overdue",
      value: overdueTasks.count ?? 0,
      detail: "Active work past its deadline",
      accent: "text-amber-300",
    },
    {
      label: "Urgent",
      value: urgentTasks.count ?? 0,
      detail: "Active urgent-priority tasks",
      accent: "text-rose-300",
    },
    {
      label: "Completed",
      value: completedTasks.count ?? 0,
      detail: "Tasks completed to date",
      accent: "text-emerald-300",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <section className="overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
          Business OS · Organization workspace
        </p>
        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Run the work.
              <span className="block text-violet-200">
                Keep ownership clear.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              A shared operational view for {organization.name}, starting with
              assigned tasks, priorities, deadlines, and execution status.
            </p>
          </div>
          <Link
            href="/business/tasks"
            className="inline-flex items-center justify-center rounded-xl bg-violet-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200"
          >
            Open task register
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </section>

      <section
        aria-label="Operational task indicators"
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-400">{metric.label}</p>
            <p className={`mt-3 text-3xl font-bold ${metric.accent}`}>
              {metric.value}
            </p>
            <p className="mt-2 text-xs text-slate-500">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
            Available workflow
          </p>
          <h2 className="mt-3 text-xl font-semibold">Operational tasks</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Create accountable work, assign it to an active organization
            member, set priority and a deadline, then track its allowed
            progress through completion.
          </p>
          <Link
            href="/business/tasks"
            className="mt-5 inline-flex text-sm font-semibold text-violet-200 hover:text-white"
          >
            Manage tasks <span className="ml-2" aria-hidden="true">→</span>
          </Link>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Product scope
          </p>
          <h2 className="mt-3 text-xl font-semibold">
            A growing operating system
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This MVP demonstrates the shared task workflow. Other Business OS
            capabilities remain defined in the product catalogue and are not
            presented here as completed modules.
          </p>
          <Link
            href="/applications"
            className="mt-5 inline-flex text-sm font-semibold text-slate-300 hover:text-white"
          >
            Back to applications <span className="ml-2" aria-hidden="true">→</span>
          </Link>
        </article>
      </section>
    </div>
  );
}
