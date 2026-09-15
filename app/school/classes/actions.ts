"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { validateClassInput } from "./validation";

export type ClassActionState = {
  success: boolean;
  error: string | null;
};

type AcademicStructureSelection = {
  educationLevel: {
    id: string;
    code: string;
    name: string;
  };
  classLevel: {
    id: string;
    code: string;
    name: string;
    education_level_id: string;
  };
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
    return "A class with this name or code already exists for this academic period.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23514"
  ) {
    return "The class contains a value that violates the database rules.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23503"
  ) {
    return "The selected academic structure or academic period is invalid for this organization.";
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

  return `Failed to ${operation} class.`;
}

async function resolveAcademicStructure(
  organizationId: string,
  educationLevelId: string,
  classLevelId: string
): Promise<AcademicStructureSelection> {
  const supabase = await createClient();

  const [
    { data: educationLevel, error: educationLevelError },
    { data: classLevel, error: classLevelError },
  ] = await Promise.all([
    supabase
      .from("education_levels")
      .select("id, code, name")
      .eq("id", educationLevelId)
      .eq("organization_id", organizationId)
      .maybeSingle(),

    supabase
      .from("class_levels")
      .select("id, code, name, education_level_id")
      .eq("id", classLevelId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  if (educationLevelError) {
    throw new Error(
      `Failed to verify education level: ${educationLevelError.message}`
    );
  }

  if (classLevelError) {
    throw new Error(
      `Failed to verify class level: ${classLevelError.message}`
    );
  }

  if (!educationLevel) {
    throw new Error(
      "The selected education level does not belong to this organization."
    );
  }

  if (!classLevel) {
    throw new Error(
      "The selected class level does not belong to this organization."
    );
  }

  if (classLevel.education_level_id !== educationLevel.id) {
    throw new Error(
      "The selected class level does not belong to the selected education level."
    );
  }

  return {
    educationLevel,
    classLevel,
  };
}

export async function createClass(
  _previousState: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  try {
    await requirePermission("school.classes.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const {
      name,
      code,
      educationLevelId,
      classLevelId,
      stream,
      status,
    } = validateClassInput(formData);

    const academicPeriodId = String(
      formData.get("academic_period_id") ?? ""
    ).trim();

    if (!academicPeriodId) {
      return {
        success: false,
        error: "Academic period is required.",
      };
    }

    const { educationLevel, classLevel } =
      await resolveAcademicStructure(
        organizationId,
        educationLevelId,
        classLevelId
      );

    const { error } = await supabase.from("classes").insert({
      organization_id: organizationId,
      academic_period_id: academicPeriodId,

      name,
      code,

      education_level_id: educationLevel.id,
      class_level_id: classLevel.id,

      // Temporary compatibility fields during normalization transition.
      education_level: educationLevel.name,
      class_level: classLevel.name,

      stream,
      status,
    });

    if (error) {
      return {
        success: false,
        error: getErrorMessage(error, "create"),
      };
    }

    revalidatePath("/school");
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

export async function updateClass(
  _previousState: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  try {
    await requirePermission("school.classes.manage");

    const { organizationId } = await getOrganizationContext();
    const supabase = await createClient();

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return {
        success: false,
        error: "Class ID is required.",
      };
    }

    const {
      name,
      code,
      educationLevelId,
      classLevelId,
      stream,
      status,
    } = validateClassInput(formData);

    const academicPeriodId = String(
      formData.get("academic_period_id") ?? ""
    ).trim();

    if (!academicPeriodId) {
      return {
        success: false,
        error: "Academic period is required.",
      };
    }

    const { educationLevel, classLevel } =
      await resolveAcademicStructure(
        organizationId,
        educationLevelId,
        classLevelId
      );

    const { data, error } = await supabase
      .from("classes")
      .update({
        academic_period_id: academicPeriodId,

        name,
        code,

        education_level_id: educationLevel.id,
        class_level_id: classLevel.id,

        // Temporary compatibility fields during normalization transition.
        education_level: educationLevel.name,
        class_level: classLevel.name,

        stream,
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
          error: "Class not found or you do not have access to it.",
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
          "Class was not updated because the record could not be found.",
      };
    }

    revalidatePath("/school");
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