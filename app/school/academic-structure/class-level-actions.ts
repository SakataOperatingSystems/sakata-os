"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import { validateClassLevelInput } from "./class-level-validation";

export type ClassLevelActionState = {
  success: boolean;
  message: string;
};

const initialState: ClassLevelActionState = {
  success: false,
  message: "",
};

export async function createClassLevel(
  _previousState: ClassLevelActionState = initialState,
  formData: FormData
): Promise<ClassLevelActionState> {
  try {
    await requirePermission("school.class_levels.manage");

    const { organization } = await getOrganizationContext();

    const input = validateClassLevelInput({
      educationLevelId: String(formData.get("educationLevelId") ?? ""),
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      displayOrder: String(formData.get("displayOrder") ?? ""),
      status: String(formData.get("status") ?? ""),
    });

    const supabase = await createClient();

    const { error } = await supabase.from("class_levels").insert({
      organization_id: organization.id,
      education_level_id: input.educationLevelId,
      code: input.code,
      name: input.name,
      display_order: input.displayOrder,
      status: input.status,
    });

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message: "A class level with this code or name already exists.",
        };
      }

      if (error.code === "23514") {
        return {
          success: false,
          message: "The class level contains an invalid value.",
        };
      }

      return {
        success: false,
        message: `Unable to create class level: ${error.message}`,
      };
    }

    revalidatePath("/school/academic-structure");

    return {
      success: true,
      message: "Class level created successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create class level.",
    };
  }
}

export async function updateClassLevel(
  _previousState: ClassLevelActionState = initialState,
  formData: FormData
): Promise<ClassLevelActionState> {
  try {
    await requirePermission("school.class_levels.manage");

    const { organization } = await getOrganizationContext();

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return {
        success: false,
        message: "Class level ID is required.",
      };
    }

    const input = validateClassLevelInput({
      educationLevelId: String(formData.get("educationLevelId") ?? ""),
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      displayOrder: String(formData.get("displayOrder") ?? ""),
      status: String(formData.get("status") ?? ""),
    });

    const supabase = await createClient();

    const { error } = await supabase
      .from("class_levels")
      .update({
        education_level_id: input.educationLevelId,
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
          message: "A class level with this code or name already exists.",
        };
      }

      if (error.code === "23514") {
        return {
          success: false,
          message: "The class level contains an invalid value.",
        };
      }

      return {
        success: false,
        message: `Unable to update class level: ${error.message}`,
      };
    }

    revalidatePath("/school/academic-structure");

    return {
      success: true,
      message: "Class level updated successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update class level.",
    };
  }
}