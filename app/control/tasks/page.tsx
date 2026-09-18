import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import TaskForm from "./form";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_to_user_id: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export default async function TasksPage() {
  await requirePermission("core.tasks.read");

  const context = await getOrganizationContext();
  const supabase = await createClient();

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select(
      "id, title, description, status, priority, assigned_to_user_id, due_at, completed_at, created_at, updated_at"
    )
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false });

  if (tasksError) {
    throw new Error(`Failed to load tasks: ${tasksError.message}`);
  }

  const taskRows = (tasks ?? []) as Task[];

  const counts = {
    total: taskRows.length,
    open: taskRows.filter((task) => task.status === "open").length,
    inProgress: taskRows.filter((task) => task.status === "in_progress")
      .length,
    completed: taskRows.filter((task) => task.status === "completed").length,
    cancelled: taskRows.filter((task) => task.status === "cancelled").length,
  };

  const statusLabels: Record<Task["status"], string> = {
    open: "Open",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const priorityLabels: Record<Task["priority"], string> = {
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent",
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            SAKATA Operating Systems
          </p>

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Tasks
              </h1>

              <p className="mt-3 max-w-3xl text-slate-400">
                Reusable operational work management for{" "}
                <span className="font-medium text-slate-200">
                  {context.organization.name}
                </span>
                .
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Core Platform
              </p>

              <p className="mt-1 font-semibold text-slate-200">
                Task Engine
              </p>

              <p className="text-xs text-slate-500">
                Tenant-scoped operational work
              </p>
            </div>
          </div>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Tasks</p>
            <p className="mt-2 text-3xl font-bold">{counts.total}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Open</p>
            <p className="mt-2 text-3xl font-bold">{counts.open}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">In Progress</p>
            <p className="mt-2 text-3xl font-bold">{counts.inProgress}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Completed</p>
            <p className="mt-2 text-3xl font-bold">{counts.completed}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Cancelled</p>
            <p className="mt-2 text-3xl font-bold">{counts.cancelled}</p>
          </div>
        </section>

        <section className="mb-8">
          <TaskForm />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-6 py-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-semibold">
                  Operational Task Register
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Tasks currently recorded for this organization.
                </p>
              </div>

              <span className="inline-flex w-fit rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                {counts.total}{" "}
                {counts.total === 1 ? "task" : "tasks"}
              </span>
            </div>
          </div>

          {taskRows.length > 0 ? (
            <div className="divide-y divide-slate-800">
              {taskRows.map((task) => (
                <article key={task.id} className="px-6 py-6">
                  <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-100">
                          {task.title}
                        </h3>

                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                          {statusLabels[task.status]}
                        </span>

                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                          {priorityLabels[task.priority]}
                        </span>
                      </div>

                      {task.description && (
                        <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm text-slate-400">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <span className="uppercase tracking-wider">
                            Assignee
                          </span>

                          <p className="mt-1 font-mono text-slate-400">
                            {task.assigned_to_user_id ?? "Unassigned"}
                          </p>
                        </div>

                        <div>
                          <span className="uppercase tracking-wider">
                            Due
                          </span>

                          <p className="mt-1 text-slate-400">
                            {task.due_at
                              ? new Date(task.due_at).toLocaleString()
                              : "No deadline"}
                          </p>
                        </div>

                        <div>
                          <span className="uppercase tracking-wider">
                            Created
                          </span>

                          <p className="mt-1 text-slate-400">
                            {new Date(task.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <span className="uppercase tracking-wider">
                            Completed
                          </span>

                          <p className="mt-1 text-slate-400">
                            {task.completed_at
                              ? new Date(task.completed_at).toLocaleString()
                              : "Not completed"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <details className="w-full shrink-0 xl:w-[420px]">
                      <summary className="cursor-pointer text-sm font-semibold text-emerald-400 hover:text-emerald-300">
                        Edit task
                      </summary>

                      <div className="mt-4">
                        <TaskForm task={task} />
                      </div>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="font-semibold text-slate-200">
                No tasks have been created yet.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Use the form above to create the first operational task.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
