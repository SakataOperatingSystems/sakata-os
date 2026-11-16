"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CURATED_PRODUCT_IDENTITIES,
  parseCatalogueRegistryResponse,
  type CatalogueRegistryProduct,
  type CatalogueRegistryResponse,
} from "./catalogue-registry";
import { getModuleDestination } from "./module-destinations";

type Product = {
  id: string;
  name: string;
  short: string;
  category: string;
  icon: string;
  accent: string;
  description: string;
  audience: string;
  promise: string;
  modules: string[];
  capabilities: string[];
  workflows: string[];
  records: string[];
};

const products: Product[] = [
  {
    id: "education",
    name: "SAKATA Education OS",
    short: "Schools, colleges and learning institutions",
    category: "Education",
    icon: "◈",
    accent: "from-blue-600 to-cyan-500",
    description: "A connected operating system for running an education institution, from the first admission enquiry to graduation, finance, staff, learning and institutional reporting.",
    audience: "Schools, academies, colleges and education groups",
    promise: "One institutional record across the learner journey.",
    modules: ["Admissions & enquiries", "Student information", "Classrooms & timetables", "Attendance", "Examinations & grading", "Fees & billing", "Parent communication", "Staff & HR", "Transport", "Library", "Inventory", "Reports & analytics"],
    capabilities: ["Applicant-to-student conversion", "Academic year and term management", "Class, subject and teacher allocation", "Fee schedules, invoices and balances", "Assessment results and report cards", "Parent and guardian access", "Role-based access and audit trails"],
    workflows: ["Enquiry → Application → Review → Admission", "Student → Class allocation → Attendance", "Assessment → Moderation → Results", "Invoice → Payment → Reconciliation"],
    records: ["Students", "Guardians", "Applications", "Academic years", "Classes", "Subjects", "Assessments", "Invoices", "Payments", "Staff"]
  },
  {
    id: "business",
    name: "SAKATA Business OS",
    short: "Everyday business operations in one workspace",
    category: "Business",
    icon: "▦",
    accent: "from-violet-600 to-indigo-500",
    description: "A unified workspace for the daily work of a growing organisation, connecting customers, tasks, documents, approvals, teams, money and performance.",
    audience: "SMEs, professional firms and multi-department organisations",
    promise: "Turn disconnected business activity into accountable workflows.",
    modules: ["Executive dashboard", "CRM", "Tasks & projects", "Approvals", "Documents", "Team directory", "Expenses", "Budgets", "Service requests", "Reports", "Notifications", "Organisation settings"],
    capabilities: ["Customer and account management", "Task ownership and deadlines", "Approval routing", "Document and record history", "Expense submission and review", "Department-level reporting", "Permission-aware dashboards"],
    workflows: ["Request → Assignment → Completion", "Expense → Review → Approval", "Lead → Opportunity → Customer", "Plan → Execute → Measure"],
    records: ["Organisations", "Departments", "Users", "Customers", "Tasks", "Projects", "Approvals", "Expenses", "Documents"]
  },
  {
    id: "commerce",
    name: "SAKATA Commerce OS",
    short: "Retail, shops and multi-branch selling",
    category: "Commerce",
    icon: "◇",
    accent: "from-orange-500 to-amber-400",
    description: "A retail operating system connecting products, pricing, point of sale, stock, customers, suppliers and branch performance.",
    audience: "Retailers, wholesalers, shops and retail chains",
    promise: "Know what you sell, what you hold and what each branch earns.",
    modules: ["Point of sale", "Product catalogue", "Stock control", "Purchasing", "Suppliers", "Customer accounts", "Discounts & promotions", "Returns", "Branch management", "Cash-up", "Sales reports", "Loyalty"],
    capabilities: ["Barcode and SKU-based products", "Stock movements and adjustments", "Branch-level inventory", "Sales and returns tracking", "Purchase orders and receiving", "Cashier shifts and reconciliation", "Low-stock monitoring"],
    workflows: ["Purchase → Receive → Stock", "Sale → Payment → Receipt", "Return → Inspection → Resolution", "Reorder → Supplier → Delivery"],
    records: ["Products", "Variants", "Branches", "Stock movements", "Sales", "Sale items", "Customers", "Suppliers", "Purchase orders", "Payments"]
  },
  {
    id: "finance",
    name: "SAKATA Finance OS",
    short: "Financial operations and accountable records",
    category: "Finance",
    icon: "◎",
    accent: "from-emerald-600 to-teal-400",
    description: "A financial operations foundation for tracking income, expenditure, receivables, payables, budgets, reconciliations and management reporting.",
    audience: "Businesses and institutions that need financial visibility",
    promise: "Make every financial movement traceable to its source.",
    modules: ["Chart of accounts", "General ledger", "Accounts receivable", "Accounts payable", "Cash & bank", "Budgets", "Expenses", "Reconciliation", "Financial periods", "Statements", "Audit trail", "Management reports"],
    capabilities: ["Configurable account structures", "Source-linked transactions", "Receivable and payable tracking", "Bank reconciliation workflows", "Budget-versus-actual views", "Period controls", "Approval and audit history"],
    workflows: ["Transaction → Review → Posting", "Invoice → Receipt → Allocation", "Bill → Approval → Payment", "Statement → Matching → Reconciliation"],
    records: ["Accounts", "Journal entries", "Journal lines", "Invoices", "Bills", "Payments", "Budgets", "Bank transactions", "Financial periods"]
  },
  {
    id: "fleet",
    name: "SAKATA Fleet & Mobility OS",
    short: "Vehicles, transport and fleet operations",
    category: "Operations",
    icon: "↗",
    accent: "from-sky-600 to-blue-500",
    description: "A fleet operations platform for vehicles, drivers, assignments, trips, fuel, maintenance, incidents and operating costs.",
    audience: "Transport operators, logistics teams and fleet owners",
    promise: "Connect every vehicle to its people, trips, condition and cost.",
    modules: ["Vehicle register", "Drivers", "Trip planning", "Dispatch", "Fuel management", "Maintenance", "Inspections", "Incidents", "Licences & compliance", "Expenses", "Utilisation", "Fleet analytics"],
    capabilities: ["Vehicle and document expiry tracking", "Driver assignment", "Trip and route records", "Fuel consumption tracking", "Service schedules", "Incident recording", "Cost per vehicle and trip"],
    workflows: ["Trip request → Approval → Dispatch", "Inspection → Defect → Repair", "Fuel issue → Trip allocation → Review", "Service due → Workshop → Release"],
    records: ["Vehicles", "Drivers", "Trips", "Assignments", "Fuel transactions", "Maintenance jobs", "Inspections", "Incidents", "Vehicle documents"]
  },
  {
    id: "property",
    name: "SAKATA Property OS",
    short: "Property portfolios, tenants and facilities",
    category: "Operations",
    icon: "⌂",
    accent: "from-fuchsia-600 to-pink-500",
    description: "A property management system for buildings, units, leases, tenants, rent schedules, maintenance requests and occupancy performance.",
    audience: "Landlords, property managers and real estate operators",
    promise: "See each property, unit, lease, obligation and outstanding balance.",
    modules: ["Property portfolio", "Buildings & units", "Tenants", "Leases", "Rent schedules", "Collections", "Deposits", "Maintenance", "Inspections", "Utilities", "Documents", "Occupancy reports"],
    capabilities: ["Unit availability and occupancy", "Lease term and renewal tracking", "Scheduled charges", "Tenant balances", "Maintenance assignment", "Property document management", "Portfolio-level reporting"],
    workflows: ["Enquiry → Viewing → Application", "Application → Lease → Handover", "Charge → Payment → Allocation", "Issue → Work order → Resolution"],
    records: ["Properties", "Units", "Tenants", "Leases", "Charges", "Payments", "Deposits", "Work orders", "Inspections"]
  },
  {
    id: "hospitality",
    name: "SAKATA Hospitality OS",
    short: "Hotels, lodges and guest operations",
    category: "Services",
    icon: "✳",
    accent: "from-rose-600 to-orange-400",
    description: "A hospitality operating system connecting reservations, rooms, guests, check-in, housekeeping, service requests, billing and guest experience.",
    audience: "Hotels, lodges, serviced apartments and guest houses",
    promise: "Coordinate the guest journey from booking to checkout.",
    modules: ["Reservations", "Room inventory", "Guest profiles", "Check-in & checkout", "Housekeeping", "Front desk", "Guest requests", "Billing", "Rates & availability", "Maintenance", "Staff shifts", "Occupancy analytics"],
    capabilities: ["Room status and availability", "Reservation lifecycle", "Guest identity and preferences", "Housekeeping task queues", "Charges and folios", "Maintenance coordination", "Occupancy and revenue reporting"],
    workflows: ["Reservation → Confirmation → Arrival", "Arrival → Check-in → Room assignment", "Request → Assignment → Service", "Checkout → Folio review → Settlement"],
    records: ["Rooms", "Room types", "Reservations", "Guests", "Stays", "Charges", "Payments", "Housekeeping tasks", "Maintenance requests"]
  },
  {
    id: "garage",
    name: "SAKATA Garage OS",
    short: "Workshops, repairs and vehicle servicing",
    category: "Operations",
    icon: "⌘",
    accent: "from-slate-600 to-zinc-400",
    description: "A workshop management system for customer vehicles, diagnostics, quotations, job cards, technicians, parts, labour and service history.",
    audience: "Garages, mechanics, service centres and repair chains",
    promise: "Track every vehicle from check-in to completed work.",
    modules: ["Customer vehicles", "Bookings", "Vehicle inspections", "Diagnostics", "Estimates", "Job cards", "Technicians", "Parts inventory", "Labour tracking", "Invoices", "Warranty claims", "Service history"],
    capabilities: ["Vehicle history by registration or VIN", "Customer-approved estimates", "Technician and bay allocation", "Parts reservation and consumption", "Labour and job costing", "Quality checks", "Repair status visibility"],
    workflows: ["Booking → Inspection → Estimate", "Estimate → Customer approval → Job card", "Parts issue → Repair → Quality check", "Completed job → Invoice → Handover"],
    records: ["Customers", "Vehicles", "Bookings", "Inspections", "Estimates", "Job cards", "Technicians", "Parts", "Invoices"]
  },
  {
    id: "parking",
    name: "SAKATA Parking & Access OS",
    short: "Parking facilities, permits and controlled entry",
    category: "Operations",
    icon: "▤",
    accent: "from-cyan-600 to-teal-400",
    description: "A facility operations system for parking areas, bays, permits, visitors, access events, sessions, tariffs and collections.",
    audience: "Parking operators, estates, campuses and commercial facilities",
    promise: "Account for access, occupancy and parking charges in one system.",
    modules: ["Parking locations", "Zones & bays", "Permits", "Visitor access", "Parking sessions", "Tariffs", "Payments", "Access logs", "Enforcement", "Equipment", "Operator shifts", "Utilisation reports"],
    capabilities: ["Permit and vehicle registration", "Session start and end tracking", "Configurable tariff rules", "Visitor and contractor records", "Access event audit trail", "Occupancy monitoring", "Payment reconciliation"],
    workflows: ["Visitor request → Authorisation → Entry", "Vehicle entry → Session → Exit", "Permit application → Approval → Activation", "Charge → Payment → Reconciliation"],
    records: ["Facilities", "Zones", "Bays", "Vehicles", "Permits", "Visitors", "Sessions", "Access events", "Tariffs", "Payments"]
  },
  {
    id: "manufacturing",
    name: "SAKATA Manufacturing OS",
    short: "Production, materials and quality control",
    category: "Industry",
    icon: "▥",
    accent: "from-amber-600 to-yellow-400",
    description: "An operations system connecting bills of materials, production orders, raw materials, work centres, quality checks, finished goods and production costs.",
    audience: "Manufacturers, workshops and production businesses",
    promise: "Connect production plans to materials, output, quality and cost.",
    modules: ["Product specifications", "Bills of materials", "Production planning", "Work orders", "Work centres", "Material issue", "Quality control", "Finished goods", "Waste & scrap", "Maintenance", "Production costing", "Performance reports"],
    capabilities: ["Production order scheduling", "Material requirements", "Consumption and yield records", "Batch and lot traceability", "Quality checkpoints", "Scrap recording", "Planned-versus-actual production"],
    workflows: ["Demand → Plan → Work order", "Work order → Material issue → Production", "Production → Quality inspection → Release", "Finished goods → Stock → Dispatch"],
    records: ["Products", "Bills of materials", "Materials", "Work orders", "Work centres", "Batches", "Quality checks", "Scrap records", "Finished goods"]
  },
  {
    id: "microfinance",
    name: "SAKATA Microfinance OS",
    short: "Loans, repayments and borrower management",
    category: "Finance",
    icon: "◉",
    accent: "from-green-700 to-lime-500",
    description: "A lending operations platform for borrower onboarding, applications, assessment, approvals, disbursements, repayment schedules and arrears monitoring.",
    audience: "Microfinance institutions, SACCOs and lending organisations",
    promise: "Make the complete loan lifecycle visible and auditable.",
    modules: ["Borrower onboarding", "Applications", "Assessments", "Loan products", "Approvals", "Disbursement", "Repayment schedules", "Collections", "Arrears", "Guarantors", "Cashier operations", "Portfolio reporting"],
    capabilities: ["Borrower and group records", "Configurable product terms", "Approval limits and segregation", "Repayment schedules", "Payment allocation", "Delinquency monitoring", "Portfolio-at-risk reporting"],
    workflows: ["Application → Assessment → Decision", "Approval → Agreement → Disbursement", "Due instalment → Collection → Allocation", "Arrears → Follow-up → Resolution"],
    records: ["Borrowers", "Loan applications", "Loan products", "Loans", "Schedules", "Repayments", "Guarantors", "Collections", "Approvals"]
  },
  {
    id: "supply",
    name: "SAKATA Supply Chain OS",
    short: "Procurement, warehouses and distribution",
    category: "Industry",
    icon: "⇄",
    accent: "from-indigo-600 to-violet-500",
    description: "A supply chain system connecting purchasing, supplier performance, goods receiving, warehouse stock, transfers, fulfilment and delivery.",
    audience: "Distributors, importers, wholesalers and procurement teams",
    promise: "Trace goods from supplier commitment to customer delivery.",
    modules: ["Supplier directory", "Requisitions", "Purchase orders", "Receiving", "Warehouses", "Bin locations", "Stock transfers", "Picking & packing", "Dispatch", "Deliveries", "Supplier invoices", "Supply analytics"],
    capabilities: ["Purchase approval workflows", "Expected-versus-received checks", "Multi-warehouse inventory", "Stock movement history", "Order fulfilment", "Delivery tracking", "Supplier lead-time reporting"],
    workflows: ["Requisition → Approval → Purchase order", "Order → Receive → Inspect → Put away", "Customer order → Pick → Pack → Dispatch", "Delivery → Proof of receipt → Close"],
    records: ["Suppliers", "Requisitions", "Purchase orders", "Receipts", "Warehouses", "Locations", "Stock transfers", "Shipments", "Deliveries"]
  },
  {
    id: "health",
    name: "SAKATA Healthcare Administration OS",
    short: "Patient-facing administration and facility operations",
    category: "Services",
    icon: "✚",
    accent: "from-red-600 to-rose-400",
    description: "An administrative operating system for appointments, patient registration, queues, facility resources, billing and service coordination. Clinical functionality must be configured to appropriate professional and regulatory standards.",
    audience: "Clinics, outpatient facilities and healthcare administrators",
    promise: "Coordinate facility operations while protecting sensitive records.",
    modules: ["Patient registration", "Appointments", "Queue management", "Provider schedules", "Facility services", "Billing administration", "Payments", "Resource allocation", "Referrals", "Document controls", "User permissions", "Operations reports"],
    capabilities: ["Appointment and queue visibility", "Patient identity management", "Administrative billing records", "Permission-controlled access", "Referral status tracking", "Activity audit trails", "Operational capacity reporting"],
    workflows: ["Appointment → Arrival → Queue", "Registration → Service routing → Completion", "Charge → Payment → Reconciliation", "Referral → Acknowledgement → Follow-up"],
    records: ["Patients", "Appointments", "Providers", "Queues", "Service encounters", "Charges", "Payments", "Referrals", "Access logs"]
  },
  {
    id: "construction",
    name: "SAKATA Construction OS",
    short: "Projects, sites, contractors and materials",
    category: "Industry",
    icon: "⌗",
    accent: "from-orange-600 to-red-400",
    description: "A project operations platform for construction schedules, site activities, budgets, procurement, materials, contractors, variations and progress reporting.",
    audience: "Contractors, developers, engineering teams and project managers",
    promise: "Connect site progress to cost, people, materials and decisions.",
    modules: ["Project portfolio", "Sites & work packages", "Schedules", "Tasks & milestones", "Budgets", "Procurement", "Materials", "Contractors", "Site diaries", "Variations", "Inspections", "Progress claims"],
    capabilities: ["Project and milestone tracking", "Site-level work allocation", "Budget and commitment visibility", "Materials receiving and issue", "Variation approval records", "Inspection and defect tracking", "Progress evidence and reports"],
    workflows: ["Scope → Plan → Baseline", "Request → Purchase → Site delivery", "Inspection → Defect → Rectification", "Progress claim → Review → Approval"],
    records: ["Projects", "Sites", "Milestones", "Work packages", "Budgets", "Purchase orders", "Materials", "Contractors", "Variations"]
  },
  {
    id: "agriculture",
    name: "SAKATA Agriculture OS",
    short: "Farms, field operations and produce",
    category: "Industry",
    icon: "❋",
    accent: "from-lime-700 to-green-500",
    description: "An agricultural operations system for farms, plots, planting cycles, field activities, input usage, harvests, storage and produce sales.",
    audience: "Farms, cooperatives, agribusinesses and produce traders",
    promise: "Follow production from field preparation to harvested output.",
    modules: ["Farm register", "Plots & fields", "Crop cycles", "Planting plans", "Field activities", "Inputs & supplies", "Labour", "Equipment", "Harvest records", "Storage", "Produce sales", "Yield analytics"],
    capabilities: ["Field and crop-cycle tracking", "Input application records", "Labour and equipment allocation", "Harvest quantities and grading", "Stock and storage tracking", "Buyer and sale records", "Yield and cost analysis"],
    workflows: ["Plan → Prepare → Plant", "Activity → Input issue → Field record", "Harvest → Grade → Store", "Order → Dispatch → Sale settlement"],
    records: ["Farms", "Fields", "Crop cycles", "Activities", "Inputs", "Labour records", "Harvests", "Lots", "Buyers", "Sales"]
  },
  {
    id: "workforce",
    name: "SAKATA Workforce OS",
    short: "People, shifts, attendance and service teams",
    category: "Business",
    icon: "⌘",
    accent: "from-purple-600 to-fuchsia-500",
    description: "A workforce operations system for staff records, shifts, attendance, leave, assignments, field teams, service requests and performance.",
    audience: "Service businesses, distributed teams and multi-site employers",
    promise: "Know who is responsible, where work stands and what needs attention.",
    modules: ["Employee directory", "Teams & roles", "Shift planning", "Attendance", "Leave requests", "Work assignments", "Field service", "Timesheets", "Expenses", "Equipment allocation", "Performance reviews", "Workforce reports"],
    capabilities: ["Shift and availability planning", "Attendance exceptions", "Leave approval workflows", "Assignment and workload tracking", "Timesheet review", "Equipment accountability", "Team-level service performance"],
    workflows: ["Shift plan → Assignment → Attendance", "Leave request → Review → Decision", "Service request → Dispatch → Completion", "Timesheet → Approval → Export"],
    records: ["Employees", "Teams", "Shifts", "Attendance", "Leave requests", "Assignments", "Timesheets", "Expenses", "Equipment"]
  },
];

