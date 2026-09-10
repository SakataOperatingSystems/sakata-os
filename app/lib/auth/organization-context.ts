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
    .maybeSingle();

  if (profileError) {
    throw new Error(
      `Failed to load user profile: ${profileError.message}`
    );
  }

  if (!profile) {
    throw new Error("Authenticated user does not have a user profile.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select(
      "id, organization_id, user_profile_id, status, joined_at"
    )
    .eq("user_profile_id", profile.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Failed to load organization membership: ${membershipError.message}`
    );
  }

  if (!membership) {
    throw new Error(
      "Authenticated user does not have an active organization membership."
    );
  }

  return {
    user,
    profile,
    membership,
    organizationId: membership.organization_id,
  };
}