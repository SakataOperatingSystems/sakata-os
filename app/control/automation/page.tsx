import Link from "next/link";

import {
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import CreateAutomationRuleForm from "./create-rule-form";

type AutomationRule = {
  id: string;
  name: string;
  description: string | null;
  event_type: string;
  entity_type: string | null;
  action_type: string;
  enabled: boolean;
  created_at: string;
};

type AutomationJob = {
  id: string;
  automation_rule_id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  attempt_count: number;
  available_at: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  last_error: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<AutomationJob["status"], string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STATUS_CLASSES: Record<AutomationJob["status"], string> = {
  queued: "bg-amber-400/10 text-amber-300",
  running: "bg-cyan-400/10 text-cyan-300",
  completed: "bg-emerald-400/10 text-emerald-300",
  failed: "bg-red-400/10 text-red-300",
  cancelled: "bg-slate-800 text-slate-400",
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-UG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function actionLabel(actionType: string) {
  if (actionType === "notification.in_app") {
    return "In-app notification";
  }

  return actionType;
}

export default async function AutomationControlPage() {
  await requirePermission("core.automation.read");

  const { organizationId } = await getOrganizationContext();
  const supabase = await createClient();

  const canManageAutomation = await hasPermission(
    "core.automation.manage"
  );

  const [
    { data: rules, error: rulesError },
    { data: jobs, error: jobsError },
  ] = await Promise.all([
    supabase
      .from("automation_rules")
      .select(
        "id, name, description, event_type, entity_type, action_type, enabled, created_at"
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("automation_jobs")
      .select(
        "id, automation_rule_id, status, attempt_count, available_at, started_at, completed_at, failed_at, last_error, created_at"
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (rulesError) {
    throw new Error(`Failed to load automation rules: ${rulesError.message}`);
  }

  if (jobsError) {
    throw new Error(`Failed to load automation jobs: ${jobsError.message}`);
  }

  const automationRules = (rules ?? []) as AutomationRule[];
  const automationJobs = (jobs ?? []) as AutomationJob[];

  const rulesById = new Map(
    automationRules.map((rule) => [rule.id, rule])
  );

  const enabledRules = automationRules.filter((rule) => rule.enabled).length;
  const queuedJobs = automationJobs.filter(
    (job) => job.status === "queued"
  ).length;
  const runningJobs = automationJobs.filter(
    (job) => job.status === "running"
  ).length;
  const completedJobs = automationJobs.filter(
    (job) => job.status === "completed"
  ).length;
  const failedJobs = automationJobs.filter(
    (job) => job.status === "failed"
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">
              Control Plane / Automation
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Automation Control Center
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Governed event-driven automation for the organization. Rules
              translate platform events into controlled operational actions,
              while jobs provide execution state and accountability.
            </p>
          </div>

          <Link
            href="/control/verification/automation"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Run Pipeline Verification
          </Link>
        </div>

        <div className="mt-8">
          <CreateAutomationRuleForm
            canManage={canManageAutomation}
          />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Rules", automationRules.length],
            ["Enabled", enabledRules],
            ["Queued", queuedJobs],
            ["Running", runningJobs],
            ["Completed", completedJobs],
            ["Failed", failedJobs],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {value}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Automation Rules</h2>
            <p className="mt-1 text-sm text-slate-500">
              Each rule defines what platform event activates an operational
              action.
            </p>
          </div>

          {automationRules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-sm text-slate-500">
              No automation rules have been configured.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {automationRules.map((rule) => (
                <article
                  key={rule.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {rule.name}
                      </h3>
                      {rule.description ? (
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {rule.description}
                        </p>
                      ) : null}
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        rule.enabled
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-600">
                        Event
                      </p>
                      <p className="mt-1 break-words text-sm text-slate-300">
                        {rule.event_type}
                      </p>
                      {rule.entity_type ? (
                        <p className="mt-1 text-xs text-slate-600">
                          Entity: {rule.entity_type}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-600">
                        Action
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {actionLabel(rule.action_type)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-600">
                    Created {formatDate(rule.created_at)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Recent Automation Jobs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Execution state for the latest automation work in this
              organization.
            </p>
          </div>

          {automationJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-sm text-slate-500">
              No automation jobs have been created.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
              <div className="divide-y divide-slate-800">
                {automationJobs.map((job) => {
                  const rule = rulesById.get(job.automation_rule_id);

                  return (
                    <div
                      key={job.id}
                      className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_auto_auto] lg:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {rule?.name ?? "Automation rule"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {rule
                            ? `${rule.event_type} → ${actionLabel(
                                rule.action_type
                              )}`
                            : "Rule context unavailable"}
                        </p>
                        {job.last_error ? (
                          <p className="mt-2 text-xs leading-5 text-red-300">
                            {job.last_error}
                          </p>
                        ) : null}
                      </div>

                      <div className="text-xs text-slate-500">
                        Attempt {job.attempt_count}
                        <div className="mt-1">
                          {formatDate(job.created_at)}
                        </div>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                          STATUS_CLASSES[job.status]
                        }`}
                      >
                        {STATUS_LABELS[job.status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
