"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { validateAcademicPeriodInput } from "./validation";

export type AcademicPeriodActionState = {
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
    return "An academic period with this code or period number already exists for this organization.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23514"
  ) {
    return "The academic period contains a value that violates the database rules.";
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

  return `Failed to ${operation} academic period.`;
}

export async function createAcademicPeriod(
  _previousState: AcademicPeriodActionState,
  formData: FormData
): Promise<AcademicPeriodActionState> {
  try {
    await requirePermission("school.academic_periods.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const {
      name,
      code,
      academicYear,
      periodNumber,
      startDate,
      endDate,
      status,
    } = validateAcademicPeriodInput(formData);

    const { error } = await supabase.from("academic_periods").insert({
      organization_id: organizationId,
      name,
      code,
      academic_year: academicYear,
      period_number: periodNumber,
      start_date: startDate,
      end_date: endDate,
      status,
    });

    if (error) {
      return {
        success: false,
        error: getErrorMessage(error, "create"),
      };
    }

    revalidatePath("/school");
    revalidatePath("/school/academic-periods");

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

export async function updateAcademicPeriod(
  _previousState: AcademicPeriodActionState,
  formData: FormData
): Promise<AcademicPeriodActionState> {
  try {
    await requirePermission("school.academic_periods.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return {
        success: false,
        error: "Academic period ID is required.",
      };
    }

    const {
      name,
      code,
      academicYear,
      periodNumber,
      startDate,
      endDate,
      status,
    } = validateAcademicPeriodInput(formData);

    const { data, error } = await supabase
      .from("academic_periods")
      .update({
        name,
        code,
        academic_year: academicYear,
        period_number: periodNumber,
        start_date: startDate,
        end_date: endDate,
        status,
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
            "Academic period not found or you do not have access to it.",
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
          "Academic period was not updated because the record could not be found.",
      };
    }

    revalidatePath("/school");
    revalidatePath("/school/academic-periods");

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