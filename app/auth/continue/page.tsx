import { createClient } from "@/app/lib/supabase/server";
import { getPlatformControlPlaneAccess } from "@/app/lib/auth/authorization";
import ContinueRedirect from "./continue-redirect";

export default async function ContinueAfterAuthenticationPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return <ContinueRedirect destination="/login" />;
  }

  await supabase.rpc("accept_organization_staff_invitation");

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (profileError) {
    throw new Error(
      `Failed to resolve authenticated user profile: ${profileError.message}`
    );
  }

  if (!profile) {
    return <ContinueRedirect destination="/onboarding" />;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select(
      `
        id,
        organizations (
          id,
          status
        )
      `
    )
    .eq("user_profile_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Failed to resolve active organization membership: ${membershipError.message}`
    );
  }

  const organization = Array.isArray(membership?.organizations)
    ? membership.organizations[0]
    : membership?.organizations;

  if (!membership || organization?.status !== "active") {
    return <ContinueRedirect destination="/onboarding" />;
  }

  const destination = (await getPlatformControlPlaneAccess())
    ? "/control"
    : "/applications";

  return <ContinueRedirect destination={destination} />;
}


