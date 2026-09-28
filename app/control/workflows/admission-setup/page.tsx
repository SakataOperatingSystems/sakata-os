import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import { configureStudentAdmissionDecisionPath } from "../actions";

type SearchParams = Promise<{
  configured?: string;
}>;

export default async function AdmissionWorkflowSetupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("core.workflows.manage");

  const context = await getOrganizationContext();
  const supabase = await createClient();
  const params = await searchParams;

  const { data: workflow, error: workflowError } = await supabase
    .from("workflow_definitions")
    .select("id, code, name, description, status")
    .eq("organization_id", context.organization.id)
    .eq("code", "student_admission")
    .eq("status", "active")
    .maybeSingle();

  if (workflowError) {
    throw new Error(
      `Failed to load the student admission workflow: ${workflowError.message}`
    );
  }

  if (!workflow) {
    throw new Error(
      "The active student_admission workflow is not configured for this organization."
    );
  }

  const [{ data: states, error: statesError }, { data: transitions, error: transitionsError }] =
    await Promise.all([
      supabase
        .from("workflow_states")
        .select(
          "id, code, name, description, sequence, is_initial, is_terminal"
        )
        .eq("organization_id", context.organization.id)
        .eq("workflow_definition_id", workflow.id)
        .order("sequence"),
      supabase
        .from("workflow_transitions")
        .select(
          "id, from_state_id, to_state_id, code, name, description"
        )
        .eq("organization_id", context.organization.id)
        .eq("workflow_definition_id", workflow.id)
        .order("name"),
    ]);

  if (statesError) {
    throw new Error(
      `Failed to load admission workflow states: ${statesError.message}`
    );
  }

  if (transitionsError) {
    throw new Error(
      `Failed to load admission workflow transitions: ${transitionsError.message}`
    );
  }

  const stateById = new Map(
    (states ?? []).map((state) => [state.id, state])
  );

  const transitionRoutes = (transitions ?? []).map((transition) => ({
    ...transition,
    fromName:
      stateById.get(transition.from_state_id)?.name ??
      "Unknown state",
    toName:
      stateById.get(transition.to_state_id)?.name ??
      "Unknown state",
  }));

  const reviewState = (states ?? []).find(
    (state) => state.code === "admission_review"
  );

  const decisionTransitions = transitionRoutes.filter(
    (transition) =>
      reviewState &&
      transition.from_state_id === reviewState.id
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
              School OS • Workflow Setup
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Admission Decision Path
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Configure the decision stage used by admissions operators after
              an application reaches formal review.
            </p>
          </div>

          <Link
            href="/control/workflows"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
          >
            Back to Workflow Configuration
          </Link>
        </div>

        {params.configured === "1" && (
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <p className="text-sm font-semibold text-emerald-300">
              Admission decision path configured.
            </p>
            <p className="mt-1 text-sm text-emerald-200/80">
              Existing records were preserved. Missing states and transitions
              were added only where required.
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Active workflow
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {workflow.name}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {workflow.code}
              </p>
            </div>

            <form action={configureStudentAdmissionDecisionPath}>
              <button
                type="submit"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                Configure Admission Decision Path
              </button>
            </form>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  States
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {states?.length ?? 0} configured
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {(states ?? []).map((state) => (
                <div
                  key={state.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-100">
                      {state.name}
                    </span>
                    {state.is_initial && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                        Initial
                      </span>
                    )}
                    {state.is_terminal && (
                      <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-300">
                        Terminal
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {state.code}
                  </p>
                  {state.description && (
                    <p className="mt-2 text-sm text-slate-400">
                      {state.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Decision transitions
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                {decisionTransitions.length} from Admission Under Review
              </h2>
            </div>

            <div className="mt-6 space-y-3">
              {decisionTransitions.length > 0 ? (
                decisionTransitions.map((transition) => (
                  <div
                    key={transition.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <p className="font-medium text-slate-100">
                      {transition.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {transition.code}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {transition.fromName} → {transition.toName}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-sm font-medium text-amber-300">
                    Decision path is incomplete.
                  </p>
                  <p className="mt-1 text-sm text-amber-200/70">
                    Use the configuration button above to add the missing
                    decision states and transitions.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
