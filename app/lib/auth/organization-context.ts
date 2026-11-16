import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export const ACTIVE_ORGANIZATION_COOKIE = "sakata-active-organization";

type Organization = {
  id: string;
  name: string;
  slug: string;
  organization_type: string;
  status: string;
};

type OrganizationMembership = {
  id: string;
  organization_id: string;
  user_profile_id: string;
  status: string;
  joined_at: string;
  organizations: Organization | Organization[] | null;
};

function normalizeOrganization(
  organizations: Organization | Organization[] | null,
): Organization | null {
  if (Array.isArray(organizations)) {
    return organizations[0] ?? null;
  }

  return organizations;
}

async function getAuthenticatedProfile() {
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
      `Failed to load authenticated user profile: ${profileError.message}`,
    );
  }

  if (!profile) {
    redirect("/onboarding");
  }

  return {
    supabase,
    user,
    profile,
  };
}

async function getActiveMemberships(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
): Promise<OrganizationMembership[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select(`
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
    `)
    .eq("user_profile_id", profileId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  if (membershipError) {
    throw new Error(
      `Failed to load organization memberships: ${membershipError.message}`,
    );
  }

  return (memberships ?? []) as OrganizationMembership[];
}

export async function getAvailableOrganizations() {
  const { supabase, user, profile } = await getAuthenticatedProfile();

  const memberships = await getActiveMemberships(supabase, profile.id);

  return {
    user,
    profile,
    memberships: memberships
      .map((membership) => ({
        membership,
        organization: normalizeOrganization(membership.organizations),
      }))
      .filter(
        (
          item,
        ): item is {
          membership: OrganizationMembership;
          organization: Organization;
        } =>
          item.organization !== null && item.organization.status === "active",
      ),
  };
}

export async function getOrganizationContext() {
  const { supabase, user, profile } = await getAuthenticatedProfile();

  const memberships = await getActiveMemberships(supabase, profile.id);

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  /*
   * A single active membership is unambiguous.
   *
   * Do not write a cookie here. Server Components cannot safely mutate
   * response cookies during ordinary rendering.
   */
  if (memberships.length === 1) {
    const membership = memberships[0];
    const organization = normalizeOrganization(membership.organizations);

    if (!organization || organization.status !== "active") {
      redirect("/onboarding");
    }

    return {
      user,
      profile,
      membership,
      organization,
      organizationId: membership.organization_id,
    };
  }

  /*
   * Multiple active organizations require an explicit active-organization
   * selection. The cookie is only a selection hint; the membership above
   * has already been loaded from the authenticated user's database records.
   */
  const cookieStore = await cookies();
  const selectedOrganizationId = cookieStore.get(
    ACTIVE_ORGANIZATION_COOKIE,
  )?.value;

  const membership = selectedOrganizationId
    ? memberships.find(
        (candidate) =>
          candidate.organization_id === selectedOrganizationId,
      )
    : undefined;

  if (!membership) {
    redirect("/organizations/select");
  }

  const organization = normalizeOrganization(membership.organizations);

  if (!organization || organization.status !== "active") {
    redirect("/organizations/select");
  }

  return {
    user,
    profile,
    membership,
    organization,
    organizationId: membership.organization_id,
  };
}
