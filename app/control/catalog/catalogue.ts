import { CURATED_PRODUCT_IDENTITIES } from "./catalogue-registry";

export type RegistryProduct = {
  code: string;
  name: string;
  description: string | null;
  status: string;
};

export type PortfolioLifecycle =
  | "proposed"
  | "approved"
  | "in_development"
  | "not_assessed";

export type ProductReadiness =
  | "in_development"
  | "implemented"
  | "verified"
  | "production_ready"
  | "not_assessed";

const registryCustomerSegments: Record<string, string> = {
  school_os: "Schools and educational institutions (registry scope)",
  pharmacy_os: "Pharmacies and pharmaceutical retail (registry scope)",
  hospital_os: "Hospitals, clinics, and healthcare operations (registry scope)",
  hotel_os: "Hotels and accommodation operators (registry scope)",
  retail_os: "Supermarkets, shops, and retail businesses (registry scope)",
  wholesale_os: "Wholesalers, distributors, and bulk traders (registry scope)",
  factory_os: "Manufacturers and factory operators (registry scope)",
  restaurant_os: "Restaurants, cafes, and food-service businesses (registry scope)",
  petrol_station_os: "Petrol stations and fuel retailers (registry scope)",
  warehouse_os: "Warehouse and distribution operators (registry scope)",
  ngo_os: "Non-governmental and community organizations (registry scope)",
  training_os:
    "Vocational institutions and professional training providers (registry scope)",
  real_estate_os: "Property and real-estate operators (registry scope)",
  business_os: "Organizations and business operators (registry scope)",
};

export type RegistryPortfolioEntry = RegistryProduct & {
  customerSegment: string;
  portfolioLifecycle: PortfolioLifecycle;
  readiness: ProductReadiness;
  evidence: string;
  businessProblem: string;
  priority: "unranked";
  tenantAvailability: "assigned" | "not_assigned";
};

export function assessRegistryProduct(
  product: RegistryProduct,
  hasActiveOrganizationAssignment: boolean,
): RegistryPortfolioEntry {
  const isSchoolOs = product.code === "school_os";

  return {
    ...product,
    customerSegment:
      registryCustomerSegments[product.code] ??
      "Not documented; customer research is required.",
    portfolioLifecycle: isSchoolOs ? "in_development" : "not_assessed",
    readiness: isSchoolOs ? "in_development" : "not_assessed",
    evidence: isSchoolOs
      ? "School application routes, operational migrations, and tests exist. Full product verification, commercial validation, and production readiness are not established."
      : "Registry identity and description only; product-specific implementation and customer research are not established.",
    businessProblem:
      "Not documented or validated in the repository; severity, frequency, and willingness to pay are unknown.",
    priority: "unranked",
    tenantAvailability: hasActiveOrganizationAssignment
      ? "assigned"
      : "not_assigned",
  };
}

export type CatalogueReconciliationClassification =
  | "exact_match"
  | "partial_overlap"
  | "proposed_opportunity"
  | "no_confirmed_match";

export type CatalogueReconciliationEntry = {
  curatedProductId: string;
  curatedDisplayName: string;
  canonicalProductName: string | null;
  canonicalCode: string | null;
  classification: CatalogueReconciliationClassification;
  evidence: string[];
  recommendedRelationship: string;
  unresolvedDecision: string;
};

export const catalogueReconciliation: CatalogueReconciliationEntry[] = CURATED_PRODUCT_IDENTITIES.map(
  ({ id, code, name }) => ({
    curatedProductId: id,
    curatedDisplayName: name,
    canonicalProductName: name.replace(/^SAKATA /, ""),
    canonicalCode: code,
    classification: "exact_match",
    evidence: [
      "A read-only query of the configured live database confirmed this exact product code, display name, and active status.",
      "The live catalogue query confirmed twelve active module assignments for this product.",
    ],
    recommendedRelationship: "Reuse the existing canonical product definition and preserve its database ID and module links.",
    unresolvedDecision: "No identity mapping decision is pending for the verified live record.",
  }),
);

export type PortfolioCandidate = {
  code: string;
  name: string;
  customerSegment: string;
  businessProblem: string;
  proposedWorkflows: string[];
  evidence: string;
  portfolioLifecycle: "proposed";
  readiness: "not_assessed";
  priority: "unranked";
};

export const portfolioCandidates: PortfolioCandidate[] = [
  {
    code: "fleet_mobility_os",
    name: "Fleet & Mobility OS",
    customerSegment:
      "Fleet owners and mobility operators (hypothesis; buyer not validated)",
    businessProblem:
      "UNKNOWN — problem severity, frequency, and demand require operator discovery.",
    proposedWorkflows: [
      "Vehicle and driver records",
      "Dispatch and trip operations",
      "Fuel, maintenance, and incident tracking",
      "Fleet utilization and operational reporting",
    ],
    evidence:
      "No candidate-specific implementation or customer-demand evidence is recorded in the repository. Workflows are discovery hypotheses.",
    portfolioLifecycle: "proposed",
    readiness: "not_assessed",
    priority: "unranked",
  },
  {
    code: "short_stay_rental_operations_os",
    name: "Short-Stay Rental Operations OS",
    customerSegment:
      "Short-stay accommodation operators and hosts (hypothesis; buyer not validated)",
    businessProblem:
      "UNKNOWN — problem severity, frequency, and demand require operator discovery.",
    proposedWorkflows: [
      "Property and listing operations",
      "Booking and guest coordination",
      "Turnover, housekeeping, and maintenance",
      "Owner and property performance reporting",
    ],
    evidence:
      "No candidate-specific implementation or customer-demand evidence is recorded in the repository. Workflows are discovery hypotheses.",
    portfolioLifecycle: "proposed",
    readiness: "not_assessed",
    priority: "unranked",
  },
];

export const platformFamilies = [
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
] as const;

export const opportunityScoringCriteria = [
  {
    name: "Demand evidence",
    evidence: "Customer interviews, observed buying signals, and validated use cases",
  },
  {
    name: "Problem severity and frequency",
    evidence: "Documented operator impact, frequency, and cost of the current process",
  },
  {
    name: "Willingness to pay and revenue potential",
    evidence: "Buyer interviews, pricing tests, and a supportable commercial model",
  },
  {
    name: "Implementation effort and time to first useful release",
    evidence: "Scoped workflow, delivery estimate, dependencies, and a testable first release",
  },
  {
    name: "Reuse of existing platform capabilities",
    evidence: "Capability-to-workflow mapping with identified gaps and product-specific needs",
  },
  {
    name: "Operational, security, integration, and regulatory risks",
    evidence: "Domain risk assessment, required integrations, data sensitivity, and obligations",
  },
] as const;

export function formatPortfolioLifecycle(
  lifecycle: PortfolioLifecycle,
): string {
  switch (lifecycle) {
    case "proposed":
      return "Proposed";
    case "approved":
      return "Approved";
    case "in_development":
      return "In development";
    case "not_assessed":
      return "Not assessed";
  }
}

export function formatImplementationReadiness(
  readiness: ProductReadiness,
): string {
  switch (readiness) {
    case "in_development":
      return "In development";
    case "implemented":
      return "Implemented";
    case "verified":
      return "Verified";
    case "production_ready":
      return "Production-ready";
    case "not_assessed":
      return "Not assessed";
  }
}
