"use server";

import { revalidatePath } from "next/cache";
import { requireControlPlaneAccess } from "@/app/lib/auth/authorization";
import { createClient } from "@/app/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function deployOrganizationProduct(
  organizationId: string,
  productCode: string
) {
  await requireControlPlaneAccess();

  if (!UUID_PATTERN.test(organizationId)) {
    throw new Error("A valid organization ID is required.");
  }

  const normalizedCode = productCode.trim();

  if (!normalizedCode || normalizedCode.length > 100) {
    throw new Error("A valid product code is required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "deploy_product_to_organization",
    {
      p_organization_id: organizationId,
      p_product_code: normalizedCode,
    }
  );

  if (error) {
    throw new Error(`Product deployment failed: ${error.message}`);
  }

  const result = data as {
    success?: boolean;
    already_deployed?: boolean;
    organization_product_id?: string;
    product_code?: string;
    product_name?: string;
    active_module_count?: number;
  };

  if (
    !result?.success ||
    !result.organization_product_id ||
    typeof result.active_module_count !== "number"
  ) {
    throw new Error("The deployment operation returned an invalid result.");
  }

  revalidatePath("/control/organizations");
  revalidatePath(`/control/organizations/${organizationId}`);
  revalidatePath("/control/catalog");

  return result;
}
