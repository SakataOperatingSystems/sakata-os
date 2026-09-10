import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";

export async function getCurrentPermissions(): Promise<Set<string>> {
  const supabase = await createClient();

  const { membership, organization } = await getOrganizationContext();

  if (membership.status !== "active") {
    throw new Error("Forbidden: inactive organization membership.");
  }

  if (organization.status !== "active") {
    throw new Error("Forbidden: inactive organization.");
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("membership_roles")
    .select("role_id")
    .eq("membership_id", membership.id);

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
    .eq("organization_id", organization.id)
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