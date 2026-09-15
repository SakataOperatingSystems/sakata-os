"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import { validateEducationLevel } from "./education-level-validation";

export type EducationLevelActionState = {
  success: boolean;
  message: string;
};

const initialState: EducationLevelActionState = {
  success: false,
  message: "",
};

export async function createEducationLevel(
  _previousState: EducationLevelActionState = initialState,
  formData: FormData
): Promise<EducationLevelActionState> {
  try {
    await requirePermission("school.education_levels.manage");

    const { organization } = await getOrganizationContext();

    const input = validateEducationLevel({
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      displayOrder: String(formData.get("displayOrder") ?? ""),
      status: String(formData.get("status") ?? ""),
    });

    const supabase = await createClient();

    const { error } = await supabase.from("education_levels").insert({
      organization_id: organization.id,
      code: input.code,
      name: input.name,
      display_order: input.displayOrder,
      status: input.status,
    });

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message: "An education level with this code or name already exists.",
        };
      }

      if (error.code === "23514") {
        return {
          success: false,
          message: "The education level contains an invalid value.",
        };
      }

      return {
        success: false,
        message: `Unable to create education level: ${error.message}`,
      };
    }

    revalidatePath("/school/academic-structure");

    return {
      success: true,
      message: "Education level created successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create education level.",
    };
  }
}

export async function updateEducationLevel(
  _previousState: EducationLevelActionState = initialState,
  formData: FormData
): Promise<EducationLevelActionState> {
  try {
    await requirePermission("school.education_levels.manage");

    const { organization } = await getOrganizationContext();

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return {
        success: false,
        message: "Education level ID is required.",
      };
    }

    const input = validateEducationLevel({
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      displayOrder: String(formData.get("displayOrder") ?? ""),
      status: String(formData.get("status") ?? ""),
    });

    const supabase = await createClient();

    const { error } = await supabase
      .from("education_levels")
      .update({
        code: input.code,
        name: input.name,
        display_order: input.displayOrder,
        status: input.status,
      })
      .eq("id", id)
      .eq("organization_id", organization.id);

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message: "An education level with this code or name already exists.",
        };
      }

      if (error.code === "23514") {
        return {
          success: false,
          message: "The education level contains an invalid value.",
        };
      }

      return {
        success: false,
        message: `Unable to update education level: ${error.message}`,
      };
    }

    revalidatePath("/school/academic-structure");

    return {
      success: true,
      message: "Education level updated successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update education level.",
    };
  }
}