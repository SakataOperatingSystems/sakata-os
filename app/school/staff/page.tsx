import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPermissionsForOrganization,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import { inviteOrganizationStaff, provisionExistingOrganizationStaff } from "./actions";

const SCHOOL_ROLE_CODES = [
  "school_administrator",
  "head_teacher",
  "academic_officer",
  "bursar",
  "teacher",
  "class_teacher",
] as const;

type UserProfile = {
  id: string;
  display_name: string;
  phone: string | null;
  status: string;
};

type Membership = {
  id: string;
  user_profile_id: string;
  status: string;
  joined_at: string;
  user_profiles: UserProfile | UserProfile[] | null;
};

type Role = {
  id: string;
  code: string;
  name: string;
  status: string;
  scope: string;
  organization_id: string | null;
};

type MembershipRole = {
  membership_id: string;
  is_primary: boolean;
  roles: Role | Role[] | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function SchoolStaffPage() {
  const { organization } = await getOrganizationContext();
  const permissions = await getPermissionsForOrganization(organization.id);

  if (!permissions.has("memberships.read")) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <section className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-slate-900 p-6">
          <h1 className="text-2xl font-bold">Staff access diagnostic</h1>
          <p className="mt-3 text-slate-300">
            Your signed-in session reached the staff route, but the organization
            permission resolver did not grant staff directory access.
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            <div><dt className="text-slate-400">Organization</dt><dd>{organization.name}</dd></div>
            <div><dt className="text-slate-400">Organization ID</dt><dd>{organization.id}</dd></div>
            <div><dt className="text-slate-400">Membership ID</dt><dd>{(await getOrganizationContext()).membership.id}</dd></div>
            <div><dt className="text-slate-400">memberships.read</dt><dd>{String(permissions.has("memberships.read"))}</dd></div>
            <div><dt className="text-slate-400">memberships.manage</dt><dd>{String(permissions.has("memberships.manage"))}</dd></div>
          </dl>
          <p className="mt-5 text-xs text-slate-500">
            No staff records or management actions were loaded.
          </p>
        </section>
      </main>
    );
  }

  const canManageMemberships = permissions.has("memberships.manage");
  const supabase = await createClient();

  const { data: rows, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select(`
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
    `)
    .eq("organization_id", organization.id)
    .eq("status", "active")
    .order("joined_at");

  if (membershipsError) {
    throw new Error(
      `Failed to load School OS staff: ${membershipsError.message}`
    );
  }

  const memberships: Membership[] = (rows ?? []).map((membership) => ({
    ...membership,
    user_profiles: membership.user_profiles as
      | UserProfile
      | UserProfile[]
      | null,
  }));

  const membershipIds = memberships.map((membership) => membership.id);

  const rolesByMembership = new Map<
    string,
    Array<{ role: Role; isPrimary: boolean }>
  >();

  if (membershipIds.length > 0) {
    const { data: assignments, error: assignmentsError } = await supabase
      .from("membership_roles")
      .select(`
        membership_id,
        is_primary,
        roles!inner (
          id,
          code,
          name,
          status,
          scope,
          organization_id
        )
      `)
      .in("membership_id", membershipIds);

    if (assignmentsError) {
      throw new Error(
        `Failed to load School OS staff roles: ${assignmentsError.message}`
      );
    }

    for (const assignment of (assignments ?? []) as MembershipRole[]) {
      const role = firstRelation(assignment.roles);

      if (
        !role ||
        role.scope !== "organization" ||
        role.organization_id !== organization.id ||
        !SCHOOL_ROLE_CODES.includes(
          role.code as (typeof SCHOOL_ROLE_CODES)[number]
        )
      ) {
        continue;
      }

      const existing = rolesByMembership.get(assignment.membership_id) ?? [];

      existing.push({
        role,
        isPrimary: assignment.is_primary,
      });

      rolesByMembership.set(assignment.membership_id, existing);
    }
  }

  let availableProfiles: UserProfile[] = [];
  let availableRoles: Role[] = [];

  if (canManageMemberships) {
    const { data: profiles, error: profilesError } = await supabase.rpc(
      "list_provisionable_organization_users",
      {
        p_organization_id: organization.id,
      }
    );

    if (profilesError) {
      throw new Error(
        `Failed to load provisionable staff: ${profilesError.message}`
      );
    }

    availableProfiles = (profiles ?? []) as UserProfile[];

    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select(
        "id, code, name, status, scope, organization_id"
      )
      .eq("status", "active")
      .eq("scope", "organization")
      .eq("organization_id", organization.id)
      .in("code", [...SCHOOL_ROLE_CODES])
      .order("name");

    if (rolesError) {
      throw new Error(
        `Failed to load School OS staff roles: ${rolesError.message}`
      );
    }

    availableRoles = (roles ?? []) as Role[];
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <Link
            href="/school"
            className="text-sm font-semibold text-sky-400 hover:text-sky-300"
          >
            &lt;- School OS
          </Link>

          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-400">
                Administration
              </p>

              <h1 className="mt-3 text-4xl font-bold tracking-tight">
                Staff &amp; Roles
              </h1>

              <p className="mt-3 max-w-3xl text-slate-400">
                Manage the people who operate {organization.name} and assign
                the School OS responsibility appropriate to each role.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Active Staff
              </p>
              <p className="mt-2 text-3xl font-bold">
                {memberships.length}
              </p>
            </div>
          </div>
        </header>

        {canManageMemberships && (
          <section className="mb-8 rounded-2xl border border-sky-500/20 bg-slate-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
              Staff Administration
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Add staff to School OS
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Invite new staff by email or add an existing SAKATA OS user.
              Platform administration roles are never offered here.
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <form
                action={inviteOrganizationStaff.bind(null, organization.id)}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-5"
              >
                <p className="text-sm font-semibold text-white">
                  Invite new staff
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  The staff member will receive an invitation and join this
                  school with the selected School OS role.
                </p>

                <label className="mt-5 block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Email address
                  </span>

                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="staff@school.org"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
                  />
                </label>

                <label className="mt-4 block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    School OS role
                  </span>

                  <select
                    name="role_id"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
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
                  className="mt-5 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                >
                  Send Invitation
                </button>
              </form>

              <form
                action={provisionExistingOrganizationStaff.bind(null, organization.id)}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-5"
              >
                <p className="text-sm font-semibold text-white">
                  Add existing SAKATA user
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Use this when the person already has a SAKATA OS account.
                </p>

                {availableProfiles.length > 0 && availableRoles.length > 0 ? (
                  <>
                    <label className="mt-5 block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Staff member
                      </span>

                      <select
                        name="user_profile_id"
                        required
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
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

                    <label className="mt-4 block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        School OS role
                      </span>

                      <select
                        name="role_id"
                        required
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
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
                      className="mt-5 rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
                    >
                      Add Existing User
                    </button>
                  </>
                ) : (
                  <div className="mt-5 rounded-xl border border-slate-800 p-4">
                    <p className="text-sm text-slate-400">
                      There are no active unassigned SAKATA OS users available
                      for this school.
                    </p>
                  </div>
                )}
              </form>
            </div>
          </section>
        )}

        <section>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              People &amp; Authorization
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Active staff
            </h2>
          </div>

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
                  <div className="flex flex-col justify-between gap-5 lg:flex-row">
                    <div>
                      <h3 className="text-xl font-semibold">
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
                      {roles.length > 0 ? (
                        roles.map(({ role, isPrimary }) => (
                          <span
                            key={role.id}
                            className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300"
                          >
                            {role.name}
                            {isPrimary ? " · Primary" : ""}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                          No School OS role
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}


