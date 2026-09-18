import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

type WorkflowDefinition = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "active" | "suspended" | "archived";
  created_at: string;
  updated_at: string;
};

type WorkflowState = {
  id: string;
  workflow_definition_id: string;
  code: string;
  name: string;
  description: string | null;
  sequence: number;
  is_initial: boolean;
  is_terminal: boolean;
};

type WorkflowTransition = {
  id: string;
  workflow_definition_id: string;
  from_state_id: string;
  to_state_id: string;
  code: string;
  name: string;
  description: string | null;
};

export default async function WorkflowsPage() {
  await requirePermission("core.workflows.read");

  const context = await getOrganizationContext();
  const supabase = await createClient();

  const { data: definitions, error: definitionsError } = await supabase
    .from("workflow_definitions")
    .select(
      "id, code, name, description, status, created_at, updated_at"
    )
    .eq("organization_id", context.organization.id)
    .order("name");

  if (definitionsError) {
    throw new Error(
      `Failed to load workflow definitions: ${definitionsError.message}`
    );
  }

  const workflowDefinitions = (definitions ?? []) as WorkflowDefinition[];

  const workflowIds = workflowDefinitions.map((workflow) => workflow.id);

  let states: WorkflowState[] = [];
  let transitions: WorkflowTransition[] = [];

  if (workflowIds.length > 0) {
    const { data: stateRows, error: statesError } = await supabase
      .from("workflow_states")
      .select(
        "id, workflow_definition_id, code, name, description, sequence, is_initial, is_terminal"
      )
      .eq("organization_id", context.organization.id)
      .in("workflow_definition_id", workflowIds)
      .order("sequence");

    if (statesError) {
      throw new Error(
        `Failed to load workflow states: ${statesError.message}`
      );
    }

    states = (stateRows ?? []) as WorkflowState[];

    const { data: transitionRows, error: transitionsError } = await supabase
      .from("workflow_transitions")
      .select(
        "id, workflow_definition_id, from_state_id, to_state_id, code, name, description"
      )
      .eq("organization_id", context.organization.id)
      .in("workflow_definition_id", workflowIds)
      .order("name");

    if (transitionsError) {
      throw new Error(
        `Failed to load workflow transitions: ${transitionsError.message}`
      );
    }

    transitions = (transitionRows ?? []) as WorkflowTransition[];
  }

  const counts = {
    total: workflowDefinitions.length,
    active: workflowDefinitions.filter(
      (workflow) => workflow.status === "active"
    ).length,
    suspended: workflowDefinitions.filter(
      (workflow) => workflow.status === "suspended"
    ).length,
    archived: workflowDefinitions.filter(
      (workflow) => workflow.status === "archived"
    ).length,
    states: states.length,
    transitions: transitions.length,
  };

  const statesByWorkflow = new Map<string, WorkflowState[]>();

  for (const state of states) {
    const existing = statesByWorkflow.get(state.workflow_definition_id) ?? [];
    existing.push(state);
    statesByWorkflow.set(state.workflow_definition_id, existing);
  }

  const transitionsByWorkflow = new Map<string, WorkflowTransition[]>();

  for (const transition of transitions) {
    const existing =
      transitionsByWorkflow.get(transition.workflow_definition_id) ?? [];
    existing.push(transition);
    transitionsByWorkflow.set(transition.workflow_definition_id, existing);
  }

  const stateNames = new Map(
    states.map((state) => [state.id, state.name])
  );

  const statusLabels: Record<WorkflowDefinition["status"], string> = {
    active: "Active",
    suspended: "Suspended",
    archived: "Archived",
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400">
                SAKATA Operating Systems
              </p>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Workflow Configuration
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
                Reusable operational workflow definitions, governed states,
                and permitted transitions for{" "}
                <span className="font-medium text-slate-200">
                  {context.organization.name}
                </span>
                .
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Core Platform
              </p>

              <p className="mt-2 text-lg font-semibold text-slate-100">
                Workflow / State
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Definition and transition foundation
              </p>
            </div>
          </div>
        </header>

        <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Workflows</p>
            <p className="mt-2 text-3xl font-bold">{counts.total}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Active</p>
            <p className="mt-2 text-3xl font-bold">{counts.active}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Suspended</p>
            <p className="mt-2 text-3xl font-bold">{counts.suspended}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Archived</p>
            <p className="mt-2 text-3xl font-bold">{counts.archived}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">States</p>
            <p className="mt-2 text-3xl font-bold">{counts.states}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Transitions</p>
            <p className="mt-2 text-3xl font-bold">{counts.transitions}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Configuration Register
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Workflow Definitions
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Governed lifecycle definitions available to this organization.
              </p>
            </div>
          </div>

          {workflowDefinitions.length > 0 ? (
            <div className="divide-y divide-slate-800">
              {workflowDefinitions.map((workflow) => {
                const workflowStates =
                  statesByWorkflow.get(workflow.id) ?? [];
                const workflowTransitions =
                  transitionsByWorkflow.get(workflow.id) ?? [];

                return (
                  <article key={workflow.id} className="px-6 py-7">
                    <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div>
                            <p className="font-mono text-xs text-slate-500">
                              {workflow.code}
                            </p>

                            <h3 className="mt-1 text-2xl font-semibold text-slate-100">
                              {workflow.name}
                            </h3>
                          </div>

                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                            {statusLabels[workflow.status]}
                          </span>
                        </div>

                        {workflow.description && (
                          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
                            {workflow.description}
                          </p>
                        )}

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="font-semibold text-slate-200">
                                States
                              </h4>

                              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400">
                                {workflowStates.length}
                              </span>
                            </div>

                            {workflowStates.length > 0 ? (
                              <div className="mt-4 space-y-3">
                                {workflowStates.map((state) => (
                                  <div
                                    key={state.id}
                                    className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-mono text-xs text-slate-500">
                                        {state.sequence}
                                      </span>

                                      <span className="font-medium text-slate-200">
                                        {state.name}
                                      </span>

                                      {state.is_initial && (
                                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                                          Initial
                                        </span>
                                      )}

                                      {state.is_terminal && (
                                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                                          Terminal
                                        </span>
                                      )}
                                    </div>

                                    <p className="mt-1 font-mono text-xs text-slate-600">
                                      {state.code}
                                    </p>

                                    {state.description && (
                                      <p className="mt-2 text-xs leading-5 text-slate-500">
                                        {state.description}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-4 text-sm text-slate-500">
                                No states configured yet.
                              </p>
                            )}
                          </div>

                          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="font-semibold text-slate-200">
                                Transitions
                              </h4>

                              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400">
                                {workflowTransitions.length}
                              </span>
                            </div>

                            {workflowTransitions.length > 0 ? (
                              <div className="mt-4 space-y-3">
                                {workflowTransitions.map((transition) => (
                                  <div
                                    key={transition.id}
                                    className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
                                  >
                                    <p className="font-medium text-slate-200">
                                      {transition.name}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {stateNames.get(
                                        transition.from_state_id
                                      ) ?? "Unknown state"}{" "}
                                      <span className="px-1 text-slate-600">
                                        →
                                      </span>{" "}
                                      {stateNames.get(
                                        transition.to_state_id
                                      ) ?? "Unknown state"}
                                    </p>

                                    <p className="mt-2 font-mono text-xs text-slate-600">
                                      {transition.code}
                                    </p>

                                    {transition.description && (
                                      <p className="mt-2 text-xs leading-5 text-slate-500">
                                        {transition.description}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-4 text-sm text-slate-500">
                                No transitions configured yet.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="font-semibold text-slate-200">
                No workflow definitions have been configured yet.
              </p>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                The reusable Workflow / State foundation is deployed, but this
                organization does not yet have a workflow definition.
              </p>
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-slate-800 pt-6 text-sm text-slate-500">
          SAKATA Operating Systems · Control Plane · Workflow / State
        </footer>
      </div>
    </main>
  );
}
