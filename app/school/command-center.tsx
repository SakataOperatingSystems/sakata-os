import Link from "next/link";
import { getCurrentPermissions } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import {
  ADMISSION_OPERATOR_EXCEPTION_LABELS,
  getAdmissionOperatorState,
  type AdmissionOperatorException,
} from "./admissions/validation";
import { getTaskExceptions, type TaskException } from "@/app/control/tasks/validation";
import {
  formatDateTimeInTimeZone,
  formatOrganizationCurrency,
  getDateKeyInTimeZone,
} from "./command-center-formatting";

type FeeAccountItem = {
  id: string;
  student_id: string;
  balance_amount: number | string;
  due_date: string | null;
  status: string;
};

type StudentItem = {
  id: string;
  full_name: string;
  status: string;
};

type StudentException =
  | "inactive_student"
  | "no_active_enrollment";

const studentExceptionLabels: Record<StudentException, string> = {
  inactive_student: "Inactive student",
  no_active_enrollment: "No active enrollment",
};

type StudentNameItem = {
  id: string;
  full_name: string;
};

type AdmissionItem = {
  id: string;
  applicant_name: string;
  status: "open" | "approved";
  applicant_date_of_birth: string | null;
  requested_admission_date: string | null;
};

type TaskItem = {
  id: string;
  title: string;
  status: "open" | "in_progress";
  assigned_to_user_id: string | null;
  due_at: string | null;
};

type WorkflowInstanceItem = {
  subject_id: string;
  status: string;
  workflow_definition_id: string;
  current_state_id: string;
};

type WorkflowStateItem = {
  id: string;
  code: string;
  name: string;
};

type WorkflowTransitionItem = {
  id: string;
  workflow_definition_id: string;
  from_state_id: string;
  code: string;
  name: string;
};

const taskExceptionLabels: Record<TaskException, string> = {
  unassigned: "Unassigned",
  overdue: "Overdue",
  no_deadline: "No deadline",
};

const admissionExceptionLabels: Record<AdmissionOperatorException, string> =
  ADMISSION_OPERATOR_EXCEPTION_LABELS;

function formatDueDate(
  value: string | null,
  timeZone: string,
  locale: string,
) {
  if (!value) return "No deadline";
  return formatDateTimeInTimeZone(value, timeZone, locale);
}

