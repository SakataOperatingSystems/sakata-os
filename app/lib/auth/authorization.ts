import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";

export async function getCurrentPermissions(): Promise<Set<string>> {
  const supabase = await createClient();
  const { membership } = await getOrganizationContext();

  const { data: membershipRoles, error: membershipRolesError } =
    await supabase
      .from("membership_roles")
      .select("role_id")
      .eq("membership_id", membership.id);

  if (membershipRolesError) {
    throw new Error(
      `Failed to load membership roles: ${membershipRolesError.message}`
    );
  }

  const roleIds = membershipRoles.map((row) => row.role_id);

  if (roleIds.length === 0) {
    return new Set();
  }

  const { data: rolePermissions, error: rolePermissionsError } =
    await supabase
      .from("role_permissions")
      .select("permission_id")
      .in("role_id", roleIds);

  if (rolePermissionsError) {
    throw new Error(
      `Failed to load role permissions: ${rolePermissionsError.message}`
    );
  }

  const permissionIds = [
    ...new Set(rolePermissions.map((row) => row.permission_id)),
  ];

  if (permissionIds.length === 0) {
    return new Set();
  }

  const { data: permissions, error: permissionsError } = await supabase
    .from("permissions")
    .select("code")
    .in("id", permissionIds);

  if (permissionsError) {
    throw new Error(
      `Failed to load permissions: ${permissionsError.message}`
    );
  }

  return new Set(permissions.map((permission) => permission.code));
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