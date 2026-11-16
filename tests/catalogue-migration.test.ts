import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CURATED_PRODUCT_IDENTITIES } from "../app/control/catalog/catalogue-registry";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20261025010000_connect_curated_os_portfolio.sql",
    import.meta.url,
  ),
  "utf8",
);
const verificationQuery = readFileSync(
  new URL("../supabase/verify_curated_os_catalogue.sql", import.meta.url),
  "utf8",
);

describe("curated catalogue migration", () => {
  it("uses the verified canonical code/name identities", () => {
    for (const { code, name } of CURATED_PRODUCT_IDENTITIES) {
      expect(migration).toContain(`('${code}', '${name}')`);
    }

    expect(migration).toContain("on conflict (code) do nothing;");
    expect(migration).toContain("on conflict (product_definition_id, module_definition_id) do nothing;");
    expect(migration).toContain("actual.name <> expected.name");
    expect(migration).toContain("duplicate.name");
    expect(migration).not.toMatch(/do update set/i);
  });

  it("reuses exactly twelve verified existing module definitions per product", () => {
    const assignments = [
      ...migration.matchAll(
        /^\s+\('(?:school_os|business_os|retail_os|finance_os|fleet_mobility_os|real_estate_os|hotel_os|garage_os|parking_access_os|factory_os|microfinance_os|wholesale_os|hospital_os|construction_os|agriculture_os|workforce_os)', '[^']+', '[^']+', \d+\)[,;]?$/gm,
      ),
    ];

    expect(assignments).toHaveLength(192);
    expect(migration).toContain("primary key (product_code, module_code)");
    expect(migration).toContain("unique (product_code, display_order)");
    expect(migration).toContain("actual.status <> 'active'");
    expect(migration).toContain("active_count");
    for (const { code } of CURATED_PRODUCT_IDENTITIES) {
      const productLinks = assignments.filter(([assignment]) =>
        assignment.includes(`('${code}',`),
      );
      expect(productLinks, code).toHaveLength(12);
    }
  });

  it("keeps the seed transactional and does not assign products to organizations or alter RLS", () => {
    expect(migration.trimStart().startsWith("--")).toBe(true);
    expect(migration).toMatch(/\bbegin;\s/);
    expect(migration.trimEnd().endsWith("commit;")).toBe(true);
    expect(migration).not.toMatch(/insert\s+into\s+public\.organization_products/i);
    expect(migration).not.toMatch(/\bdelete\s+from|\btruncate\b/i);
    expect(migration).not.toMatch(/\b(create|alter|drop)\s+policy\b/i);
    expect(migration).not.toMatch(/disable\s+row\s+level\s+security/i);
  });

  it("provides a read-only report for actual counts, identity conflicts, and missing links", () => {
    expect(verificationQuery.trimStart().startsWith("--")).toBe(true);
    expect(verificationQuery).toContain("missingOrConflictingProducts");
    expect(verificationQuery).toContain("productsWithWrongActiveLinkCount");
    expect(verificationQuery).toContain("organizationAssignmentsByProductAndStatus");
    expect(verificationQuery).toContain("duplicateProductNames");
    expect(verificationQuery).toContain("public.organization_products");
    expect(verificationQuery).not.toMatch(
      /\b(insert|update|delete|truncate|alter|drop)\s+(into|from|table)?\b/i,
    );
  });
});
