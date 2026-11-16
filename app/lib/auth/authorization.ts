import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { redirect } from "next/navigation";

export const CONTROL_PLANE_ACCESS_PERMISSION = "platform.control.read";

async function getPermissionsForMembership(
  membershipId: string,
  organizationId: string
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data: assignments, error: assignmentsError } = await supabase
    .from("membership_roles")
    .select("role_id")
    .eq("membership_id", membershipId);

  if (assignmentsError) {
    throw new Error(
      `Failed to load membership roles: ${assignmentsError.message}`
    );
  }

  if (!assignments || assignments.length === 0) {
    return new Set<string>();
  }

  const roleIds = assignments.map((assignment) => assignment.role_id);

  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id, organization_id, scope, status")
    .in("id", roleIds)
    .eq("organization_id", organizationId)
    .eq("scope", "organization")
    .eq("status", "active");

  if (rolesError) {
    throw new Error(
      `Failed to load organization roles: ${rolesError.message}`
    );
  }

  if (!roles || roles.length === 0) {
    return new Set<string>();
  }

  const validRoleIds = roles.map((role) => role.id);

  const { data: rolePermissions, error: rolePermissionsError } =
    await supabase
      .from("role_permissions")
      .select("permission_id")
      .in("role_id", validRoleIds);

  if (rolePermissionsError) {
    throw new Error(
      `Failed to load role permissions: ${rolePermissionsError.message}`
    );
  }

  if (!rolePermissions || rolePermissions.length === 0) {
    return new Set<string>();
  }

  const permissionIds = rolePermissions.map(
    (rolePermission) => rolePermission.permission_id
  );

  const { data: permissions, error: permissionsError } = await supabase
    .from("permissions")
    .select("id, code")
    .in("id", permissionIds);

  if (permissionsError) {
    throw new Error(
      `Failed to load permissions: ${permissionsError.message}`
    );
  }

  const permissionSet = new Set<string>();

  for (const permission of permissions ?? []) {
    permissionSet.add(permission.code);
  }

  return permissionSet;
}

export async function getCurrentPermissions(): Promise<Set<string>> {
  const { membership, organization } = await getOrganizationContext();

  if (membership.status !== "active") {
    throw new Error("Forbidden: inactive organization membership.");
  }

  if (organization.status !== "active") {
    throw new Error("Forbidden: inactive organization.");
  }

  return getPermissionsForMembership(membership.id, organization.id);
}

export async function getPermissionsForOrganization(
  organizationId: string
): Promise<Set<string>> {
  const { profile } = await getOrganizationContext();
  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select(
      `
        id,
        organizations!inner (
          status
        )
      `
    )
    .eq("user_profile_id", profile.id)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Failed to resolve organization authorization: ${membershipError.message}`
    );
  }

  const organization = Array.isArray(membership?.organizations)
    ? membership.organizations[0]
    : membership?.organizations;

  if (!membership || organization?.status !== "active") {
    return new Set<string>();
  }

  return getPermissionsForMembership(membership.id, organizationId);
}

export async function hasPermission(
  permissionCode: string
): Promise<boolean> {
  const permissions = await getCurrentPermissions();

  return permissions.has(permissionCode);
}

export async function requirePermission(
  permissionCode: string
): Promise<void> {
  const allowed = await hasPermission(permissionCode);

  if (!allowed) {
    throw new Error(`Forbidden: missing permission ${permissionCode}`);
  }
}

export async function getPlatformControlPlaneAccess(): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_current_platform_control_access",
  );

  return !error && data === true;
}
export async function hasControlPlaneAccess(): Promise<boolean> {
  return getPlatformControlPlaneAccess();
}

export async function requireControlPlaneAccess(): Promise<void> {
  if (!(await hasControlPlaneAccess())) {
    redirect("/applications");
  }
}
export async function hasActiveProductDeployment(
  productCode: string
): Promise<boolean> {
  const supabase = await createClient();
  const { organizationId } = await getOrganizationContext();

  const { data: deployment, error } = await supabase
    .from("organization_products")
    .select(
      `
        id,
        product_definitions!inner (
          code,
          status
        )
      `
    )
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .eq("product_definitions.code", productCode)
    .eq("product_definitions.status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to verify active ${productCode} deployment: ${error.message}`
    );
  }

  return Boolean(deployment);
}
