import Link from "next/link";
import {
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import {
  createAdmissionRequest,
  submitAdmissionForReview,
  updateAdmissionRequest,
} from "./actions";
import AdmissionForm from "./form";
import type {
  AdmissionGender,
  AdmissionRequestStatus,
} from "./validation";

const STATUS_STYLES: Record<string, string> = {
  open:
    "border-blue-500/30 bg-blue-500/10 text-blue-300",
  approved:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected:
    "border-red-500/30 bg-red-500/10 text-red-300",
  withdrawn:
    "border-amber-500/30 bg-amber-500/10 text-amber-300",
  converted:
    "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

const WORKFLOW_STATE_STYLES: Record<string, string> = {
  admission_requested:
    "border-blue-500/30 bg-blue-500/10 text-blue-300",
  admission_review:
    "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

type WorkflowRuntimeRow = {
  workflow_instance_id: string;
  subject_id: string;
  current_state_id: string;
  current_state_code: string;
  current_state_name: string;
  workflow_transition_id: string | null;
  transition_code: string | null;
  transition_name: string | null;
};

export default async function AdmissionsPage() {
  await requirePermission(
    "school.admission_requests.read"
  );

  const { organization } =
    await getOrganizationContext();

  const canManage = await hasPermission(
    "school.admission_requests.manage"
  );

  const supabase = await createClient();

  const { data: requests, error } = await supabase
    .from("student_admission_requests")
    .select(
      "id, admission_request_id, applicant_name, applicant_gender, applicant_date_of_birth, requested_admission_date, status, notes, created_at, updated_at"
    )
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load admission requests: ${error.message}`
    );
  }

  const admissionIds =
    requests?.map((item) => item.id) ?? [];

  const workflowRuntimeByAdmissionId =
    new Map<string, WorkflowRuntimeRow>();

  if (admissionIds.length > 0) {
    const { data: workflowInstances, error: workflowError } =
      await supabase
        .from("workflow_instances")
        .select(
          "id, subject_id, current_state_id, workflow_definition_id, status"
        )
        .eq("organization_id", organization.id)
        .eq(
          "subject_type",
          "student_admission_request"
        )
        .in("subject_id", admissionIds)
        .eq("status", "active");

    if (workflowError) {
      throw new Error(
        `Failed to load admission workflow instances: ${workflowError.message}`
      );
    }

    const instanceRows = workflowInstances ?? [];

    const workflowDefinitionIds = Array.from(
      new Set(
        instanceRows.map(
          (item) => item.workflow_definition_id
        )
      )
    );

    const currentStateIds = Array.from(
      new Set(
        instanceRows.map(
          (item) => item.current_state_id
        )
      )
    );

    const [
      { data: states, error: statesError },
      { data: transitions, error: transitionsError },
    ] = await Promise.all([
      currentStateIds.length > 0
        ? supabase
            .from("workflow_states")
            .select(
              "id, organization_id, workflow_definition_id, code, name"
            )
            .eq("organization_id", organization.id)
            .in("id", currentStateIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
      workflowDefinitionIds.length > 0 &&
      currentStateIds.length > 0
        ? supabase
            .from("workflow_transitions")
            .select(
              "id, organization_id, workflow_definition_id, from_state_id, to_state_id, code, name"
            )
            .eq("organization_id", organization.id)
            .in(
              "workflow_definition_id",
              workflowDefinitionIds
            )
            .in("from_state_id", currentStateIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (statesError) {
      throw new Error(
        `Failed to load workflow states: ${statesError.message}`
      );
    }

    if (transitionsError) {
      throw new Error(
        `Failed to load workflow transitions: ${transitionsError.message}`
      );
    }

    const stateById = new Map(
      (states ?? []).map((state) => [
        state.id,
        state,
      ])
    );

    const transitionByInstance = new Map<
      string,
      (typeof transitions)[number]
    >();

    for (const instance of instanceRows) {
      const transition = (transitions ?? []).find(
        (item) =>
          item.workflow_definition_id ===
            instance.workflow_definition_id &&
          item.from_state_id ===
            instance.current_state_id
      );

      if (transition) {
        transitionByInstance.set(
          instance.id,
          transition
        );
      }
    }

    for (const instance of instanceRows) {
      const state = stateById.get(
        instance.current_state_id
      );

      if (!state) {
        continue;
      }

      const transition = transitionByInstance.get(
        instance.id
      );

      workflowRuntimeByAdmissionId.set(
        instance.subject_id,
        {
          workflow_instance_id: instance.id,
          subject_id: instance.subject_id,
          current_state_id:
            instance.current_state_id,
          current_state_code: state.code,
          current_state_name: state.name,
          workflow_transition_id:
            transition?.id ?? null,
          transition_code:
            transition?.code ?? null,
          transition_name:
            transition?.name ?? null,
        }
      );
    }
  }

  const totalCount = requests?.length ?? 0;

  const openCount =
    requests?.filter(
      (item) => item.status === "open"
    ).length ?? 0;

  const approvedCount =
    requests?.filter(
      (item) => item.status === "approved"
    ).length ?? 0;

  const convertedCount =
    requests?.filter(
      (item) => item.status === "converted"
    ).length ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/school"
              className="text-sm text-slate-500 transition hover:text-slate-300"
            >
              Back to School OS
            </Link>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Student Admissions
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Capture and manage student admission requests
              before they become canonical student records.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
            {totalCount}{" "}
            {totalCount === 1
              ? "admission request"
              : "admission requests"}
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Total requests
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {totalCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Open
            </p>
            <p className="mt-2 text-2xl font-semibold text-blue-300">
              {openCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Approved
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">
              {approvedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Converted
            </p>
            <p className="mt-2 text-2xl font-semibold text-violet-300">
              {convertedCount}
            </p>
          </div>
        </div>

        {canManage && (
          <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5">
              <h2 className="text-lg font-medium">
                Create admission request
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Capture an applicant before creating the
                canonical student record.
              </p>
            </div>

            <AdmissionForm
              action={createAdmissionRequest}
            />
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="font-medium">
              Admission request register
            </h2>
          </div>

          {!requests?.length ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm text-slate-400">
                No student admission requests have been
                created yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">
                      Request
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Applicant
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Date of birth
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Requested date
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Status
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Workflow
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {requests.map((item) => {
                    const workflow =
                      workflowRuntimeByAdmissionId.get(
                        item.id
                      );

                    const workflowInstanceId =
                      workflow?.workflow_instance_id ?? null;

                    const workflowTransitionId =
                      workflow?.workflow_transition_id ?? null;

                    const canSubmitForReview =
                      canManage &&
                      workflowInstanceId !== null &&
                      workflowTransitionId !== null;

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-800/30"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">
                            {item.admission_request_id}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            Created{" "}
                            {new Date(
                              item.created_at
                            ).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-200">
                            {item.applicant_name}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {item.applicant_gender
                              ? item.applicant_gender
                              : "Gender not specified"}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {item.applicant_date_of_birth ||
                            "Not provided"}
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {item.requested_admission_date ||
                            "Not provided"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                              STATUS_STYLES[item.status] ??
                              "border-slate-700 bg-slate-800 text-slate-300"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {workflow ? (
                            <div className="space-y-2">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                                  WORKFLOW_STATE_STYLES[
                                    workflow.current_state_code
                                  ] ??
                                  "border-slate-700 bg-slate-800 text-slate-300"
                                }`}
                              >
                                {workflow.current_state_name}
                              </span>

                              {workflow.transition_name && (
                                <div className="text-xs text-slate-500">
                                  Next:{" "}
                                  {workflow.transition_name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">
                              No active workflow
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-4">
                            {canSubmitForReview && (
                              <form
                                action={
                                  submitAdmissionForReview
                                }
                              >
                                <input
                                  type="hidden"
                                  name="workflow_instance_id"
                                  value={workflowInstanceId}
                                />

                                <input
                                  type="hidden"
                                  name="workflow_transition_id"
                                  value={workflowTransitionId}
                                />

                                <button
                                  type="submit"
                                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20"
                                >
                                  Submit for Review
                                </button>
                              </form>
                            )}

                            {canManage ? (
                              <details>
                                <summary className="cursor-pointer text-sm text-slate-300 hover:text-white">
                                  Edit
                                </summary>

                                <div className="mt-4 min-w-[560px] rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                                  <AdmissionForm
                                    action={
                                      updateAdmissionRequest
                                    }
                                    initialValues={{
                                      id: item.id,
                                      admissionRequestId:
                                        item.admission_request_id,
                                      applicantName:
                                        item.applicant_name,
                                      applicantGender:
                                        (item.applicant_gender ??
                                          "") as
                                          | AdmissionGender
                                          | "",
                                      applicantDateOfBirth:
                                        item.applicant_date_of_birth ??
                                        "",
                                      requestedAdmissionDate:
                                        item.requested_admission_date ??
                                        "",
                                      status:
                                        item.status as AdmissionRequestStatus,
                                      notes:
                                        item.notes ?? "",
                                    }}
                                  />
                                </div>
                              </details>
                            ) : (
                              <span className="text-xs text-slate-600">
                                Read only
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
