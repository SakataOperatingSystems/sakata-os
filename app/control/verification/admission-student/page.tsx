import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

type StudentRow = {
  id: string;
  student_id: string;
  full_name: string;
  admission_request_id: string | null;
  admission_date: string | null;
  created_at: string;
};

type AdmissionRow = {
  id: string;
  admission_request_id: string;
  applicant_name: string;
  status: string;
  requested_admission_date: string | null;
  created_at: string;
};

type PlatformEventRow = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  occurred_at: string;
  created_at: string;
};

type AutomationJobRow = {
  id: string;
  platform_event_id: string;
  automation_rule_id: string;
  status: string;
  attempt_count: number;
  created_at: string;
};

type AutomationRuleRow = {
  id: string;
  name: string;
  event_type: string;
  entity_type: string | null;
  action_type: string;
};

type WorkflowTaskLinkRow = {
  id: string;
  workflow_instance_id: string;
  task_id: string;
};

type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
};

type WorkflowInstanceRow = {
  id: string;
  workflow_definition_id: string;
  current_state_id: string;
  status: string;
};

type WorkflowStateRow = {
  id: string;
  name: string;
  code: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function CheckCard({
  label,
  passed,
  detail,
}: {
  label: string;
  passed: boolean;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">{label}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            passed
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {passed ? "PASS" : "MISSING"}
        </span>
      </div>
    </div>
  );
}

export default async function AdmissionStudentVerificationPage() {
  await requirePermission("organization.read");

  const context = await getOrganizationContext();
  const supabase = await createClient();

  const { data: studentRow, error: studentError } = await supabase
    .from("students")
    .select(
      "id, student_id, full_name, admission_request_id, admission_date, created_at"
    )
    .eq("organization_id", context.organization.id)
    .not("admission_request_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (studentError) {
    throw new Error(
      `Failed to load converted student: ${studentError.message}`
    );
  }

  if (!studentRow) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              SAKATA Operating Systems
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Admission → Student Verification
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Read-only verification of the Admission → Student operating
              chain.
            </p>
          </header>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <p className="font-semibold text-slate-200">
              No converted student found.
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              The organization currently has no student with an admission
              relationship to verify.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const student = studentRow as StudentRow;

  const [
    admissionResult,
    studentEventsResult,
    admissionEventsResult,
  ] = await Promise.all([
    supabase
      .from("student_admission_requests")
      .select(
        "id, admission_request_id, applicant_name, status, requested_admission_date, created_at"
      )
      .eq("organization_id", context.organization.id)
      .eq("id", student.admission_request_id!)
      .maybeSingle(),

    supabase
      .from("platform_events")
      .select(
        "id, event_type, entity_type, entity_id, occurred_at, created_at"
      )
      .eq("organization_id", context.organization.id)
      .eq("entity_id", student.id)
      .order("occurred_at", { ascending: false }),

    supabase
      .from("platform_events")
      .select(
        "id, event_type, entity_type, entity_id, occurred_at, created_at"
      )
      .eq("organization_id", context.organization.id)
      .eq("entity_id", student.admission_request_id!)
      .order("occurred_at", { ascending: false }),
  ]);

  if (admissionResult.error) {
    throw new Error(
      `Failed to load admission relationship: ${admissionResult.error.message}`
    );
  }

  if (studentEventsResult.error) {
    throw new Error(
      `Failed to load student events: ${studentEventsResult.error.message}`
    );
  }

  if (admissionEventsResult.error) {
    throw new Error(
      `Failed to load admission events: ${admissionEventsResult.error.message}`
    );
  }

  const admission = admissionResult.data as AdmissionRow | null;
  const studentEvents =
    (studentEventsResult.data ?? []) as PlatformEventRow[];
  const admissionEvents =
    (admissionEventsResult.data ?? []) as PlatformEventRow[];

  const relevantEventIds = [
    ...studentEvents,
    ...admissionEvents,
  ].map((event) => event.id);

  let automationJobs: AutomationJobRow[] = [];
  let automationRules: AutomationRuleRow[] = [];

  if (relevantEventIds.length > 0) {
    const { data: jobRows, error: jobsError } = await supabase
      .from("automation_jobs")
      .select(
        "id, platform_event_id, automation_rule_id, status, attempt_count, created_at"
      )
      .eq("organization_id", context.organization.id)
      .in("platform_event_id", relevantEventIds)
      .order("created_at", { ascending: false });

    if (jobsError) {
      throw new Error(
        `Failed to load automation jobs: ${jobsError.message}`
      );
    }

    automationJobs = (jobRows ?? []) as AutomationJobRow[];

    const ruleIds = [
      ...new Set(
        automationJobs.map((job) => job.automation_rule_id)
      ),
    ];

    if (ruleIds.length > 0) {
      const { data: ruleRows, error: rulesError } = await supabase
        .from("automation_rules")
        .select("id, name, event_type, entity_type, action_type")
        .eq("organization_id", context.organization.id)
        .in("id", ruleIds);

      if (rulesError) {
        throw new Error(
          `Failed to load automation rules: ${rulesError.message}`
        );
      }

      automationRules = (ruleRows ?? []) as AutomationRuleRow[];
    }
  }

  const { data: linkRows, error: linksError } = await supabase
    .from("workflow_task_links")
    .select("id, workflow_instance_id, task_id")
    .eq("organization_id", context.organization.id)
    .order("id", { ascending: false });

  if (linksError) {
    throw new Error(
      `Failed to load workflow task links: ${linksError.message}`
    );
  }

  const workflowTaskLinks =
    (linkRows ?? []) as WorkflowTaskLinkRow[];

  const linkedTaskIds = [
    ...new Set(workflowTaskLinks.map((link) => link.task_id)),
  ];

  let tasks: TaskRow[] = [];

  if (linkedTaskIds.length > 0) {
    const { data: taskRows, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title, status, priority")
      .eq("organization_id", context.organization.id)
      .in("id", linkedTaskIds);

    if (tasksError) {
      throw new Error(
        `Failed to load linked tasks: ${tasksError.message}`
      );
    }

    tasks = (taskRows ?? []) as TaskRow[];
  }

  const workflowInstanceIds = [
    ...new Set(
      workflowTaskLinks.map((link) => link.workflow_instance_id)
    ),
  ];

  let workflowInstances: WorkflowInstanceRow[] = [];

  if (workflowInstanceIds.length > 0) {
    const { data: instanceRows, error: instancesError } =
      await supabase
        .from("workflow_instances")
        .select(
          "id, workflow_definition_id, current_state_id, status"
        )
        .eq("organization_id", context.organization.id)
        .in("id", workflowInstanceIds);

    if (instancesError) {
      throw new Error(
        `Failed to load workflow instances: ${instancesError.message}`
      );
    }

    workflowInstances =
      (instanceRows ?? []) as WorkflowInstanceRow[];
  }

  const stateIds = [
    ...new Set(
      workflowInstances.map((instance) => instance.current_state_id)
    ),
  ];

  let workflowStates: WorkflowStateRow[] = [];

  if (stateIds.length > 0) {
    const { data: stateRows, error: statesError } = await supabase
      .from("workflow_states")
      .select("id, name, code")
      .eq("organization_id", context.organization.id)
      .in("id", stateIds);

    if (statesError) {
      throw new Error(
        `Failed to load workflow states: ${statesError.message}`
      );
    }

    workflowStates = (stateRows ?? []) as WorkflowStateRow[];
  }

  const studentCreatedEvent = studentEvents.find(
    (event) =>
      event.event_type === "student.created" &&
      event.entity_type === "student"
  );

  const admissionConvertedEvent = admissionEvents.find(
    (event) =>
      event.event_type === "admission.converted"
  );

  const studentAutomationJobs = studentCreatedEvent
    ? automationJobs.filter(
        (job) => job.platform_event_id === studentCreatedEvent.id
      )
    : [];

  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const stateMap = new Map(
    workflowStates.map((state) => [state.id, state])
  );

  const accountabilityLinks = workflowTaskLinks.filter((link) => {
    const task = taskMap.get(link.task_id);

    if (!task) {
      return false;
    }

    return (
      task.title.toLowerCase().includes("admission") ||
      task.title.toLowerCase().includes("review")
    );
  });

  const hasWorkflowAccountability =
    accountabilityLinks.length > 0;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            SAKATA Operating Systems
          </p>

          <div className="mt-2 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Admission → Student Verification
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Read-only verification of relationship, event, automation,
                workflow, and accountable task propagation.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Organization
              </p>

              <p className="mt-2 font-semibold text-slate-100">
                {context.organization.name}
              </p>
            </div>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Verified Student
          </p>

          <div className="mt-4 grid gap-5 md:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Student ID</p>
              <p className="mt-1 font-mono text-sm text-slate-200">
                {student.student_id}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Student</p>
              <p className="mt-1 font-semibold text-slate-100">
                {student.full_name}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Admission</p>
              <p className="mt-1 font-mono text-sm text-slate-200">
                {admission?.admission_request_id ?? "Not recorded"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Admission Date</p>
              <p className="mt-1 text-sm text-slate-300">
                {student.admission_date ?? "Not recorded"}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CheckCard
            label="Admission relationship"
            passed={Boolean(admission)}
            detail={
              admission
                ? `Linked to ${admission.admission_request_id}.`
                : "No matching admission record was found."
            }
          />

          <CheckCard
            label="Student-created event"
            passed={Boolean(studentCreatedEvent)}
            detail={
              studentCreatedEvent
                ? "student.created exists for this student."
                : "No student.created event was found."
            }
          />

          <CheckCard
            label="Admission-converted event"
            passed={Boolean(admissionConvertedEvent)}
            detail={
              admissionConvertedEvent
                ? "admission.converted exists for the linked admission."
                : "No admission.converted event was found."
            }
          />

          <CheckCard
            label="Automation job"
            passed={studentAutomationJobs.length > 0}
            detail={
              studentAutomationJobs.length > 0
                ? `${studentAutomationJobs.length} automation job(s) exist for the student-created event.`
                : "No automation job is linked to the student-created event."
            }
          />

          <CheckCard
            label="Workflow accountability"
            passed={hasWorkflowAccountability}
            detail={
              hasWorkflowAccountability
                ? `${accountabilityLinks.length} admission-related workflow task link(s) found.`
                : "No admission-related workflow task link was found."
            }
          />

          <CheckCard
            label="Atomic identity"
            passed={student.student_id.startsWith("STU-")}
            detail={
              student.student_id.startsWith("STU-")
                ? "Student identity is system-managed."
                : "Student identity does not match the system-managed format."
            }
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  Events
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Platform Event Trail
                </h2>
              </div>

              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                {studentEvents.length + admissionEvents.length}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {[...studentEvents, ...admissionEvents]
                .sort(
                  (a, b) =>
                    new Date(b.occurred_at).getTime() -
                    new Date(a.occurred_at).getTime()
                )
                .map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                  >
                    <p className="font-medium text-slate-200">
                      {event.event_type}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {event.entity_type} · {formatDate(event.occurred_at)}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Automation
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Automation Jobs
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {automationJobs.length > 0 ? (
                automationJobs.map((job) => {
                  const rule = automationRules.find(
                    (candidate) => candidate.id === job.automation_rule_id
                  );

                  return (
                    <div
                      key={job.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-200">
                          {rule?.name ?? "Automation rule"}
                        </p>

                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400">
                          {job.status}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {rule?.action_type ?? "Action not recorded"} ·
                        attempts {job.attempt_count}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">
                  No automation jobs found.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Workflow Accountability
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Linked Operational Tasks
              </h2>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {accountabilityLinks.length > 0 ? (
                accountabilityLinks.map((link) => {
                  const task = taskMap.get(link.task_id);
                  const instance = workflowInstances.find(
                    (candidate) =>
                      candidate.id === link.workflow_instance_id
                  );
                  const state = instance
                    ? stateMap.get(instance.current_state_id)
                    : null;

                  return (
                    <div
                      key={link.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-100">
                            {task?.title ?? "Linked workflow task"}
                          </p>

                          <p className="mt-2 text-sm text-slate-400">
                            {task?.priority ?? "Priority not recorded"}{" "}
                            · {task?.status ?? "Status not recorded"}
                          </p>
                        </div>

                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                          Linked
                        </span>
                      </div>

                      <div className="mt-4 border-t border-slate-800 pt-4">
                        <p className="text-xs text-slate-500">
                          Workflow state
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-200">
                          {state?.name ?? "State not resolved"}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">
                  No admission-related workflow task linkage found.
                </p>
              )}
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-800 pt-6 text-sm text-slate-500">
          SAKATA Operating Systems · Read-only verification surface
        </footer>
      </div>
    </main>
  );
}
