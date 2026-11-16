import Link from "next/link";

import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";

type AuditStatus =
  | "Verified"
  | "Built — audit required"
  | "Foundation only"
  | "Not yet verified";

type ModuleAudit = {
  module: string;
  status: AuditStatus;
  identity: string;
  automation: string;
  evidence: string;
};

const MODULES: ModuleAudit[] = [
  {
    module: "Admissions",
    status: "Verified",
    identity: "System-managed admission reference",
    automation: "Events, workflow, task bridge",
    evidence: "Admission → Student E2E verified",
  },
  {
    module: "Students",
    status: "Verified",
    identity: "System-managed STU-######",
    automation: "student.created event + automation job",
    evidence: "Admission conversion + event chain verified",
  },
  {
    module: "Enrollments",
    status: "Built — audit required",
    identity: "Requires identity audit",
    automation: "Requires automation audit",
    evidence: "Operational capability exists",
  },
  {
    module: "Attendance",
    status: "Built — audit required",
    identity: "Requires identity audit",
    automation: "Requires automation audit",
    evidence: "Core attendance capability built",
  },
  {
    module: "Assessments",
    status: "Built — audit required",
    identity: "Requires identity audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Billing",
    status: "Built — audit required",
    identity: "Requires reference strategy audit",
    automation: "Requires automation audit",
    evidence: "Active configuration definition exists",
  },
  {
    module: "Payments",
    status: "Built — audit required",
    identity: "Requires receipt/payment reference audit",
    automation: "Requires automation audit",
    evidence: "Active configuration definition exists",
  },
  {
    module: "Tasks",
    status: "Verified",
    identity: "Core task identity exists",
    automation: "Workflow task bridge verified",
    evidence: "Lifecycle, tenant immutability and audit verified",
  },
  {
    module: "Workflows",
    status: "Verified",
    identity: "Workflow runtime identity exists",
    automation: "Transition/action runtime verified",
    evidence: "Admission workflow E2E verified",
  },
  {
    module: "Calendar",
    status: "Built — audit required",
    identity: "Requires identity audit",
    automation: "Requires automation audit",
    evidence: "Active configuration definition exists",
  },
  {
    module: "Alerts",
    status: "Built — audit required",
    identity: "Requires identity audit",
    automation: "Requires automation audit",
    evidence: "Active configuration definition exists",
  },
  {
    module: "Academic Structure",
    status: "Built — audit required",
    identity: "Requires identity audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Academic Periods",
    status: "Built — audit required",
    identity: "Requires identity audit",
    automation: "Requires automation audit",
    evidence: "Operational route exists",
  },
  {
    module: "Classes",
    status: "Built — audit required",
    identity: "Requires class reference audit",
    automation: "Requires automation audit",
    evidence: "Operational route exists",
  },
  {
    module: "Subjects",
    status: "Built — audit required",
    identity: "Requires subject reference audit",
    automation: "Requires automation audit",
    evidence: "Academic capability family",
  },
  {
    module: "Student Results",
    status: "Built — audit required",
    identity: "Requires result identity audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "People",
    status: "Built — audit required",
    identity: "Requires identity audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Staff",
    status: "Built — audit required",
    identity: "Requires staff identity audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Requirements",
    status: "Built — audit required",
    identity: "Requires requirement reference audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Communications",
    status: "Built — audit required",
    identity: "Requires identity audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Documents",
    status: "Built — audit required",
    identity: "Requires document reference/version audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Reporting",
    status: "Built — audit required",
    identity: "Usually derived; audit required",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Dashboards",
    status: "Built — audit required",
    identity: "Derived surface; audit required",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Intelligence",
    status: "Built — audit required",
    identity: "Derived/decision identity audit",
    automation: "Requires bounded automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Approvals",
    status: "Built — audit required",
    identity: "Requires approval identity audit",
    automation: "Requires workflow automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Audit",
    status: "Foundation only",
    identity: "Audit event identity exists",
    automation: "Requires cross-module coverage audit",
    evidence: "Platform audit foundations exist",
  },
  {
    module: "Finance",
    status: "Built — audit required",
    identity: "Requires financial reference audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Financial Support",
    status: "Built — audit required",
    identity: "Requires support reference audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Budgets",
    status: "Built — audit required",
    identity: "Requires budget reference audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Procurement",
    status: "Built — audit required",
    identity: "Requires procurement reference audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Suppliers",
    status: "Built — audit required",
    identity: "Requires supplier identity audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Inventory",
    status: "Built — audit required",
    identity: "Requires item/asset identity audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Inventory Transactions",
    status: "Built — audit required",
    identity: "Requires transaction reference audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Assets",
    status: "Built — audit required",
    identity: "Requires asset tag/reference audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Maintenance",
    status: "Built — audit required",
    identity: "Requires maintenance reference audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Incidents",
    status: "Built — audit required",
    identity: "Requires incident reference audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
  {
    module: "Activities",
    status: "Built — audit required",
    identity: "Requires activity reference audit",
    automation: "Requires automation audit",
    evidence: "Deployed module",
  },
];
const DEPLOYED_MODULES = MODULES.filter((entry) => {
  const candidate = entry as {
    name?: string;
    module?: string;
    label?: string;
    code?: string;
  };

  const identity = [
    candidate.name,
    candidate.module,
    candidate.label,
    candidate.code,
  ]
    .filter(Boolean)
    .map((value) => value!.toLowerCase().trim());

  const excluded = new Set([
    "academic periods",
    "classes",
    "subjects",
    "academic_periods",
    "classes",
    "subjects",
  ]);

  return !identity.some((value) => excluded.has(value));
});

const STATUS_STYLES: Record<AuditStatus, string> = {
  Verified: "bg-emerald-500/10 text-emerald-400",
  "Built — audit required": "bg-amber-500/10 text-amber-400",
  "Foundation only": "bg-sky-500/10 text-sky-400",
  "Not yet verified": "bg-red-500/10 text-red-400",
};

export default async function ModuleCompletionAuditPage() {
  await requirePermission("organization.read");

  const context = await getOrganizationContext();

  const verified = MODULES.filter(
    (module) => module.status === "Verified"
  ).length;

  const auditRequired = MODULES.filter(
    (module) => module.status === "Built — audit required"
  ).length;

  const foundationOnly = MODULES.filter(
    (module) => module.status === "Foundation only"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                SAKATA Operating Systems · Control Plane
              </p>

              <h1 className="mt-2 text-4xl font-bold tracking-tight">
                Module Completion Audit
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
                A finite control-plane register for determining whether each
                deployed capability is operationally complete. A module is
                not marked complete merely because its screen or database
                structure exists.
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

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Deployed Modules
            </p>
            <p className="mt-2 text-3xl font-bold">{DEPLOYED_MODULES.length}</p>
          </div>

          <div className="rounded-2xl border border-emerald-900/50 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-400">
              Verified
            </p>
            <p className="mt-2 text-3xl font-bold">{verified}</p>
          </div>

          <div className="rounded-2xl border border-amber-900/50 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-400">
              Audit Required
            </p>
            <p className="mt-2 text-3xl font-bold">{auditRequired}</p>
          </div>

          <div className="rounded-2xl border border-sky-900/50 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-sky-400">
              Foundation Only
            </p>
            <p className="mt-2 text-3xl font-bold">{foundationOnly}</p>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Completion Doctrine
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Every deployed module must be checked against the operating
                chain
              </h2>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">
                Capture
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">
                Reuse
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">
                Derive
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">
                Relate
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">
                Trigger
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">
                Route
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">
                Notify
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">
                Update
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">
                Audit
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-400">
                Escalate
              </span>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/70">
                <tr>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Module
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Identity
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Automation
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Evidence / next audit
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {DEPLOYED_MODULES.map((module) => (
                  <tr
                    key={module.module}
                    className="transition hover:bg-slate-950/50"
                  >
                    <td className="px-5 py-5 font-semibold text-slate-100">
                      {module.module}
                    </td>

                    <td className="px-5 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[module.status]}`}
                      >
                        {module.status}
                      </span>
                    </td>

                    <td className="px-5 py-5 text-slate-400">
                      {module.identity}
                    </td>

                    <td className="px-5 py-5 text-slate-400">
                      {module.automation}
                    </td>

                    <td className="px-5 py-5 text-slate-400">
                      {module.evidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-amber-900/50 bg-amber-500/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">
            Audit rule
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            “Built” does not mean “complete.” A capability becomes verified
            only after its data model, relationships, identity strategy,
            authorization, configuration, operational workflow, automation,
            accountability, auditability, failure paths, idempotency, and
            end-to-end behavior have been examined where applicable.
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            “Not applicable” is a valid architectural outcome and must not be
            treated as a missing feature. The purpose of this register is to
            expose actual gaps, not manufacture work.
          </p>
        </section>

        <footer className="mt-8 flex flex-col justify-between gap-4 border-t border-slate-800 pt-6 text-sm text-slate-500 md:flex-row">
          <span>
            SAKATA Operating Systems · Read-only completion audit
          </span>

          <Link
            href="/control"
            className="font-medium text-slate-300 transition hover:text-white"
          >
            Back to Control Plane
          </Link>
        </footer>
      </div>
    </main>
  );
}

