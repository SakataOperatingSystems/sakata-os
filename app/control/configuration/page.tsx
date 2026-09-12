import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";

type ConfigurationRow = {
  configuration_definition_id: string;
  module_code: string;
  configuration_code: string;
  value_type: string;
  effective_value: unknown;
  value_source: string;
  is_required: boolean;
};

type ModuleDefinition = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export default async function ConfigurationCenterPage() {
  await requirePermission("organization.read");

  const context = await getOrganizationContext();
  const supabase = await createClient();

  const { data: schoolProduct, error: schoolProductError } =
    await supabase
      .from("organization_products")
      .select("id, product_definition_id")
      .eq("organization_id", context.organization.id)
      .eq("status", "active")
      .eq(
        "product_definition_id",
        (
          await supabase
            .from("product_definitions")
            .select("id")
            .eq("code", "school_os")
            .eq("status", "active")
            .maybeSingle()
        ).data?.id ?? ""
      )
      .maybeSingle();

  if (schoolProductError) {
    throw new Error(
      `Failed to load active School OS product: ${schoolProductError.message}`
    );
  }

  if (!schoolProduct) {
    throw new Error("School OS is not active for this organization.");
  }

  const { data: organizationProductModules, error: modulesError } =
    await supabase
      .from("organization_product_modules")
      .select("id, product_module_id")
      .eq("organization_product_id", schoolProduct.id)
      .eq("status", "active")
      .order("created_at");

  if (modulesError) {
    throw new Error(
      `Failed to load active School OS modules: ${modulesError.message}`
    );
  }

  const configurationRows: ConfigurationRow[] = [];

  for (const organizationProductModule of organizationProductModules ?? []) {
    const { data: productModule, error: productModuleError } =
      await supabase
        .from("product_modules")
        .select("id, module_definition_id")
        .eq("id", organizationProductModule.product_module_id)
        .eq("status", "active")
        .maybeSingle();

    if (productModuleError) {
      throw new Error(
        `Failed to load product module: ${productModuleError.message}`
      );
    }

    if (!productModule) {
      continue;
    }

    const { data: moduleDefinition, error: moduleDefinitionError } =
      await supabase
        .from("module_definitions")
        .select("id, code, name, status")
        .eq("id", productModule.module_definition_id)
        .eq("status", "active")
        .maybeSingle<ModuleDefinition>();

    if (moduleDefinitionError) {
      throw new Error(
        `Failed to load module definition: ${moduleDefinitionError.message}`
      );
    }

    if (!moduleDefinition) {
      continue;
    }

    const { data: definitions, error: definitionsError } = await supabase
      .from("module_configuration_definitions")
      .select("id, code, value_type, default_value, is_required")
      .eq("module_definition_id", moduleDefinition.id)
      .eq("status", "active")
      .order("code");

    if (definitionsError) {
      throw new Error(
        `Failed to load configuration definitions: ${definitionsError.message}`
      );
    }

    for (const definition of definitions ?? []) {
      const { data: resolved, error: resolutionError } =
        await supabase.rpc("resolve_module_configuration", {
          p_organization_product_module_id:
            organizationProductModule.id,
          p_configuration_code: definition.code,
        });

      if (resolutionError) {
        throw new Error(
          `Failed to resolve ${moduleDefinition.code}.${definition.code}: ${resolutionError.message}`
        );
      }

      if (resolved?.[0]) {
        configurationRows.push(resolved[0]);
      }
    }
  }

  const grouped = configurationRows.reduce(
    (groups, row) => {
      if (!groups[row.module_code]) {
        groups[row.module_code] = [];
      }

      groups[row.module_code].push(row);

      return groups;
    },
    {} as Record<string, ConfigurationRow[]>
  );

  const moduleCount = Object.keys(grouped).length;
  const configurationCount = configurationRows.length;

  const defaultCount = configurationRows.filter(
    (row) => row.value_source === "default"
  ).length;

  const organizationCount = configurationRows.filter(
    (row) => row.value_source === "organization"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              SAKATA Operating Systems
            </p>

            <h1 className="text-4xl font-bold tracking-tight">
              Configuration Center
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Operational configuration for {context.organization.name}.
              Effective values are resolved from organization overrides or
              module defaults.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wider text-emerald-300">
              Product
            </p>

            <p className="mt-1 font-semibold text-emerald-200">
              School OS
            </p>

            <p className="text-xs text-emerald-300/70">
              Active
            </p>
          </div>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Configured Modules</p>
            <p className="mt-2 text-3xl font-bold">{moduleCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Configurations</p>
            <p className="mt-2 text-3xl font-bold">
              {configurationCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Using Defaults</p>
            <p className="mt-2 text-3xl font-bold">{defaultCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Organization Overrides
            </p>

            <p className="mt-2 text-3xl font-bold">
              {organizationCount}
            </p>
          </div>
        </section>

        <section className="space-y-6">
          {Object.entries(grouped).map(([moduleCode, configurations]) => (
            <div
              key={moduleCode}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
            >
              <div className="border-b border-slate-800 px-6 py-5">
                <h2 className="text-lg font-semibold capitalize">
                  {moduleCode.replaceAll("_", " ")}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {configurations.length} active configuration
                  {configurations.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="divide-y divide-slate-800">
                {configurations.map((configuration) => (
                  <div
                    key={configuration.configuration_definition_id}
                    className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_180px_180px]"
                  >
                    <div>
                      <p className="font-medium">
                        {configuration.configuration_code.replaceAll(
                          "_",
                          " "
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Type: {configuration.value_type}
                        {configuration.is_required
                          ? " • Required"
                          : ""}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Effective Value
                      </p>

                      <p className="mt-1 font-mono text-lg text-slate-200">
                        {JSON.stringify(
                          configuration.effective_value
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Source
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          configuration.value_source === "organization"
                            ? "bg-blue-500/15 text-blue-300"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {configuration.value_source === "organization"
                          ? "Organization Override"
                          : "System Default"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {configurationCount === 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
            <p className="font-semibold text-amber-200">
              No active configurations were resolved.
            </p>

            <p className="mt-2 text-sm text-amber-300/70">
              The authenticated application could not resolve any
              active School OS configuration definitions.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}