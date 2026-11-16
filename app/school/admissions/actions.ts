"use server";
import { validateAdmissionDecisionEvidence } from "./validation";


import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { executeWorkflowTransition } from "@/app/lib/workflows/runtime";
import { validateAdmissionRequestInput } from "./validation";

export type AdmissionRequestActionState = {
  success: boolean;
  error: string | null;
};

function getErrorMessage(
  error: { code?: string; message?: string } | unknown,
  operation: "create" | "update" | "transition"
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return "The admission request conflicts with an existing record.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23514"
  ) {
    return "The admission request contains a value that violates the database rules.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  if (operation === "transition") {
    return "Failed to execute the admission workflow transition.";
  }

  return `Failed to ${operation} admission request.`;
}

export async function createAdmissionRequest(
  _previousState: AdmissionRequestActionState,
  formData: FormData
): Promise<AdmissionRequestActionState> {
  try {
    await requirePermission(
      "school.admission_requests.manage"
    );

    const { organizationId } =
      await getOrganizationContext();

    const supabase = await createClient();

    const {
      applicantName,
      applicantGender,
      applicantDateOfBirth,
      requestedAdmissionDate,
      status,
      notes,
    } = validateAdmissionRequestInput(formData);

    const { error } = await supabase.rpc(
      "create_student_admission_with_workflow",
      {
        p_organization_id: organizationId,
        p_applicant_name: applicantName,
        p_applicant_gender: applicantGender,
        p_applicant_date_of_birth: applicantDateOfBirth,
        p_requested_admission_date: requestedAdmissionDate,
        p_status: status,
        p_notes: notes,
        p_metadata: {},
      }
    );

    if (error) {
      return {
        success: false,
        error: getErrorMessage(error, "create"),
      };
    }

    revalidatePath("/school");
    revalidatePath("/school/admissions");

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "create"),
    };
  }
}

export async function updateAdmissionRequest(
  _previousState: AdmissionRequestActionState,
  formData: FormData
): Promise<AdmissionRequestActionState> {
  try {
    await requirePermission(
      "school.admission_requests.manage"
    );

    const { organizationId } =
      await getOrganizationContext();

    const supabase = await createClient();

    const id = String(
      formData.get("id") ?? ""
    ).trim();

    if (!id) {
      return {
        success: false,
        error:
          "Admission request ID is required for an update.",
      };
    }

    const {
      applicantName,
      applicantGender,
      applicantDateOfBirth,
      requestedAdmissionDate,
      status,
      notes,
    } = validateAdmissionRequestInput(formData);

    const { data, error } = await supabase
      .from("student_admission_requests")
      .update({
        applicant_name: applicantName,
        applicant_gender: applicantGender,
        applicant_date_of_birth: applicantDateOfBirth,
        requested_admission_date: requestedAdmissionDate,
        status,
        notes,
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error:
            "Admission request not found or you do not have access to it.",
        };
      }

      return {
        success: false,
        error: getErrorMessage(error, "update"),
      };
    }

    if (!data) {
      return {
        success: false,
        error:
          "Admission request was not updated because the record could not be found.",
      };
    }

    revalidatePath("/school");
    revalidatePath("/school/admissions");

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "update"),
    };
  }
}

export async function executeAdmissionWorkflowTransition(
  formData: FormData
): Promise<void> {
  try {
    await requirePermission(
      "school.admission_requests.manage"
    );

    const workflowInstanceId = String(
      formData.get("workflow_instance_id") ?? ""
    ).trim();

    const workflowTransitionId = String(
      formData.get("workflow_transition_id") ?? ""
    ).trim();

    const transitionCode = String(
      formData.get("workflow_transition_code") ?? ""
    ).trim();

    if (!workflowInstanceId) {
      throw new Error(
        "Workflow instance ID is required."
      );
    }

    if (!workflowTransitionId) {
      throw new Error(
        "Workflow transition ID is required."
      );
    }

    const decisionReason = String(
      formData.get("decision_reason") ?? ""
    ).trim();

    const decisionValidation =
      validateAdmissionDecisionEvidence({
        decisionCode: transitionCode,
        decisionReason,
      });

    if (!decisionValidation.valid) {
      throw new Error(
        decisionValidation.errors.join(" ")
      );
    }

    await executeWorkflowTransition({
      workflowInstanceId,
      workflowTransitionId,
      metadata: {
        source: "student_admissions",
        action:
          transitionCode ||
          "admission_workflow_transition",
        decision:
          decisionValidation.decisionCode,
        decision_reason:
          decisionValidation.decisionReason,
      },
    });

    revalidatePath("/school");
    revalidatePath("/school/admissions");
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "transition")
    );
  }
}

export async function submitAdmissionForReview(
  formData: FormData
): Promise<void> {
  try {
    await requirePermission(
      "school.admission_requests.manage"
    );

    const workflowInstanceId = String(
      formData.get("workflow_instance_id") ?? ""
    ).trim();

    const workflowTransitionId = String(
      formData.get("workflow_transition_id") ?? ""
    ).trim();

    if (!workflowInstanceId) {
      throw new Error("Workflow instance ID is required.");
    }

    if (!workflowTransitionId) {
      throw new Error("Workflow transition ID is required.");
    }

    await executeWorkflowTransition({
      workflowInstanceId,
      workflowTransitionId,
      metadata: {
        source: "student_admissions",
        action: "submit_for_review",
      },
    });

    revalidatePath("/school");
    revalidatePath("/school/admissions");
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "transition")
    );
  }
}