const categories = ["All systems", "Education", "Business", "Commerce", "Finance", "Operations", "Services", "Industry"];

function IconMark({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-bold text-white shadow-lg ${className}`}>
      {children}
    </span>
  );
}

export default function ProductCatalogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All systems");
  const [selected, setSelected] = useState<Product | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [catalogueStatus, setCatalogueStatus] = useState<
    "checking" | "available" | "unavailable"
  >("checking");
  const [registryData, setRegistryData] =
    useState<CatalogueRegistryResponse | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const closeSelectedProduct = useCallback(() => {
    if (!selected) return;

    if (window.history.state?.catalogueProduct === selected.id) {
      window.history.back();
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("product");
    window.history.replaceState(window.history.state, "", url);
    setSelected(null);
  }, [selected]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogue() {
      try {
        const response = await fetch("/api/control/catalog", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Catalogue API returned ${response.status}`);
        }

        const registryProducts = parseCatalogueRegistryResponse(
          await response.json(),
        );

        if (!cancelled) {
          setRegistryData(registryProducts);
          setCatalogueStatus("available");
        }
      } catch (error) {
        console.error("Unable to verify the product registry:", error);

        if (!cancelled) {
          setCatalogueStatus("unavailable");
        }
      }
    }

    void loadCatalogue();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function syncSelectedProduct() {
      const productId = new URL(window.location.href).searchParams.get("product");
      setSelected(products.find((product) => product.id === productId) ?? null);
    }

    syncSelectedProduct();
    window.addEventListener("popstate", syncSelectedProduct);

    return () => window.removeEventListener("popstate", syncSelectedProduct);
  }, []);

  useEffect(() => {
    if (!selected) {
      lastTriggerRef.current?.focus();
      lastTriggerRef.current = null;
      return;
    }

    closeButtonRef.current?.focus();

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSelectedProduct();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = document.querySelector<HTMLElement>(
        "[data-catalogue-dialog]",
      );
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => document.removeEventListener("keydown", handleDialogKeyDown);
  }, [selected, closeSelectedProduct]);

  function openSelectedProduct(product: Product) {
    lastTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const url = new URL(window.location.href);
    url.searchParams.set("product", product.id);
    const currentState =
      typeof window.history.state === "object" && window.history.state !== null
        ? window.history.state
        : {};
    window.history.pushState(
      { ...currentState, catalogueProduct: product.id },
      "",
      url,
    );
    setSelected(product);
  }

  const registryByCode = useMemo(
    () =>
      new Map(
        registryData?.products.map((product) => [product.code, product]),
      ),
    [registryData],
  );
  const productCodeById = useMemo(
    () =>
      new Map<string, string>(
        CURATED_PRODUCT_IDENTITIES.map(({ id, code }) => [id, code]),
      ),
    [],
  );
  const getRegistryProduct = (product: Product) =>
    registryByCode.get(productCodeById.get(product.id) ?? "");
  const getActiveModuleCount = (
    registryProduct: CatalogueRegistryProduct | undefined,
  ) =>
    registryProduct?.modules.filter(
      (module) =>
        module.definitionStatus === "active" &&
        module.assignmentStatus === "active",
    ).length ?? 0;
  const getOrganizationProductStatus = (
    registryProduct: CatalogueRegistryProduct | undefined,
  ) =>
    registryProduct
      ? registryData?.organizationProducts.find(
          ({ productDefinitionId }) => productDefinitionId === registryProduct.id,
        )?.status ?? "not enabled"
      : "not available";

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "All systems" || product.category === category;
      const registryProduct = registryByCode.get(
        productCodeById.get(product.id) ?? "",
      );
      const searchable = [
        product.name,
        product.short,
        product.category,
        product.description,
        product.audience,
        ...product.modules,
        ...product.capabilities,
        ...product.workflows,
        ...product.records,
        ...(registryProduct?.modules.map(({ name }) => name) ?? []),
      ].join(" ").toLowerCase();
      return matchesCategory && (!term || searchable.includes(term));
    });
  }, [query, category, registryByCode, productCodeById]);

  return (
    <main className="catalogue-page min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-[1600px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-[72px] items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-lg font-black text-white">S.</div>
              <div>
                <div className="text-sm font-extrabold tracking-[0.14em] text-slate-950">SAKATA <span className="font-medium text-slate-400">TECHNOLOGIES</span></div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operating systems portfolio</div>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 lg:flex">
              <span className="h-2 w-2 rounded-full bg-violet-500"></span>
              Master product catalogue
              <span
                className="ml-1 rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold"
                role="status"
                aria-live="polite"
              >
                {catalogueStatus === "available"
                  ? `${registryData?.products.length ?? 0}/16 REGISTERED · ${registryData?.activeModuleDefinitionCount ?? 0}/${registryData?.moduleDefinitionCount ?? 0} ACTIVE MODULES · ${registryData?.products.reduce((count, product) => count + getActiveModuleCount(product), 0) ?? 0} ACTIVE LINKS`
                  : catalogueStatus === "checking"
                    ? "CHECKING REGISTRY"
                    : "REGISTRY UNAVAILABLE"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white">PORTFOLIO</div>
            </div>
          </div>
        </header>
        {catalogueStatus === "unavailable" && (
          <p
            role="status"
            className="mx-5 mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:mx-8"
          >
            The live registry could not be verified. The curated catalogue
            definitions are still shown; registry status and product readiness
            are not implied.
          </p>
        )}
        <section className="px-5 pb-8 pt-8 sm:px-8 sm:pt-12">
          <div className="catalogue-hero relative overflow-hidden rounded-[30px] bg-[#101827] px-6 py-9 text-white shadow-2xl shadow-slate-300/40 sm:px-10 sm:py-12 lg:px-14">
            <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-violet-600/30 blur-3xl"></div>
            <div className="pointer-events-none absolute bottom-[-130px] right-[28%] h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl"></div>
            <div className="relative grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300"></span>
                  One platform, composed for work
                </div>
                <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                  Every operation.<br />
                  <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">One clearer system.</span>
                </h1>
                <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Explore the SAKATA OS portfolio: purpose-built operating systems designed around real workflows, connected records, accountable decisions and measurable performance.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="#catalogue" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-50">
                    Explore the catalogue                     <span aria-hidden="true">↓</span>
                  </a>
                  <div className="inline-flex items-center rounded-xl border border-white/15 px-4 py-3 text-xs font-medium text-slate-300">
                    Product portfolio blueprint
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                  <div className="text-3xl font-semibold tracking-tight">{products.length.toString().padStart(2, "0")}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-300">Product systems<br />in the portfolio</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                  <div className="text-3xl font-semibold tracking-tight">{categories.length - 1}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-300">Operating<br />domains</div>
                </div>
                <div className="col-span-2 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.08] to-white/[0.03] p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-xl text-cyan-200">✳</div>
                    <div>
                      <div className="text-sm font-bold">Built around the work</div>
                      <p className="mt-1 text-xs leading-5 text-slate-300">Workflows, records, permissions, reporting and integrations belong to one coherent product architecture.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-12 sm:px-8" id="catalogue">
          <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-violet-600">Discover the ecosystem</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">The product catalogue</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Choose a system to inspect its purpose, functional modules, core capabilities and end-to-end workflows.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-violet-500"></span>
              {filtered.length} of {products.length} systems shown
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">⌕</span>
                <input
                  aria-label="Search product catalogue"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search systems, modules, capabilities..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["grid", "list"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={view === mode}
                    onClick={() => setView(mode)}
                    className={`rounded-xl px-3 py-2.5 text-xs font-bold capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${view === mode ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    {mode === "grid" ? "Grid" : "List"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${category === item ? "bg-violet-600 text-white shadow-md shadow-violet-200" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="text-3xl text-slate-300">⌕</div>
              <h3 className="mt-3 text-lg font-bold text-slate-800">No matching systems</h3>
              <p className="mt-2 text-sm text-slate-500">Try another search term or clear the selected category.</p>
              <button onClick={() => { setQuery(""); setCategory("All systems"); }} className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white">Reset filters</button>
            </div>
          ) : (
            <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}>
              {filtered.map((product) => (
                <article
                  key={product.id}
                  className={`group relative flex flex-col overflow-hidden rounded-[24px] border border-slate-200/90 bg-white transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-slate-200/70 ${view === "list" ? "sm:flex-row sm:items-center" : ""}`}
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${product.accent} ${view === "list" ? "sm:hidden" : ""}`}></div>
                  <div className={`flex flex-1 flex-col p-5 sm:p-6 ${view === "list" ? "sm:flex-row sm:items-center sm:gap-6" : ""}`}>
                    <div className={`flex items-start justify-between gap-3 ${view === "list" ? "sm:min-w-[250px] sm:items-center" : ""}`}>
                      <IconMark className={product.accent}>{product.icon}</IconMark>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{product.category}</span>
                    </div>
                    <div className={`mt-5 ${view === "list" ? "sm:mt-0 sm:min-w-[210px] sm:max-w-[250px]" : ""}`}>
                      <h3 className="text-xl font-bold tracking-tight text-slate-950 transition group-hover:text-violet-700">{product.name}</h3>
                      <p className="mt-1.5 text-xs font-medium text-slate-500">{product.short}</p>
                    </div>
                    <p className={`mt-4 flex-1 text-sm leading-6 text-slate-600 ${view === "list" ? "sm:mt-0" : ""}`}>{product.description}</p>
                    <div className={`mt-5 border-t border-slate-100 pt-4 ${view === "list" ? "sm:mt-0 sm:min-w-[150px] sm:border-0 sm:pt-0" : ""}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Database connection</div>
                          <div className="mt-1 text-sm font-bold text-slate-800">
                            {catalogueStatus === "checking"
                              ? "Checking registry"
                              : catalogueStatus === "unavailable"
                                ? "Registry unavailable"
                                : `${getActiveModuleCount(getRegistryProduct(product))} / 12 active modules`}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500">
                            {catalogueStatus !== "available"
                              ? "Organization enablement not verified"
                              : getRegistryProduct(product)
                                ? `Organization: ${getOrganizationProductStatus(getRegistryProduct(product))}`
                                : "No active product definition visible"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openSelectedProduct(product)}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                          aria-label={`Explore ${product.name}`}
                        >
                          Explore <span aria-hidden="true">↗</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  {view === "grid" && (
                    <div className="flex flex-wrap gap-1.5 px-5 pb-5 sm:px-6 sm:pb-6">
                      {(getRegistryProduct(product)?.modules ?? []).slice(0, 3).map((module) => (
                        <span key={module.code} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] font-medium text-slate-500">{module.name}</span>
                      ))}
                      {(getRegistryProduct(product)?.modules.length ?? 0) > 3 && <span className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-bold text-violet-700">+{(getRegistryProduct(product)?.modules.length ?? 0) - 3} more</span>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="px-5 pb-12 sm:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { number: "01", title: "Shared foundation", text: "Identity, organisations, roles, permissions, notifications, audit history and common reporting patterns." },
              { number: "02", title: "Domain-specific workflows", text: "Each operating system models the real processes, records and decisions of its sector." },
              { number: "03", title: "Connected intelligence", text: "Consistent data structures and integration boundaries enable cross-system visibility." }
            ].map((item) => (
              <div key={item.number} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-xs font-black tracking-[0.15em] text-violet-600">{item.number} / FOUNDATION</div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">SAKATA TECHNOLOGIES · MASTER PRODUCT CATALOGUE · Portfolio definitions describe intended product scope, not confirmation that every listed capability is already implemented.</p>
        </section>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeSelectedProduct(); }}
        >
          <section data-catalogue-dialog tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
            <div className={`relative overflow-hidden bg-gradient-to-br ${selected.accent} px-6 py-7 text-white sm:px-9 sm:py-9`}>
              <button ref={closeButtonRef} type="button" onClick={closeSelectedProduct} aria-label="Close product details" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xl transition hover:bg-white/20">×</button>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">{selected.category} / Product system</div>
              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-3xl">{selected.icon}</div>
                <div className="pr-7">
                  <h2 id="product-dialog-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">{selected.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/85">{selected.short}</p>
                </div>
              </div>
              <p className="mt-6 max-w-3xl text-sm leading-7 text-white/90">{selected.description}</p>
              <div className="mt-5 rounded-xl border border-white/20 bg-white/10 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/70">Product promise</div>
                <div className="mt-1 text-sm font-semibold">{selected.promise}</div>
              </div>
            </div>
            <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_0.85fr]">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-violet-600">Registry status</div>
                <h3 className="mt-2 text-xl font-bold">Database-backed connections</h3>
                {(() => {
                  const registeredProduct = getRegistryProduct(selected);
                  return (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                      <p>
                        <span className="font-semibold">Product definition:</span>{" "}
                        {catalogueStatus === "checking"
                          ? "Checking"
                          : catalogueStatus === "unavailable"
                            ? "Unavailable"
                            : registeredProduct
                              ? registeredProduct.status
                              : "No active definition visible"}
                      </p>
                      <p className="mt-2">
                        <span className="font-semibold">Modules assigned:</span>{" "}
                        {catalogueStatus === "available"
                          ? `${getActiveModuleCount(registeredProduct)} / 12 active (${registeredProduct?.modules.length ?? 0} assignments recorded)`
                          : "Not verified"}
                      </p>
                      <p className="mt-2">
                        <span className="font-semibold">Organization enabled:</span>{" "}
                        {catalogueStatus === "available"
                          ? getOrganizationProductStatus(registeredProduct)
                          : "Not verified"}
                      </p>
                      <p className="mt-2">
                        <span className="font-semibold">Application functionality:</span>{" "}
                        Not verified
                      </p>
                    </div>
                  );
                })()}
                <h3 className="mt-6 text-lg font-bold">Registered modules & destinations</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Routes are offered only for verified module codes with an implemented application page. Destination pages enforce their own permissions.
                </p>
                {catalogueStatus === "available" &&
                getRegistryProduct(selected)?.modules.length ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {getRegistryProduct(selected)?.modules.map((module) => {
                      const destination = getModuleDestination(module.code);
                      const active =
                        module.definitionStatus === "active" &&
                        module.assignmentStatus === "active";

                      return (
                        <div key={module.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-slate-700">{module.name}</span>
                            <span className="mt-1 block truncate text-[10px] text-slate-500">
                              {module.code} · definition {module.definitionStatus} · assignment {module.assignmentStatus}
                            </span>
                          </div>
                          {!active ? (
                            <span className="shrink-0 text-[10px] text-slate-500">Inactive</span>
                          ) : destination ? (
                            <Link
                              className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-violet-700 hover:bg-violet-50"
                              href={destination.href}
                            >
                              Open {destination.label}
                            </Link>
                          ) : (
                            <span className="shrink-0 text-right text-[10px] text-slate-500">Coming soon · no implemented route</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    {catalogueStatus === "checking"
                      ? "Checking registered module assignments."
                      : catalogueStatus === "unavailable"
                        ? "Database module assignments are not verified."
                        : "No registered module assignments are visible for this product."}
                  </p>
                )}
                <h3 className="mt-8 text-lg font-bold">Core capabilities</h3>
                <ul className="mt-3 space-y-3">
                  {selected.capabilities.map((capability) => (
                    <li key={capability} className="flex gap-3 text-sm leading-6 text-slate-600">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600">✓</span>
                      {capability}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-7">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-violet-600">Designed for</div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{selected.audience}</p>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-violet-600">Key workflows</div>
                  <div className="mt-3 space-y-2">
                    {selected.workflows.map((workflow, index) => (
                      <div key={workflow} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">{index + 1}</span>
                        <p className="text-xs font-medium leading-5 text-slate-700">{workflow}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-violet-600">Core records</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selected.records.map((record) => <span key={record} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">{record}</span>)}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-950 p-5 text-white">
                  <div className="text-xs font-bold">Portfolio specification</div>
                  <p className="mt-2 text-xs leading-5 text-slate-300">This catalogue defines product scope. Actual implementation, permissions, integrations and operational readiness must be verified against the application and its database.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-200 px-6 py-4 sm:px-9">
              <button type="button" onClick={closeSelectedProduct} className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-bold text-white transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">Back to catalogue</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
