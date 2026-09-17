"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { validateEnrollmentInput } from "./validation";

export type EnrollmentActionState = {
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
    return "This student is already enrolled in this class for this academic period.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23514"
  ) {
    return "The enrollment contains a value that violates the database rules.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23503"
  ) {
    return "The enrollment references invalid student, class, or academic period data.";
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

  return `Failed to ${operation} enrollment.`;
}

export async function createEnrollment(
  _previousState: EnrollmentActionState,
  formData: FormData
): Promise<EnrollmentActionState> {
  try {
    await requirePermission("school.enrollments.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const {
      studentId,
      classId,
      academicPeriodId,
      enrollmentDate,
      exitDate,
      status,
      notes,
    } = validateEnrollmentInput(formData);

    const { error } = await supabase
      .from("student_enrollments")
      .insert({
        organization_id: organizationId,
        student_id: studentId,
        class_id: classId,
        academic_period_id: academicPeriodId,
        enrollment_date: enrollmentDate,
        exit_date: exitDate,
        status,
        notes,
      });

    if (error) {
      return {
        success: false,
        error: getErrorMessage(error, "create"),
      };
    }

    revalidatePath("/school");
    revalidatePath("/school/enrollments");
    revalidatePath("/school/students");
    revalidatePath("/school/classes");

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

export async function updateEnrollment(
  _previousState: EnrollmentActionState,
  formData: FormData
): Promise<EnrollmentActionState> {
  try {
    await requirePermission("school.enrollments.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return {
        success: false,
        error: "Enrollment ID is required for an update.",
      };
    }

    const {
      studentId,
      classId,
      academicPeriodId,
      enrollmentDate,
      exitDate,
      status,
      notes,
    } = validateEnrollmentInput(formData);

    const { data, error } = await supabase
      .from("student_enrollments")
      .update({
        student_id: studentId,
        class_id: classId,
        academic_period_id: academicPeriodId,
        enrollment_date: enrollmentDate,
        exit_date: exitDate,
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
            "Enrollment not found or you do not have access to it.",
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
          "Enrollment was not updated because the record could not be found.",
      };
    }

    revalidatePath("/school");
    revalidatePath("/school/enrollments");
    revalidatePath("/school/students");
    revalidatePath("/school/classes");

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