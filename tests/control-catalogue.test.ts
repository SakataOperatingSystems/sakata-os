import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assessRegistryProduct,
  catalogueReconciliation,
  formatImplementationReadiness,
  formatPortfolioLifecycle,
  opportunityScoringCriteria,
  platformFamilies,
  portfolioCandidates,
} from "../app/control/catalog/catalogue";
import { getCatalogueRedirect } from "../app/control/product-catalog/redirect";
import { getModuleDestination } from "../app/control/catalog/module-destinations";
import { CURATED_PRODUCT_IDENTITIES } from "../app/control/catalog/catalogue-registry";

describe("Control Plane product portfolio", () => {
  it("preserves only the meaningful product query on the legacy route", () => {
    expect(getCatalogueRedirect({})).toBe("/control/catalog");
    expect(getCatalogueRedirect({ product: "education" })).toBe(
      "/control/catalog?product=education",
    );
    expect(getCatalogueRedirect({ product: ["education", "business"] })).toBe(
      "/control/catalog?product=education",
    );
    expect(getCatalogueRedirect({ q: "school" })).toBe("/control/catalog");
    const legacyRoute = readFileSync(
      new URL("../app/control/product-catalog/page.tsx", import.meta.url),
      "utf8",
    );
    expect(legacyRoute).toContain("redirect(getCatalogueRedirect(params))");
  });

  it("reconciles each curated product to one verified live canonical identity", () => {
    expect(catalogueReconciliation).toHaveLength(16);
    expect(
      new Set(catalogueReconciliation.map(({ curatedProductId }) => curatedProductId))
        .size,
    ).toBe(16);
    expect(
      catalogueReconciliation.filter(
        ({ curatedDisplayName }) => curatedDisplayName === "SAKATA Workforce OS",
      ),
    ).toHaveLength(1);
    expect(
      catalogueReconciliation.map(({ classification }) => classification),
    ).toEqual(Array.from({ length: 16 }, () => "exact_match"));
    expect(
      catalogueReconciliation.map(({ canonicalCode }) => canonicalCode),
    ).toEqual(CURATED_PRODUCT_IDENTITIES.map(({ code }) => code));
    expect(
      catalogueReconciliation.every(
        ({ unresolvedDecision }) =>
          unresolvedDecision ===
          "No identity mapping decision is pending for the verified live record.",
      ),
    ).toBe(true);
  });

  it("keeps registry lifecycle, portfolio lifecycle, and readiness separate", () => {
    const product = assessRegistryProduct(
      {
        code: "school_os",
        name: "SAKATA School OS",
        description: "School operations",
        status: "active",
      },
      true,
    );

    expect(product.status).toBe("active");
    expect(formatPortfolioLifecycle(product.portfolioLifecycle)).toBe(
      "In development",
    );
    expect(formatImplementationReadiness(product.readiness)).toBe(
      "In development",
    );
    expect(product.tenantAvailability).toBe("assigned");
    expect(product.priority).toBe("unranked");
  });

  it("marks Business OS in development without overstating its implemented scope", () => {
    const product = assessRegistryProduct(
      {
        code: "business_os",
        name: "SAKATA Business OS",
        description: "Business operations",
        status: "active",
      },
      true,
    );

    expect(product.portfolioLifecycle).toBe("in_development");
    expect(product.readiness).toBe("in_development");
    expect(product.evidence).toContain("task dashboard and execution workflow");
    expect(product.evidence).toContain("CRM, projects, approvals");
    expect(product.evidence).toContain("not established");
  });

  it("uses distinct labels for approval, implementation, verification, and release readiness", () => {
    expect(formatPortfolioLifecycle("proposed")).toBe("Proposed");
    expect(formatPortfolioLifecycle("approved")).toBe("Approved");
    expect(formatPortfolioLifecycle("in_development")).toBe("In development");
    expect(formatImplementationReadiness("implemented")).toBe("Implemented");
    expect(formatImplementationReadiness("verified")).toBe("Verified");
    expect(formatImplementationReadiness("production_ready")).toBe(
      "Production-ready",
    );
    expect(formatImplementationReadiness("not_assessed")).toBe("Not assessed");
  });

  it("does not infer approval or readiness from an active registry record", () => {
    const product = assessRegistryProduct(
      {
        code: "future_registry_product",
        name: "Future Product",
        description: null,
        status: "active",
      },
      false,
    );

    expect(product.status).toBe("active");
    expect(product.portfolioLifecycle).toBe("not_assessed");
    expect(product.readiness).toBe("not_assessed");
    expect(product.tenantAvailability).toBe("not_assigned");
  });

  it("links only implemented School module routes and leaves other modules unavailable", () => {
    expect(getModuleDestination("business_os_tasks_projects")).toEqual({
      href: "/business/tasks",
      label: "Tasks",
    });
    expect(
      getModuleDestination("education_os_admissions_enquiries"),
    ).toEqual({ href: "/school/admissions", label: "Admissions" });
    expect(
      getModuleDestination("education_os_student_information"),
    ).toEqual({ href: "/school/students", label: "Students" });
    expect(
      getModuleDestination("education_os_classrooms_timetables"),
    ).toEqual({ href: "/school/classes", label: "Classes" });
    expect(getModuleDestination("education_os_attendance")).toEqual({
      href: "/school/attendance",
      label: "Attendance",
    });
    expect(getModuleDestination("education_os_fees_billing")).toEqual({
      href: "/school/finance",
      label: "School finance",
    });
    expect(getModuleDestination("education_os_staff_hr")).toEqual({
      href: "/school/staff",
      label: "Staff",
    });
    expect(
      getModuleDestination("hospitality_os_reservations"),
    ).toBeNull();
    expect(getModuleDestination("unknown_module")).toBeNull();
  });

  it("represents Fleet and Short-Stay Rental as proposed, unranked candidates", () => {
    expect(portfolioCandidates.map(({ code, name }) => ({ code, name }))).toEqual([
      {
        code: "fleet_mobility_os",
        name: "Fleet & Mobility OS",
      },
      {
        code: "short_stay_rental_operations_os",
        name: "Short-Stay Rental Operations OS",
      },
    ]);

    for (const candidate of portfolioCandidates) {
      expect(candidate.portfolioLifecycle).toBe("proposed");
      expect(candidate.readiness).toBe("not_assessed");
      expect(candidate.priority).toBe("unranked");
      expect(candidate.businessProblem).toContain("UNKNOWN");
      expect(candidate.proposedWorkflows.length).toBeGreaterThan(0);
      expect(candidate.evidence).toContain("discovery hypotheses");
    }
  });

  it("lists canonical platform families separately from the industry portfolio", () => {
    expect(platformFamilies).toEqual([
      "FounderOS",
      "ExecutiveOS",
      "AssistantOS",
      "PrivateOps",
      "FamilyOfficeOS",
      "EstateOps",
      "ConciergeOS",
      "FinanceAdmin",
      "TeamOS",
      "SecureOps",
      "AgentHub",
      "PartnerOS",
    ]);
  });

  it("defines all comparison criteria without unsupported numeric scores", () => {
    expect(opportunityScoringCriteria.map(({ name }) => name)).toEqual([
      "Demand evidence",
      "Problem severity and frequency",
      "Willingness to pay and revenue potential",
      "Implementation effort and time to first useful release",
      "Reuse of existing platform capabilities",
      "Operational, security, integration, and regulatory risks",
    ]);
    expect(
      new Set(opportunityScoringCriteria.map(({ name }) => name)).size,
    ).toBe(opportunityScoringCriteria.length);
  });
});