export default async function SchoolCommandCenter() {
  const permissions = await getCurrentPermissions();
  const canReadAdmissions = permissions.has("school.admission_requests.read");
  const canReadTasks = permissions.has("core.tasks.read");
  const canReadFinance = permissions.has("school.fees.read");
  const canReadStudents = permissions.has("school.students.read");

  if (!canReadAdmissions && !canReadTasks && !canReadFinance && !canReadStudents) {
    return null;
  }

  const { organizationId } = await getOrganizationContext();
  const supabase = await createClient();

  let admissions: AdmissionItem[] = [];
  let tasks: TaskItem[] = [];
  let feeAccounts: FeeAccountItem[] = [];
  const students: StudentItem[] = [];
  const activeEnrollmentStudentIds = new Set<string>();
  let feeStudents: StudentNameItem[] = [];
  let workflowInstances: WorkflowInstanceItem[] = [];
  let workflowStates: WorkflowStateItem[] = [];
  let workflowTransitions: WorkflowTransitionItem[] = [];
  let workflowCheckCompleted = false;
  let openAdmissionCount = 0;
  let approvedAdmissionCount = 0;
  let activeTaskCount = 0;
  let feeAccountCount = 0;
  let timeZone = "Africa/Kampala";
  let currencyCode = "UGX";
  let locale = "en-UG";

  const { data: organizationSettings, error: settingsError } = await supabase
    .from("organization_settings")
    .select("timezone, currency_code, locale")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (settingsError) {
    throw new Error(
      `Failed to load organization formatting settings: ${settingsError.message}`,
    );
  }

  if (organizationSettings) {
    timeZone = organizationSettings.timezone;
    currencyCode = organizationSettings.currency_code;
    locale = organizationSettings.locale;
  }

  if (canReadAdmissions) {
    const [
      { data, error: admissionError },
      { count: openCount, error: openCountError },
      { count: approvedCount, error: approvedCountError },
    ] = await Promise.all([
      supabase
        .from("student_admission_requests")
        .select(
          "id, applicant_name, status, applicant_date_of_birth, requested_admission_date",
        )
        .eq("organization_id", organizationId)
        .eq("status", "open")
        .order("created_at", { ascending: true })
        .limit(20),
      supabase
        .from("student_admission_requests")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "open"),
      supabase
        .from("student_admission_requests")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "approved"),
    ]);

    if (admissionError) {
      throw new Error(
        `Failed to load admission queue: ${admissionError.message}`,
      );
    }
    if (openCountError) {
      throw new Error(
        `Failed to count open admissions: ${openCountError.message}`,
      );
    }
    if (approvedCountError) {
      throw new Error(
        `Failed to count approved admissions: ${approvedCountError.message}`,
      );
    }

    admissions = (data ?? []) as AdmissionItem[];
    openAdmissionCount = openCount ?? 0;
    approvedAdmissionCount = approvedCount ?? 0;

    const admissionIds = admissions.map((admission) => admission.id);

    if (admissionIds.length > 0) {
      const workflowResult = await supabase
        .from("workflow_instances")
        .select(
          "subject_id, status, workflow_definition_id, current_state_id"
        )
        .eq("organization_id", organizationId)
        .eq("subject_type", "student_admission_request")
        .eq("status", "active")
        .in("subject_id", admissionIds);

      if (workflowResult.error) {
        throw new Error(
          `Failed to load admission workflows: ${workflowResult.error.message}`,
        );
      }

      workflowInstances =
        (workflowResult.data ?? []) as WorkflowInstanceItem[];

      const stateIds = Array.from(
        new Set(
          workflowInstances
            .map((workflow) => workflow.current_state_id)
            .filter(Boolean),
        ),
      );

      const definitionIds = Array.from(
        new Set(
          workflowInstances
            .map((workflow) => workflow.workflow_definition_id)
            .filter(Boolean),
        ),
      );

      if (stateIds.length > 0) {
        const stateResult = await supabase
          .from("workflow_states")
          .select("id, code, name")
          .in("id", stateIds);

        if (stateResult.error) {
          throw new Error(
            `Failed to load admission workflow states: ${stateResult.error.message}`,
          );
        }
        workflowStates = (stateResult.data ?? []) as WorkflowStateItem[];
      }

      if (definitionIds.length > 0 && stateIds.length > 0) {
        const transitionResult = await supabase
          .from("workflow_transitions")
          .select(
            "id, workflow_definition_id, from_state_id, code, name",
          )
          .in("workflow_definition_id", definitionIds)
          .in("from_state_id", stateIds);

        if (transitionResult.error) {
          throw new Error(
            `Failed to load admission workflow transitions: ${transitionResult.error.message}`,
          );
        }
        workflowTransitions =
          (transitionResult.data ?? []) as WorkflowTransitionItem[];
      }

      workflowCheckCompleted = true;
    } else {
      workflowCheckCompleted = true;
    }
  }

  if (canReadTasks) {
    const { data, count, error } = await supabase
      .from("tasks")
      .select("id, title, status, assigned_to_user_id, due_at", {
        count: "exact",
      })
      .eq("organization_id", organizationId)
      .in("status", ["open", "in_progress"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(20);

    if (error) {
      throw new Error(`Failed to load active tasks: ${error.message}`);
    }
    tasks = (data ?? []) as TaskItem[];
    activeTaskCount = count ?? 0;
  }

  if (canReadFinance) {
    const { data: accountData, count, error: accountError } = await supabase
      .from("school_student_fee_accounts")
      .select("id, student_id, balance_amount, due_date, status", {
        count: "exact",
      })
      .eq("organization_id", organizationId)
      .gt("balance_amount", 0)
      .neq("status", "closed")
      .order("due_date", {
        ascending: true,
        nullsFirst: false,
      })
      .order("balance_amount", {
        ascending: false,
      })
      .limit(20);

    if (accountError) {
      throw new Error(
        `Failed to load outstanding fee accounts: ${accountError.message}`,
      );
    }

    feeAccounts = (accountData ?? []) as FeeAccountItem[];
    feeAccountCount = count ?? 0;

    const feeStudentIds = Array.from(
      new Set(feeAccounts.map((account) => account.student_id)),
    );
    if (feeStudentIds.length > 0) {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, full_name")
        .eq("organization_id", organizationId)
        .in("id", feeStudentIds);

      if (studentError) {
        throw new Error(
          `Failed to load names for outstanding fee accounts: ${studentError.message}`,
        );
      }
      feeStudents = (studentData ?? []) as StudentNameItem[];
    }
  }

  if (canReadStudents) {
    const pageSize = 500;
    let offset = 0;
    let expectedStudentCount = 0;
    do {
      const { data, count, error } = await supabase
        .from("students")
        .select("id, full_name, status", { count: "exact" })
        .eq("organization_id", organizationId)
        .order("id")
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(
          `Failed to load students for Command Center: ${error.message}`,
        );
      }
      const page = (data ?? []) as StudentItem[];
      students.push(...page);
      expectedStudentCount = count ?? students.length;
      offset += page.length;
      if (page.length === 0) break;
    } while (offset < expectedStudentCount);

    offset = 0;
    let expectedEnrollmentCount = 0;
    do {
      const { data, count, error } = await supabase
        .from("student_enrollments")
        .select("student_id", { count: "exact" })
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .order("id")
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(
          `Failed to load active student enrollments: ${error.message}`,
        );
      }
      const page = data ?? [];
      page.forEach((enrollment) => {
        if (enrollment.student_id) {
          activeEnrollmentStudentIds.add(enrollment.student_id);
        }
      });
      expectedEnrollmentCount = count ?? offset + page.length;
      offset += page.length;
      if (page.length === 0) break;
    } while (offset < expectedEnrollmentCount);
  }

  const workflowStateById = new Map(
    workflowStates.map((state) => [state.id, state])
  );

  const workflowTransitionsByState = new Map<string, WorkflowTransitionItem[]>();

  for (const transition of workflowTransitions) {
    const existing =
      workflowTransitionsByState.get(transition.from_state_id) ?? [];
    existing.push(transition);
    workflowTransitionsByState.set(transition.from_state_id, existing);
  }

  const workflowBySubject = new Map(
    workflowInstances.map((workflow) => [workflow.subject_id, workflow])
  );

  const admissionQueue = admissions
    .map((admission) => {
      const workflow = workflowBySubject.get(admission.id);
      const workflowState = workflow
        ? workflowStateById.get(workflow.current_state_id)
        : null;

      const availableTransitions = workflow
        ? workflowTransitionsByState.get(workflow.current_state_id) ?? []
        : [];

      const nextWorkflowTransition =
        workflowState?.code === "admission_requested"
          ? availableTransitions.find(
              (transition) => transition.code === "submit_for_review"
            )
          : availableTransitions[0] ?? null;

      const operatorState = getAdmissionOperatorState({
        status: admission.status,
        applicantDateOfBirth: admission.applicant_date_of_birth,
        requestedAdmissionDate: admission.requested_admission_date,
        workflowStateCode:
          workflowState?.code ??
          (workflowCheckCompleted ? null : "unknown"),
        workflowTransitionName: nextWorkflowTransition?.name ?? null,
      });

      return {
        ...admission,
        ...operatorState,
        workflowStateName:
          workflowState?.name ??
          (workflowCheckCompleted
            ? "No active workflow"
            : "Workflow unavailable"),
      };
    })
    .filter((admission) => admission.status === "open");

  const taskQueue = tasks
    .map((task) => ({
      ...task,
      exceptions: getTaskExceptions(
        task.status,
        task.assigned_to_user_id,
        task.due_at
      ),
    }))
    .filter((task) => task.exceptions.length > 0);

  const admissionExceptionCount = admissionQueue.reduce(
    (count, admission) => count + admission.exceptions.length,
    0
  );

  const taskExceptionCount = taskQueue.reduce(
    (count, task) => count + task.exceptions.length,
    0
  );

  const today = getDateKeyInTimeZone(new Date(), timeZone);
  const feeStudentById = new Map(
    feeStudents.map((student) => [student.id, student.full_name]),
  );

  const studentExceptionQueue = students
    .map((student) => {
      const exceptions: StudentException[] = [];

      if (student.status === "inactive") {
        exceptions.push("inactive_student");
      }

      if (!activeEnrollmentStudentIds.has(student.id)) {
        exceptions.push("no_active_enrollment");
      }

      let nextAction = "Review student record";

      if (exceptions.includes("inactive_student")) {
        nextAction = "Review student status";
      } else if (exceptions.includes("no_active_enrollment")) {
        nextAction = "Create enrollment";
      }

      return {
        ...student,
        exceptions,
        nextAction,
      };
    })
    .filter((student) => student.exceptions.length > 0);

  const studentExceptionCount = studentExceptionQueue.reduce(
    (count, student) => count + student.exceptions.length,
    0
  );

  const feeExceptions = feeAccounts.filter(
    (account) => !account.due_date || account.due_date < today,
  );

  return (
    <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Command Center
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            What needs attention?
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Organization-scoped work and operational queues.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canReadAdmissions ? (
            <Link
              href="/school/admissions"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
            >
              Admissions
            </Link>
          ) : null}

          {canReadTasks ? (
            <Link
              href="/school/tasks"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
            >
              Tasks
            </Link>
          ) : null}

          {canReadFinance ? (
            <Link
              href="/school/finance/accounts"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
            >
              Finance
            </Link>
          ) : null}
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        Status totals are exact. Admission and task flags use 20-record previews; student lifecycle findings scan the full register.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {canReadAdmissions ? (
          <>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Admissions to review
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {openAdmissionCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Approved admissions
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {approvedAdmissionCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Admission flags in preview
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {admissionExceptionCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Up to 20 oldest open requests
              </p>
            </div>
          </>
        ) : null}

        {canReadTasks ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Task flags in preview
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {taskExceptionCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Up to 20 active tasks
            </p>
          </div>
        ) : null}

        {canReadStudents ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Students with lifecycle exceptions
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {studentExceptionQueue.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {studentExceptionCount} findings across the complete student
              register
            </p>
          </div>
        ) : null}

        {canReadFinance ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Accounts with balances
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {feeAccountCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Exact count; balance totals are not inferred from the preview
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {canReadAdmissions ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Next admissions actions</h3>
              <p className="text-xs text-slate-500">
                Oldest open requests, up to 20.
              </p>
            </div>

            <Link
              href="/school/admissions"
              className="text-xs font-semibold text-slate-300 hover:text-white"
            >
              Open queue
            </Link>
          </div>

          {admissionQueue.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
              No open admissions require attention.
            </p>
          ) : (
            <div className="space-y-2">
              {admissionQueue.slice(0, 6).map((admission) => (
                <div
                  key={admission.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">
                        {admission.applicant_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Workflow: {admission.workflowStateName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Next: {admission.nextAction}
                      </p>
                      <Link
                        href={`/school/admissions?admission=${admission.id}#admission-${admission.id}`}
                        className="mt-2 inline-flex text-xs font-semibold text-slate-300 hover:text-white"
                      >
                        Review admission â†’
                      </Link>
                    </div>

                    <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">
                      Open
                    </span>
                  </div>

                  {admission.exceptions.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {admission.exceptions.map((exception) => (
                        <span
                          key={exception}
                          className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300"
                        >
                          Exception: {admissionExceptionLabels[exception]}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          </div>
        ) : null}

        {canReadTasks ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Task exceptions preview</h3>
              <p className="text-xs text-slate-500">
                {activeTaskCount} active tasks; showing up to 20 sorted by due date.
              </p>
            </div>

            <Link
              href="/school/tasks"
              className="text-xs font-semibold text-slate-300 hover:text-white"
            >
              Open tasks
            </Link>
          </div>

          {taskQueue.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
              No active task exceptions.
            </p>
          ) : (
            <div className="space-y-2">
              {taskQueue.slice(0, 6).map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Due: {formatDueDate(task.due_at, timeZone, locale)}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">
                      {task.status === "in_progress" ? "In progress" : "Open"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {task.exceptions.map((exception) => (
                      <span
                        key={exception}
                        className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300"
                      >
                        Exception: {taskExceptionLabels[exception]}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        ) : null}
      </div>

      {canReadFinance ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Finance exceptions</h3>
              <p className="text-xs text-slate-500">
                Accounts with balances, sorted by due date and amount; up to 20 shown.
              </p>
            </div>

            <Link
              href="/school/finance/accounts"
              className="text-xs font-semibold text-slate-300 hover:text-white"
            >
              Open finance
            </Link>
          </div>

          {feeAccountCount === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
              No outstanding fee accounts require attention.
            </p>
          ) : (
            <div className="space-y-2">
              {feeAccounts.slice(0, 6).map((account) => (
                <div
                  key={account.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">
                        {feeStudentById.get(account.student_id) ??
                          "Unknown student"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Balance:{" "}
                        {formatOrganizationCurrency(
                          account.balance_amount,
                          currencyCode,
                          locale,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Due: {account.due_date ?? "No due date"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Next:{" "}
                        {account.due_date && account.due_date < today
                          ? "Resolve overdue balance"
                          : "Review outstanding fees"}
                      </p>
                    </div>

                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
                      {account.due_date && account.due_date < today
                        ? "Overdue"
                        : "Outstanding"}
                    </span>
                  </div>

                  {!account.due_date || account.due_date < today ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {!account.due_date ? (
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
                          Exception: No due date
                        </span>
                      ) : null}

                      {account.due_date && account.due_date < today ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-300">
                          Exception: Overdue
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/school/students/${account.student_id}`}
                      className="inline-flex text-xs font-semibold text-slate-200 hover:text-white"
                    >
                      Open Student 360 â†’
                    </Link>

                    <Link
                      href={`/school/finance/accounts#fee-account-${account.id}`}
                      className="inline-flex text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Open fee account â†’
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {feeExceptions.length > 0 ? (
            <p className="mt-3 text-xs text-amber-400">
              {feeExceptions.length} overdue or undated account
              {feeExceptions.length === 1 ? "" : "s"} in this preview.
            </p>
          ) : null}
        </div>
      ) : null}

      {canReadStudents && studentExceptionQueue.length > 0 ? (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">
                Students requiring attention
              </h3>
              <p className="text-xs text-slate-500">
                Inactive students or students without an active enrollment.
              </p>
            </div>

            <Link
              href="/school/students"
              className="text-xs font-semibold text-slate-300 hover:text-white"
            >
              Open students
            </Link>
          </div>

          <div className="space-y-2">
            {studentExceptionQueue.slice(0, 6).map((student) => (
              <div
                key={student.id}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">
                      {student.full_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Next: {student.nextAction}
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
                    Attention
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {student.exceptions.map((exception) => (
                    <span
                      key={exception}
                      className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300"
                    >
                      Exception: {studentExceptionLabels[exception]}
                    </span>
                  ))}
                </div>

                <div className="mt-3">
                  <Link
                    href={`/school/students/${student.id}`}
                    className="inline-flex text-xs font-semibold text-slate-200 hover:text-white"
                  >
                    Open Student 360 →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {studentExceptionQueue.length > 6 ? (
            <p className="mt-3 text-xs text-slate-500">
              Showing 6 of {studentExceptionQueue.length} students requiring attention.
            </p>
          ) : null}
        </div>
      ) : null}

      {canReadAdmissions && approvedAdmissionCount > 0 ? (
        <div className="mt-5 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-white">
                {approvedAdmissionCount} approved admission
                {approvedAdmissionCount === 1 ? "" : "s"} ready for student conversion
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Approved admissions can become durable student records.
              </p>
            </div>

            <Link
              href="/school/admissions/convert"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200"
            >
              Convert to Student
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
