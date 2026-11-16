"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { emitPlatformEvent } from "@/app/lib/events/emitter";
import { validateStudentInput } from "./validation";

export type StudentActionState = {
  success: boolean;
  error: string | null;
  studentId?: string | null;
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
    return "A student with this identity already exists in this organization.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23514"
  ) {
    return "The student contains a value that violates the database rules.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23503"
  ) {
    return "The student references invalid organization data.";
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

  return `Failed to ${operation} student.`;
}

export async function createStudent(
  _previousState: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  try {
    await requirePermission("school.students.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const {
      fullName,
      gender,
      dateOfBirth,
      admissionDate,
      nin,
      status,
      welfareStatus,
      location,
      notes,
    } = validateStudentInput(formData);

    const { data: student, error } = await supabase
      .from("students")
      .insert({
        organization_id: organizationId,
        full_name: fullName,
        gender,
        date_of_birth: dateOfBirth,
        admission_date: admissionDate,
        nin,
        status,
        welfare_status: welfareStatus,
        location,
        notes,
      })
      .select("id, student_id, full_name")
      .single();

    if (error) {
      return {
        success: false,
        error: getErrorMessage(error, "create"),
        studentId: null,
      };
    }

    if (!student) {
      return {
        success: false,
        error: "Student was not created because no record was returned.",
        studentId: null,
      };
    }

    await emitPlatformEvent({
      organizationId,
      eventType: "student.created",
      entityType: "student",
      entityId: student.id,
      payload: {
        student_id: student.student_id,
        full_name: student.full_name,
      },
    });

    revalidatePath("/school");
    revalidatePath("/school/students");

    return {
      success: true,
      error: null,
      studentId: student.student_id,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "create"),
      studentId: null,
    };
  }
}

export async function updateStudent(
  _previousState: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  try {
    await requirePermission("school.students.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return {
        success: false,
        error: "Student record is required for an update.",
        studentId: null,
      };
    }

    const {
      fullName,
      gender,
      dateOfBirth,
      admissionDate,
      nin,
      status,
      welfareStatus,
      location,
      notes,
    } = validateStudentInput(formData);

    const { data, error } = await supabase
      .from("students")
      .update({
        full_name: fullName,
        gender,
        date_of_birth: dateOfBirth,
        admission_date: admissionDate,
        nin,
        status,
        welfare_status: welfareStatus,
        location,
        notes,
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select("id, student_id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Student not found or you do not have access to it.",
          studentId: null,
        };
      }

      return {
        success: false,
        error: getErrorMessage(error, "update"),
        studentId: null,
      };
    }

    if (!data) {
      return {
        success: false,
        error:
          "Student was not updated because the record could not be found.",
        studentId: null,
      };
    }

    revalidatePath("/school");
    revalidatePath("/school/students");

    return {
      success: true,
      error: null,
      studentId: data.student_id,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "update"),
      studentId: null,
    };
  }
}
