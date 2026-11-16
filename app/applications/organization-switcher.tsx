import {
  getAvailableOrganizations,
  getOrganizationContext,
} from "@/app/lib/auth/organization-context";
import { setActiveOrganization } from "@/app/organizations/select/actions";

export default async function OrganizationSwitcher() {
  const [{ organizationId }, { memberships }] = await Promise.all([
    getOrganizationContext(),
    getAvailableOrganizations(),
  ]);

  const activeOrganization = memberships.find(
    ({ organization }) => organization.id === organizationId,
  )?.organization;

  if (!activeOrganization) {
    return null;
  }

  if (memberships.length <= 1) {
    return (
      <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Active Organization
        </div>

        <div className="mt-1 text-sm font-medium text-white">
          {activeOrganization.name}
        </div>

        <div className="mt-1 text-xs text-slate-500">
          {activeOrganization.slug}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
      <div className="mb-3">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Active Organization
        </div>

        <div className="mt-1 text-sm text-slate-400">
          Switch the organization you are operating in.
        </div>
      </div>

      <form action={setActiveOrganization} className="flex flex-col gap-3 sm:flex-row">
        <select
          name="organizationId"
          defaultValue={organizationId}
          required
          className="min-h-10 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-slate-500"
        >
          {memberships.map(({ organization }) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="min-h-10 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-medium text-white transition hover:border-slate-500 hover:bg-slate-700"
        >
          Switch Organization
        </button>
      </form>
    </section>
  );
}
