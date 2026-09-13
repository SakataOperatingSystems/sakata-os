"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { requirePermission } from "@/app/lib/auth/authorization";

export async function saveConfigurationOverride(
  organizationProductModuleId: string,
  configurationDefinitionId: string,
  value: unknown
) {
  await requirePermission("organization.configuration.manage");

  const supabase = await createClient();
  const { organizationId } = await getOrganizationContext();

  const { data: module, error: moduleError } = await supabase
    .from("organization_product_modules")
    .select(
      `
        id,
        organization_products!inner (
          organization_id,
          status
        )
      `
    )
    .eq("id", organizationProductModuleId)
    .eq("organization_products.organization_id", organizationId)
    .eq("organization_products.status", "active")
    .maybeSingle();

  if (moduleError) {
    throw new Error(
      `Failed to verify organization module: ${moduleError.message}`
    );
  }

  if (!module) {
    throw new Error("Organization module was not found or is not active.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("organization_module_configurations")
    .select("id")
    .eq("organization_product_module_id", organizationProductModuleId)
    .eq("configuration_definition_id", configurationDefinitionId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Failed to check existing configuration: ${existingError.message}`
    );
  }

  if (existing) {
    const { error } = await supabase
      .from("organization_module_configurations")
      .update({
        value,
        status: "active",
        configured_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Failed to update configuration: ${error.message}`);
    }
  } else {
    const { error } = await supabase
      .from("organization_module_configurations")
      .insert({
        organization_product_module_id: organizationProductModuleId,
        configuration_definition_id: configurationDefinitionId,
        value,
        status: "active",
        configured_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to create configuration: ${error.message}`);
    }
  }

  revalidatePath("/control/configuration");

  return { success: true };
}