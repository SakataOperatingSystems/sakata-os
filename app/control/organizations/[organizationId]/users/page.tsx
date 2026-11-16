import Link from "next/link";
import { notFound } from "next/navigation";

import { getPermissionsForOrganization } from "@/app/lib/auth/authorization";
import { createClient } from "@/app/lib/supabase/server";
import { provisionOrganizationMember } from "./actions";

type UserProfile = {
  id: string;
  display_name: string;
  phone: string | null;
  status: string;
};

type OrganizationMembership = {
  id: string;
  user_profile_id: string;
  status: string;
  joined_at: string;
  user_profiles: UserProfile | UserProfile[] | null;
};

type AssignedRole = {
  id: string;
  code: string;
  name: string;
  scope: string;
  status: string;
  organization_id: string | null;
};

type MembershipRole = {
  membership_id: string;
  is_primary: boolean;
  roles: AssignedRole | AssignedRole[] | null;
};

type PageProps = {
  params: Promise<{ organizationId: string }>;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function OrganizationUsersPage({ params }: PageProps) {
  const { organizationId } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      organizationId
    )
  ) {
    notFound();
  }

  const permissions = await getPermissionsForOrganization(organizationId);

  if (!permissions.has("memberships.read")) {
    notFound();
  }

  const canManageMemberships = permissions.has("memberships.manage");
  const supabase = await createClient();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, organization_type, status")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    throw new Error(
      `Failed to load organization for membership governance: ${organizationError.message}`
    );
  }

  if (!organization || organization.status !== "active") {
    notFound();
  }

  const { data: rows, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select(
      `
        id,
        user_profile_id,
        status,
        joined_at,
        user_profiles!inner (
          id,
          display_name,
          phone,
          status
        )
      `
    )
    .eq("organization_id", organization.id)
    .eq("status", "active")
    .order("joined_at");

  if (membershipsError) {
    throw new Error(
      `Failed to load active organization memberships: ${membershipsError.message}`
    );
  }

  const memberships: OrganizationMembership[] = (rows ?? []).map(
    (membership) => ({
      ...membership,
      user_profiles: membership.user_profiles as
        | UserProfile
        | UserProfile[]
        | null,
    })
  );

  const membershipIds = memberships.map((membership) => membership.id);

  const rolesByMembership = new Map<
    string,
    Array<{ role: AssignedRole; isPrimary: boolean }>
  >();

  if (membershipIds.length > 0) {
    const { data: assignments, error: assignmentsError } = await supabase
      .from("membership_roles")
      .select(
        `
          membership_id,
          is_primary,
          roles!inner (
            id,
            code,
            name,
            scope,
            status,
            organization_id
          )
        `
      )
      .in("membership_id", membershipIds);

    if (assignmentsError) {
      throw new Error(
        `Failed to load organization membership roles: ${assignmentsError.message}`
      );
    }

    for (const assignment of (assignments ?? []) as MembershipRole[]) {
      const role = firstRelation(assignment.roles);

      if (
        !role ||
        role.scope !== "organization" ||
        role.organization_id !== organization.id
      ) {
        continue;
      }

      const existingRoles =
        rolesByMembership.get(assignment.membership_id) ?? [];

      existingRoles.push({
        role,
        isPrimary: assignment.is_primary,
      });

      rolesByMembership.set(assignment.membership_id, existingRoles);
    }
  }

  let availableProfiles: UserProfile[] = [];
  let availableRoles: AssignedRole[] = [];

  if (canManageMemberships) {
    const { data: profiles, error: profilesError } = await supabase.rpc(
      "list_provisionable_organization_users",
      {
        p_organization_id: organization.id,
      }
    );

    if (profilesError) {
      throw new Error(
        `Failed to load provisionable user profiles: ${profilesError.message}`
      );
    }

    availableProfiles = (profiles ?? []) as UserProfile[];

    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, code, name, scope, status, organization_id")
      .eq("status", "active")
      .eq("scope", "organization")
      .eq("organization_id", organization.id)
      .order("name");

    if (rolesError) {
      throw new Error(
        `Failed to load organization roles: ${rolesError.message}`
      );
    }

    availableRoles = (roles ?? []) as AssignedRole[];
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
      <aside className="mb-8 lg:sticky lg:top-6 lg:mb-0 lg:self-start">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="px-3 pb-4 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
              SAKATA OS
            </p>
            <p className="mt-1 text-xs text-slate-500">
              System Control Plane
            </p>
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Organization
            </p>

            <Link
              href="/control/organizations"
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Organizations
            </Link>

            <Link
              href={`/control/organizations/${organization.id}`}
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              {organization.name}
            </Link>

            <Link
              href={`/control/organizations/${organization.id}/users`}
              className="block rounded-xl bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white"
              aria-current="page"
            >
              Users &amp; Roles
            </Link>
          </div>
        </div>
      </aside>

      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-10">
          <Link
            href={`/control/organizations/${organization.id}`}
            className="text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
          >
            &lt;- {organization.name}
          </Link>

          <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400">
                Organization Governance
              </p>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Users &amp; Roles
              </h1>

              <p className="mt-3 text-slate-400">
                Identity, membership, and organization authorization for{" "}
                {organization.name}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Active Members
              </p>

              <p className="mt-2 text-3xl font-bold">{memberships.length}</p>
            </div>
          </div>
        </header>

        {canManageMemberships && (
          <section
            className="mb-8 rounded-2xl border border-emerald-500/20 bg-slate-900 p-6"
            aria-label="Provision organization member"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Membership Administration
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Provision a member
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Select an active SAKATA OS user who is not currently a member of
              this organization, then assign an active organization role.
              Authentication alone does not grant organization access.
            </p>

            {availableProfiles.length > 0 && availableRoles.length > 0 ? (
              <form
                action={provisionOrganizationMember.bind(
                  null,
                  organization.id
                )}
                className="mt-6 grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end"
              >
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    User
                  </span>

                  <select
                    name="user_profile_id"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                  >
                    <option value="">Select active user</option>

                    {availableProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.display_name}
                        {profile.phone ? ` — ${profile.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Organization role
                  </span>

                  <select
                    name="role_id"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                  >
                    <option value="">Select role</option>

                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Provision Member
                </button>
              </form>
            ) : (
              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-300">
                  {availableProfiles.length === 0
                    ? "There are no active unassigned user profiles available for this organization."
                    : "There are no active organization roles available for assignment."}
                </p>
              </div>
            )}
          </section>
        )}

        <section
          className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
          aria-label="Membership management permissions"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Access Requirements
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Organization membership permissions
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="font-mono text-sm text-emerald-300">
                memberships.read
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Required to view this organization&apos;s members and roles.
              </p>

              <p className="mt-2 text-xs font-semibold text-emerald-300">
                Granted
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="font-mono text-sm text-slate-300">
                memberships.manage
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Required to provision and manage organization memberships.
              </p>

              <p
                className={`mt-2 text-xs font-semibold ${
                  canManageMemberships
                    ? "text-emerald-300"
                    : "text-amber-300"
                }`}
              >
                {canManageMemberships ? "Granted" : "Not granted"}
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Active organization members">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Identity &amp; Authorization
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Active memberships
            </h2>
          </div>

          {memberships.length > 0 ? (
            <div className="space-y-4">
              {memberships.map((membership) => {
                const profile = firstRelation(membership.user_profiles);

                if (!profile) {
                  return null;
                }

                const roles =
                  rolesByMembership.get(membership.id) ?? [];

                return (
                  <article
                    key={membership.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                  >
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-100">
                          {profile.display_name}
                        </h3>

                        {profile.phone && (
                          <p className="mt-1 text-sm text-slate-400">
                            {profile.phone}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-slate-500">
                          Joined{" "}
                          {new Date(
                            membership.joined_at
                          ).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold capitalize text-emerald-300">
                          Membership: {membership.status}
                        </span>

                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold capitalize text-slate-300">
                          Profile: {profile.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-800 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Assigned organization roles
                      </p>

                      {roles.length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {roles.map(({ role, isPrimary }) => (
                            <li
                              key={role.id}
                              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                            >
                              <span className="text-sm font-medium text-slate-200">
                                {role.name}
                              </span>

                              {isPrimary && (
                                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                                  Primary
                                </span>
                              )}

                              <span
                                className={`ml-2 text-xs capitalize ${
                                  role.status === "active"
                                    ? "text-emerald-300"
                                    : "text-slate-500"
                                }`}
                              >
                                {role.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">
                          No organization roles are assigned.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-slate-300">
                There are no active memberships for this organization.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

