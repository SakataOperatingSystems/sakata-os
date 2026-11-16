import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import AutomationVerification from "./verification-client";

export default async function AutomationVerificationPage() {
  await requirePermission("core.automation.read");
  const { organizationId } = await getOrganizationContext();
  const supabase = await createClient();

  const { count: ruleCount } = await supabase
    .from("automation_rules")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  const { count: jobCount } = await supabase
    .from("automation_jobs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  return (
    <div>
      <AutomationVerification />
      <div className="mx-auto -mt-6 max-w-5xl px-6 pb-10">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Automation Rules
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {ruleCount ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Automation Jobs
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {jobCount ?? 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
