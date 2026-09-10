import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export async function getOrganizationContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, auth_user_id, display_name, phone, status")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (profileError) {
    throw new Error(
      `Failed to load active user profile: ${profileError.message}`
    );
  }

  if (!profile) {
    throw new Error(
      "Authenticated user does not have an active user profile."
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select(
      `
        id,
        organization_id,
        user_profile_id,
        status,
        joined_at,
        organizations (
          id,
          name,
          slug,
          organization_type,
          status
        )
      `
    )
    .eq("user_profile_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Failed to load active organization membership: ${membershipError.message}`
    );
  }

  if (!membership) {
    throw new Error(
      "Authenticated user does not have an active organization membership."
    );
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  if (!organization) {
    throw new Error(
      "Active organization membership does not reference an organization."
    );
  }

  if (organization.status !== "active") {
    throw new Error(
      "The user's organization is not active."
    );
  }

  return {
    user,
    profile,
    membership,
    organization,
    organizationId: membership.organization_id,
  };
}