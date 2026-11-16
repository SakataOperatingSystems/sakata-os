import {
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import TaskForm from "./form";
import { getTaskExceptions, type TaskException } from "./validation";

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

type OrganizationMember = {
  user_profile_id: string;
  display_name: string;
};

type WorkflowTaskLink = {
  task_id: string;
  workflow_instance_id: string;
  workflow_instance_transition_id: string;
  workflow_transition_action_id: string;
  action_code: string;
  action_name: string;
  admissionReference: string | null;
  applicantName: string | null;
};

type WorkflowInstanceSubject = {
  id: string;
  subject_type: string;
  subject_id: string | null;
};

type AdmissionContext = {
  id: string;
  admission_request_id: string;
  applicant_name: string;
};

type TaskWithWorkflow = Task & {
  workflowLink: WorkflowTaskLink | null;
};

type TasksPageOptions = {
  workspaceName?: string;
  includeSchoolWorkflowContext?: boolean;
};

export default async function TasksPage({
  workspaceName = "Task Engine",
  includeSchoolWorkflowContext = true,
}: TasksPageOptions = {}) {
  await requirePermission("core.tasks.read");
  const canManageTasks = await hasPermission("core.tasks.manage");

  const context = await getOrganizationContext();
  const supabase = await createClient();

  const { data: memberRows, error: membersError } = await supabase
    .from("organization_memberships")
    .select("user_profile_id, user_profiles!inner(id, display_name)")
    .eq("organization_id", context.organization.id)
    .eq("status", "active")
    .eq("user_profiles.status", "active")
    .order("user_profiles(display_name)", { ascending: true });

  if (membersError) {
    throw new Error(
      `Failed to load organization members: ${membersError.message}`
    );
  }

  const members: OrganizationMember[] = (memberRows ?? [])
    .map((member) => {
      const profile = Array.isArray(member.user_profiles)
        ? member.user_profiles[0]
        : member.user_profiles;

      return {
        user_profile_id: member.user_profile_id,
        display_name: profile?.display_name ?? "",
      };
    })
    .filter((member) => member.display_name.length > 0);

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

  const taskIds = taskRows.map((task) => task.id);

  let workflowLinks: WorkflowTaskLink[] = [];

  if (includeSchoolWorkflowContext && taskIds.length > 0) {
    const { data: links, error: linksError } = await supabase
      .from("workflow_task_links")
      .select(
        "task_id, workflow_instance_id, workflow_instance_transition_id, workflow_transition_action_id, workflow_transition_actions(code, name)"
      )
      .eq("organization_id", context.organization.id)
      .in("task_id", taskIds);

    if (linksError) {
      throw new Error(
        `Failed to load workflow task links: ${linksError.message}`
      );
    }

    const rawWorkflowLinks = (links ?? []).map((link) => {
      const action = Array.isArray(link.workflow_transition_actions)
        ? link.workflow_transition_actions[0]
        : link.workflow_transition_actions;

      return {
        task_id: link.task_id,
        workflow_instance_id: link.workflow_instance_id,
        workflow_instance_transition_id:
          link.workflow_instance_transition_id,
        workflow_transition_action_id:
          link.workflow_transition_action_id,
        action_code: action?.code ?? "",
        action_name: action?.name ?? "",
      };
    });

    const workflowInstanceIds = [
      ...new Set(
        rawWorkflowLinks.map((link) => link.workflow_instance_id)
      ),
    ];

    let workflowInstances: WorkflowInstanceSubject[] = [];

    if (workflowInstanceIds.length > 0) {
      const { data: instances, error: instancesError } = await supabase
        .from("workflow_instances")
        .select("id, subject_type, subject_id")
        .eq("organization_id", context.organization.id)
        .in("id", workflowInstanceIds);

      if (instancesError) {
        throw new Error(
          `Failed to load workflow subjects: ${instancesError.message}`
        );
      }

      workflowInstances = (instances ?? []) as WorkflowInstanceSubject[];
    }

    const admissionSubjectIds = [
      ...new Set(
        workflowInstances
          .filter(
            (instance) =>
              instance.subject_type === "student_admission_request" &&
              instance.subject_id
          )
          .map((instance) => instance.subject_id as string)
      ),
    ];

    let admissions: AdmissionContext[] = [];

    if (admissionSubjectIds.length > 0) {
      const { data: admissionRows, error: admissionsError } = await supabase
        .from("student_admission_requests")
        .select("id, admission_request_id, applicant_name")
        .eq("organization_id", context.organization.id)
        .in("id", admissionSubjectIds);

      if (admissionsError) {
        throw new Error(
          `Failed to load admission context: ${admissionsError.message}`
        );
      }

      admissions = (admissionRows ?? []) as AdmissionContext[];
    }

    const workflowInstanceById = new Map(
      workflowInstances.map((instance) => [instance.id, instance])
    );

    const admissionById = new Map(
      admissions.map((admission) => [admission.id, admission])
    );

    workflowLinks = rawWorkflowLinks.map((link) => {
      const workflowInstance = workflowInstanceById.get(
        link.workflow_instance_id
      );

      const admission =
        workflowInstance?.subject_type === "student_admission_request" &&
        workflowInstance.subject_id
          ? admissionById.get(workflowInstance.subject_id)
          : undefined;

      return {
        ...link,
        admissionReference: admission?.admission_request_id ?? null,
        applicantName: admission?.applicant_name ?? null,
      };
    });
  }

  const workflowLinkByTaskId = new Map(
    workflowLinks.map((link) => [link.task_id, link])
  );

  const tasksWithWorkflow: TaskWithWorkflow[] = taskRows.map((task) => ({
    ...task,
    workflowLink: workflowLinkByTaskId.get(task.id) ?? null,
  }));

  const memberById = new Map(
    members.map((member) => [member.user_profile_id, member.display_name])
  );

  const counts = {
    total: taskRows.length,
    open: taskRows.filter((task) => task.status === "open").length,
    inProgress: taskRows.filter((task) => task.status === "in_progress")
      .length,
    completed: taskRows.filter((task) => task.status === "completed").length,
    cancelled: taskRows.filter((task) => task.status === "cancelled").length,
  };

  const taskExceptionLabels: Record<TaskException, string> = {
  unassigned: "Unassigned",
  overdue: "Overdue",
  no_deadline: "No deadline",
};
const statusLabels: Record<Task["status"], string> = {
    open: "Open",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

function getTaskNextAction(status: Task["status"]): string {
  switch (status) {
    case "open":
      return "Start work";
    case "in_progress":
      return "Complete or cancel";
    case "completed":
      return "Closed";
    case "cancelled":
      return "Closed";
  }
}
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
          SAKATA Operating Systems · {workspaceName}
          </p>

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Operational tasks
              </h1>

              <p className="mt-3 max-w-3xl text-slate-400">
                Organization-scoped task execution for{" "}
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
                {workspaceName}
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

        {canManageTasks ? (
          <section className="mb-8">
            <TaskForm members={members} />
          </section>
        ) : (
          <p className="mb-8 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 text-sm text-slate-400">
            You have read access to this task register. Task creation and
            updates require the task management permission.
          </p>
        )}

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
                {counts.total} {counts.total === 1 ? "task" : "tasks"}
              </span>
            </div>
          </div>

          {tasksWithWorkflow.length > 0 ? (
            <div className="divide-y divide-slate-800">
              {tasksWithWorkflow.map((task) => (
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

                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                          Next: {getTaskNextAction(task.status)}
                        </span>

                        {getTaskExceptions(
                          task.status,
                          task.assigned_to_user_id,
                          task.due_at
                        ).map((exception) => (
                          <span
                            key={exception}
                            className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300"
                          >
                            Exception: {taskExceptionLabels[exception]}
                          </span>
                        ))}
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                          {priorityLabels[task.priority]}
                        </span>
                      </div>

                      {task.description && (
                        <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm text-slate-400">
                          {task.description}
                        </p>
                      )}

                      {task.workflowLink && (
                        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Workflow Context
                            </span>

                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                              {task.workflowLink.action_name ||
                                task.workflowLink.action_code}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-300">
                            This task was created by a workflow transition
                            action.
                          </p>

                          {task.workflowLink.admissionReference ||
                          task.workflowLink.applicantName ? (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              {task.workflowLink.admissionReference && (
                                <div>
                                  <span className="text-xs uppercase tracking-wider text-slate-500">
                                    Admission
                                  </span>

                                  <p className="mt-1 font-semibold text-slate-200">
                                    {task.workflowLink.admissionReference}
                                  </p>
                                </div>
                              )}

                              {task.workflowLink.applicantName && (
                                <div>
                                  <span className="text-xs uppercase tracking-wider text-slate-500">
                                    Applicant
                                  </span>

                                  <p className="mt-1 font-semibold text-slate-200">
                                    {task.workflowLink.applicantName}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-slate-500">
                              The workflow subject is not a school admission
                              record.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <span className="uppercase tracking-wider">
                            Assignee
                          </span>

                          <p className="mt-1 font-medium text-slate-400">
                            {task.assigned_to_user_id
                              ? memberById.get(task.assigned_to_user_id) ??
                                "Unresolved assignee"
                              : "Unassigned"}
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

                    {canManageTasks && (
                      <details className="w-full shrink-0 xl:w-[420px]">
                        <summary className="cursor-pointer text-sm font-semibold text-emerald-400 hover:text-emerald-300">
                          Edit task
                        </summary>

                        <div className="mt-4">
                          <TaskForm task={task} members={members} />
                        </div>
                      </details>
                    )}
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
