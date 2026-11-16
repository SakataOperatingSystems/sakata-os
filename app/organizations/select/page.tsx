import { getAvailableOrganizations } from "@/app/lib/auth/organization-context";
import { setActiveOrganization } from "./actions";

export default async function OrganizationSelectPage() {
  const { memberships } = await getAvailableOrganizations();

  if (memberships.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-semibold">No active organization</h1>
          <p className="mt-3 text-sm text-slate-400">
            Your account does not currently have an active organization
            membership.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            SAKATA OS
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Choose your organization
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            Select the organization you want to operate in. Your organization
            determines the applications, permissions, and data available to
            you.
          </p>
        </div>

        <div className="grid gap-4">
          {memberships.map(({ membership, organization }) => (
            <form key={membership.id} action={setActiveOrganization}>
              <input
                type="hidden"
                name="organizationId"
                value={organization.id}
              />

              <button
                type="submit"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-slate-600 hover:bg-slate-800"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-medium">
                      {organization.name}
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      {organization.slug}
                    </div>
                  </div>

                  <div className="text-xs uppercase tracking-wider text-slate-500">
                    {organization.organization_type}
                  </div>
                </div>
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
