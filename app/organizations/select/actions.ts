"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { ACTIVE_ORGANIZATION_COOKIE } from "@/app/lib/auth/organization-context";

export async function setActiveOrganization(formData: FormData) {
  const organizationId = String(
    formData.get("organizationId") ?? "",
  ).trim();

  if (!organizationId) {
    redirect("/organizations/select?error=invalid");
  }

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
    .select("id")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/onboarding");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select(`
      id,
      organization_id,
      user_profile_id,
      status,
      organizations (
        id,
        name,
        slug,
        organization_type,
        status
      )
    `)
    .eq("user_profile_id", profile.id)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership) {
    redirect("/organizations/select?error=invalid");
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  if (!organization || organization.status !== "active") {
    redirect("/organizations/select?error=invalid");
  }

  const cookieStore = await cookies();

  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, organization.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/applications");
}
