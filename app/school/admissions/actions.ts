"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { validateAdmissionRequestInput } from "./validation";

export type AdmissionRequestActionState = {
  success: boolean;
  error: string | null;
};

function getErrorMessage(
  error: { code?: string; message?: string } | unknown,
  operation: "create" | "update"
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return "An admission request with this ID already exists in this organization.";
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
      admissionRequestId,
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
        p_admission_request_id: admissionRequestId,
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
      admissionRequestId,
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
        admission_request_id: admissionRequestId,
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
