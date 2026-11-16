"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPermissionsForOrganization } from "@/app/lib/auth/authorization";
import { createClient } from "@/app/lib/supabase/server";

export async function provisionOrganizationMember(
  organizationId: string,
  formData: FormData
) {
  const permissions = await getPermissionsForOrganization(organizationId);

  if (!permissions.has("memberships.manage")) {
    throw new Error("You do not have permission to manage organization memberships.");
  }

  const userProfileId = String(formData.get("user_profile_id") ?? "").trim();
  const roleId = String(formData.get("role_id") ?? "").trim();

  if (!userProfileId || !roleId) {
    throw new Error("User profile and organization role are required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "provision_organization_member",
    {
      p_organization_id: organizationId,
      p_user_profile_id: userProfileId,
      p_role_id: roleId,
    }
  );

  if (error) {
    throw new Error(`Failed to provision organization member: ${error.message}`);
  }

  revalidatePath(`/control/organizations/${organizationId}/users`);
  revalidatePath("/applications");

  redirect(
    `/control/organizations/${organizationId}/users?provisioned=${encodeURIComponent(
      String(data)
    )}`
  );
}
