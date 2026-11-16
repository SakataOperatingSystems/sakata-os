"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { getPermissionsForOrganization } from "@/app/lib/auth/authorization";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

const SCHOOL_ROLE_CODES = [
  "school_administrator",
  "head_teacher",
  "academic_officer",
  "bursar",
  "teacher",
  "class_teacher",
] as const;

export async function inviteOrganizationStaff(
  organizationId: string,
  formData: FormData
) {
  const { organizationId: currentOrganizationId } =
    await getOrganizationContext();

  if (currentOrganizationId !== organizationId) {
    throw new Error("Organization context mismatch.");
  }

  const permissions = await getPermissionsForOrganization(organizationId);

  if (!permissions.has("memberships.manage")) {
    throw new Error(
      "You do not have permission to manage organization memberships."
    );
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleId = String(formData.get("role_id") ?? "").trim();

  if (!email || !roleId) {
    throw new Error("Email address and School OS role are required.");
  }

  const supabase = await createClient();

  const { data: invitationId, error: invitationError } =
    await supabase.rpc("create_organization_staff_invitation", {
      p_organization_id: organizationId,
      p_role_id: roleId,
      p_email: email,
    });

  if (invitationError) {
    throw new Error(
      `Failed to create staff invitation: ${invitationError.message}`
    );
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, code, name")
    .eq("id", roleId)
    .eq("organization_id", organizationId)
    .eq("scope", "organization")
    .eq("status", "active")
    .in("code", [...SCHOOL_ROLE_CODES])
    .maybeSingle();

  if (roleError || !role) {
    throw new Error("Selected School OS role could not be resolved.");
  }

  const admin = createAdminClient();

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const { error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/callback`,
      data: {
        display_name: email.split("@")[0],
        sakata_invitation_id: invitationId,
        sakata_organization_id: organizationId,
        sakata_role_code: role.code,
      },
    });

  if (inviteError) {
    throw new Error(`Failed to send staff invitation: ${inviteError.message}`);
  }

  revalidatePath("/school");
  revalidatePath("/school/staff");
  revalidatePath("/applications");

  redirect(
    `/school/staff?invited=${encodeURIComponent(
      email
    )}&role=${encodeURIComponent(role.name)}`
  );
}

export async function provisionExistingOrganizationStaff(
  organizationId: string,
  formData: FormData
) {
  const { organizationId: currentOrganizationId } =
    await getOrganizationContext();

  if (currentOrganizationId !== organizationId) {
    throw new Error("Organization context mismatch.");
  }

  const permissions = await getPermissionsForOrganization(organizationId);

  if (!permissions.has("memberships.manage")) {
    throw new Error(
      "You do not have permission to manage organization memberships."
    );
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

  revalidatePath(`/school/staff`);
  revalidatePath("/school");
  revalidatePath("/applications");

  redirect(
    `/school/staff?provisioned=${encodeURIComponent(String(data))}`
  );
}
