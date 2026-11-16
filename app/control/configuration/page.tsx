import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import ConfigurationEditor from "./configuration-editor";

type ConfigurationRow = {
  organization_product_module_id: string;
  configuration_definition_id: string;
  module_code: string;
  configuration_code: string;
  value_type: string;
  effective_value: unknown;
  value_source: string;
  is_required: boolean;
};

type Product = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

type BulkConfigurationRow = {
  organization_product_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  product_description: string | null;
  organization_product_module_id: string;
  module_definition_id: string;
  module_code: string;
  module_name: string;
  configuration_definition_id: string;
  configuration_code: string;
  value_type: string;
  effective_value: unknown;
  value_source: string;
  is_required: boolean;
};

type ModuleGroup = {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  configurations: ConfigurationRow[];
};

type ProductGroup = {
  organizationProductId: string;
  productId: string;
  productCode: string;
  productName: string;
  productDescription: string | null;
  modules: ModuleGroup[];
};

function buildProductGroups(
  rows: BulkConfigurationRow[]
): ProductGroup[] {
  const productGroups = new Map<string, ProductGroup>();
  const moduleGroups = new Map<string, ModuleGroup>();

  for (const row of rows) {
    let productGroup = productGroups.get(
      row.organization_product_id
    );

    if (!productGroup) {
      productGroup = {
        organizationProductId: row.organization_product_id,
        productId: row.product_id,
        productCode: row.product_code,
        productName: row.product_name,
        productDescription: row.product_description,
        modules: [],
      };

      productGroups.set(
        row.organization_product_id,
        productGroup
      );
    }

    let moduleGroup = moduleGroups.get(
      row.organization_product_module_id
    );

    if (!moduleGroup) {
      moduleGroup = {
        moduleId: row.module_definition_id,
        moduleCode: row.module_code,
        moduleName: row.module_name,
        configurations: [],
      };

      moduleGroups.set(
        row.organization_product_module_id,
        moduleGroup
      );

      productGroup.modules.push(moduleGroup);
    }

    moduleGroup.configurations.push({
      organization_product_module_id:
        row.organization_product_module_id,
      configuration_definition_id:
        row.configuration_definition_id,
      module_code: row.module_code,
      configuration_code: row.configuration_code,
      value_type: row.value_type,
      effective_value: row.effective_value,
      value_source: row.value_source,
      is_required: row.is_required,
    });
  }

  return Array.from(productGroups.values());
}

export default async function ConfigurationCenterPage() {
  await requirePermission("organization.read");

  const context = await getOrganizationContext();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "resolve_organization_configurations",
    {
      p_organization_id: context.organization.id,
    }
  );

  if (error) {
    throw new Error(
      `Failed to load active organization configuration: ${error.message}`
    );
  }

  const productGroups = buildProductGroups(
    (data ?? []) as BulkConfigurationRow[]
  );

  const moduleCount = productGroups.reduce(
    (total, product) => total + product.modules.length,
    0
  );

  const configurationCount = productGroups.reduce(
    (total, product) =>
      total +
      product.modules.reduce(
        (moduleTotal, module) => moduleTotal + module.configurations.length,
        0
      ),
    0
  );

  const defaultCount = productGroups.reduce(
    (total, product) =>
      total +
      product.modules.reduce(
        (moduleTotal, module) =>
          moduleTotal +
          module.configurations.filter(
            (configuration) => configuration.value_source === "default"
          ).length,
        0
      ),
    0
  );

  const organizationCount = productGroups.reduce(
    (total, product) =>
      total +
      product.modules.reduce(
        (moduleTotal, module) =>
          moduleTotal +
          module.configurations.filter(
            (configuration) =>
              configuration.value_source === "organization"
          ).length,
        0
      ),
    0
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            SAKATA Operating Systems
          </p>

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Control Plane
              </h1>

              <p className="mt-3 max-w-3xl text-slate-400">
                Platform composition and effective configuration for{" "}
                <span className="font-medium text-slate-200">
                  {context.organization.name}
                </span>
                .
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Organization
              </p>

              <p className="mt-1 font-semibold text-slate-200">
                {context.organization.name}
              </p>

              <p className="text-xs text-slate-500">
                {context.organization.organization_type}
              </p>
            </div>
          </div>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Active Products</p>
            <p className="mt-2 text-3xl font-bold">
              {productGroups.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Active Modules</p>
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

        <section className="space-y-8">
          {productGroups.map((product) => (
            <div
              key={product.organizationProductId}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
            >
              <div className="border-b border-slate-800 px-6 py-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
                      Active Product
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      {product.productName}
                    </h2>

                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {product.productCode}
                    </p>

                    {product.productDescription && (
                      <p className="mt-3 max-w-3xl text-sm text-slate-400">
                        {product.productDescription}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-right">
                    <p className="text-xs uppercase tracking-wider text-emerald-300">
                      Status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-200">
                      Active
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-800">
                {product.modules.map((module) => (
                  <div key={module.moduleId} className="px-6 py-6">
                    <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {module.moduleName}
                        </h3>

                        <p className="mt-1 font-mono text-xs text-slate-500">
                          {module.moduleCode}
                        </p>
                      </div>

                      <span className="inline-flex w-fit rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                        Active Module
                      </span>
                    </div>

                    {module.configurations.length > 0 ? (
                      <div className="space-y-4">
                        {module.configurations.map((configuration) => (
                          <div
                            key={configuration.configuration_definition_id}
                            className="rounded-xl border border-slate-800 bg-slate-950/60 p-5"
                          >
                            <div className="grid gap-4 md:grid-cols-[1fr_180px_180px]">
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
                                    configuration.value_source ===
                                    "organization"
                                      ? "bg-blue-500/15 text-blue-300"
                                      : "bg-slate-800 text-slate-300"
                                  }`}
                                >
                                  {configuration.value_source ===
                                  "organization"
                                    ? "Organization Override"
                                    : "System Default"}
                                </span>
                              </div>
                            </div>

                            <ConfigurationEditor
                              organizationProductModuleId={
                                configuration.organization_product_module_id
                              }
                              configurationDefinitionId={
                                configuration.configuration_definition_id
                              }
                              configurationCode={
                                configuration.configuration_code
                              }
                              valueType={configuration.value_type}
                              currentValue={
                                configuration.effective_value
                              }
                              valueSource={
                                configuration.value_source
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-5 py-4">
                        <p className="text-sm text-slate-500">
                          No active configuration definitions are currently
                          registered for this module.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {productGroups.length === 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
            <p className="font-semibold text-amber-200">
              No active products were resolved.
            </p>

            <p className="mt-2 text-sm text-amber-300/70">
              The authenticated organization does not currently have an
              active SAKATA product assignment.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
