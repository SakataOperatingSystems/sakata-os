"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { validateAttendanceInput } from "./validation";

export type AttendanceActionState = {
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
    return "Attendance has already been recorded for this enrollment on this date.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23514"
  ) {
    return "The attendance record contains a value that violates the database rules.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23503"
  ) {
    return "The attendance record references an invalid enrollment.";
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

  return `Failed to ${operation} attendance.`;
}

export async function createAttendance(
  _previousState: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  try {
    await requirePermission("school.attendance.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const {
      enrollmentId,
      attendanceDate,
      status,
      notes,
    } = validateAttendanceInput(formData);

    const { error } = await supabase
      .from("student_attendance")
      .insert({
        organization_id: organizationId,
        enrollment_id: enrollmentId,
        attendance_date: attendanceDate,
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
    revalidatePath("/school/attendance");
    revalidatePath("/school/enrollments");
    revalidatePath("/school/students");

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

export async function updateAttendance(
  _previousState: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  try {
    await requirePermission("school.attendance.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return {
        success: false,
        error: "Attendance ID is required for an update.",
      };
    }

    const {
      enrollmentId,
      attendanceDate,
      status,
      notes,
    } = validateAttendanceInput(formData);

    const { data, error } = await supabase
      .from("student_attendance")
      .update({
        enrollment_id: enrollmentId,
        attendance_date: attendanceDate,
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
            "Attendance record not found or you do not have access to it.",
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
          "Attendance was not updated because the record could not be found.",
      };
    }

    revalidatePath("/school");
    revalidatePath("/school/attendance");
    revalidatePath("/school/enrollments");
    revalidatePath("/school/students");

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
