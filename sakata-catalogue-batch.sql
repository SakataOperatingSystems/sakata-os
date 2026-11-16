BEGIN;

CREATE TEMP TABLE sakata_catalogue_batch (
    target_code text NOT NULL,
    legacy_code text NOT NULL,
    product_name text NOT NULL,
    product_description text NOT NULL,
    modules jsonb NOT NULL,
    product_id uuid
) ON COMMIT DROP;

INSERT INTO sakata_catalogue_batch
(target_code, legacy_code, product_name, product_description, modules)
VALUES
('education_os','school_os','SAKATA Education OS','Operational management platform for schools and educational institutions.',
'["Admissions & enquiries","Student information","Classrooms & timetables","Attendance","Examinations & grading","Fees & billing","Parent communication","Staff & HR","Transport","Library","Inventory","Reports & analytics"]'),
('business_os','business_os','SAKATA Business OS','Integrated business operations, collaboration and management platform.',
'["Executive dashboard","CRM","Tasks & projects","Approvals","Documents","Team directory","Expenses","Budgets","Service requests","Reports","Notifications","Organisation settings"]'),
('commerce_os','retail_os','SAKATA Commerce OS','Retail sales, inventory, purchasing and customer operations platform.',
'["Point of sale","Product catalogue","Stock control","Purchasing","Suppliers","Customer accounts","Discounts & promotions","Returns","Branch management","Cash-up","Sales reports","Loyalty"]'),
('finance_os','finance_os','SAKATA Finance OS','Financial accounting, control, reconciliation and reporting platform.',
'["Chart of accounts","General ledger","Accounts receivable","Accounts payable","Cash & bank","Budgets","Expenses","Reconciliation","Financial periods","Statements","Audit trail","Management reports"]'),
('fleet_mobility_os','fleet_mobility_os','SAKATA Fleet & Mobility OS','Fleet, vehicle, driver, dispatch and mobility operations platform.',
'["Vehicle register","Drivers","Trip planning","Dispatch","Fuel management","Maintenance","Inspections","Incidents","Licences & compliance","Expenses","Utilisation","Fleet analytics"]'),
('property_os','real_estate_os','SAKATA Property OS','Property, tenancy, leasing, rent collection and facilities operations platform.',
'["Property portfolio","Buildings & units","Tenants","Leases","Rent schedules","Collections","Deposits","Maintenance","Inspections","Utilities","Documents","Occupancy reports"]'),
('hospitality_os','hotel_os','SAKATA Hospitality OS','Hospitality, accommodation, guest service and reservation operations platform.',
'["Reservations","Room inventory","Guest profiles","Check-in & checkout","Housekeeping","Front desk","Guest requests","Billing","Rates & availability","Maintenance","Staff shifts","Occupancy analytics"]'),
('garage_os','garage_os','SAKATA Garage OS','Vehicle servicing, workshop, technician, parts and repair management platform.',
'["Customer vehicles","Bookings","Vehicle inspections","Diagnostics","Estimates","Job cards","Technicians","Parts inventory","Labour tracking","Invoices","Warranty claims","Service history"]'),
('parking_access_os','parking_access_os','SAKATA Parking & Access OS','Parking facilities, access permissions, payments and enforcement platform.',
'["Parking locations","Zones & bays","Permits","Visitor access","Parking sessions","Tariffs","Payments","Access logs","Enforcement","Equipment","Operator shifts","Utilisation reports"]'),
('manufacturing_os','factory_os','SAKATA Manufacturing OS','Manufacturing, production planning, quality and factory operations platform.',
'["Product specifications","Bills of materials","Production planning","Work orders","Work centres","Material issue","Quality control","Finished goods","Waste & scrap","Maintenance","Production costing","Performance reports"]'),
('microfinance_os','microfinance_os','SAKATA Microfinance OS','Microfinance borrower, lending, repayment and portfolio operations platform.',
'["Borrower onboarding","Applications","Assessments","Loan products","Approvals","Disbursement","Repayment schedules","Collections","Arrears","Guarantors","Cashier operations","Portfolio reporting"]'),
('supply_chain_os','wholesale_os','SAKATA Supply Chain OS','Supply chain, procurement, warehousing and distribution operations platform.',
'["Supplier directory","Requisitions","Purchase orders","Receiving","Warehouses","Bin locations","Stock transfers","Picking & packing","Dispatch","Deliveries","Supplier invoices","Supply analytics"]'),
('healthcare_administration_os','hospital_os','SAKATA Healthcare Administration OS','Healthcare facility administration, patient flow and operational coordination platform.',
'["Patient registration","Appointments","Queue management","Provider schedules","Facility services","Billing administration","Payments","Resource allocation","Referrals","Document controls","User permissions","Operations reports"]'),
('construction_os','construction_os','SAKATA Construction OS','Construction project, site, procurement, contractor and progress management platform.',
'["Project portfolio","Sites & work packages","Schedules","Tasks & milestones","Budgets","Procurement","Materials","Contractors","Site diaries","Variations","Inspections","Progress claims"]'),
('agriculture_os','agriculture_os','SAKATA Agriculture OS','Farm, crop, field activity, harvest and agricultural resource management platform.',
'["Farm register","Plots & fields","Crop cycles","Planting plans","Field activities","Inputs & supplies","Labour","Equipment","Harvest records","Storage","Produce sales","Yield analytics"]'),
('workforce_os','workforce_os','SAKATA Workforce OS','Employee, team, shift, attendance and workforce operations platform.',
'["Employee directory","Teams & roles","Shift planning","Attendance","Leave requests","Work assignments","Field service","Timesheets","Expenses","Equipment allocation","Performance reviews","Workforce reports"]');

-- Insert missing products without changing existing product IDs or codes.
INSERT INTO public.product_definitions (code, name, description, status)
SELECT b.target_code, b.product_name, b.product_description, 'active'
FROM sakata_catalogue_batch b
WHERE NOT EXISTS (
    SELECT 1
    FROM public.product_definitions p
    WHERE p.code IN (b.legacy_code, b.target_code)
)
ON CONFLICT (code) DO NOTHING;

-- Resolve existing legacy codes first; otherwise use the canonical code.
UPDATE sakata_catalogue_batch b
SET product_id = COALESCE(
    (SELECT p.id FROM public.product_definitions p
     WHERE p.code = b.legacy_code LIMIT 1),
    (SELECT p.id FROM public.product_definitions p
     WHERE p.code = b.target_code LIMIT 1)
);

-- Every target must resolve to one existing or newly created product.
DO $$
BEGIN
    IF (SELECT count(*) FROM sakata_catalogue_batch WHERE product_id IS NOT NULL) <> 16 THEN
        RAISE EXCEPTION 'Catalogue preflight failed: not all 16 products resolved';
    END IF;

    IF (SELECT count(DISTINCT product_id) FROM sakata_catalogue_batch) <> 16 THEN
        RAISE EXCEPTION 'Catalogue preflight failed: product mappings are not unique';
    END IF;
END $$;

-- Apply the target display names and descriptions.
UPDATE public.product_definitions p
SET name = b.product_name,
    description = b.product_description,
    status = 'active',
    updated_at = now()
FROM sakata_catalogue_batch b
WHERE p.id = b.product_id;

-- Retire previous assignments for these 16 products; desired links are
-- reactivated below. Other products are not affected.
UPDATE public.product_modules pm
SET status = 'suspended',
    updated_at = now()
FROM sakata_catalogue_batch b
WHERE pm.product_definition_id = b.product_id;

-- Create or refresh 192 product-specific module definitions.
INSERT INTO public.module_definitions
(code, name, description, category, status)
SELECT
    b.target_code || '_' ||
      trim(both '_' FROM regexp_replace(
        lower(m.module_name), '[^a-z0-9]+', '_', 'g'
      )),
    m.module_name,
    m.module_name || ' module for ' || b.product_name || '.',
    b.target_code,
    'active'
FROM sakata_catalogue_batch b
CROSS JOIN LATERAL jsonb_array_elements_text(b.modules) AS m(module_name)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    status = 'active',
    updated_at = now();

-- Connect every module to its intended product.
INSERT INTO public.product_modules
(product_definition_id, module_definition_id, display_order, status)
SELECT
    b.product_id,
    md.id,
    (m.ordinality * 10)::integer,
    'active'
FROM sakata_catalogue_batch b
CROSS JOIN LATERAL
    jsonb_array_elements_text(b.modules) WITH ORDINALITY
    AS m(module_name, ordinality)
JOIN public.module_definitions md
  ON md.code = b.target_code || '_' ||
     trim(both '_' FROM regexp_replace(
       lower(m.module_name), '[^a-z0-9]+', '_', 'g'
     ))
ON CONFLICT (product_definition_id, module_definition_id)
DO UPDATE SET
    display_order = EXCLUDED.display_order,
    status = 'active',
    updated_at = now();

-- Fail and roll back unless every target product has exactly 12 active links.
DO $$
DECLARE
    product_count integer;
    bad_product_count integer;
    active_link_count integer;
BEGIN
    SELECT count(*) INTO product_count
    FROM sakata_catalogue_batch b
    JOIN public.product_definitions p ON p.id = b.product_id
    WHERE p.status = 'active'
      AND p.name = b.product_name;

    SELECT count(*) INTO bad_product_count
    FROM sakata_catalogue_batch b
    WHERE (
        SELECT count(*)
        FROM public.product_modules pm
        WHERE pm.product_definition_id = b.product_id
          AND pm.status = 'active'
    ) <> 12;

    SELECT count(*) INTO active_link_count
    FROM sakata_catalogue_batch b
    JOIN public.product_modules pm
      ON pm.product_definition_id = b.product_id
     AND pm.status = 'active';

    IF product_count <> 16
       OR bad_product_count <> 0
       OR active_link_count <> 192 THEN
        RAISE EXCEPTION
          'Catalogue verification failed: products %, bad products %, active links %',
          product_count, bad_product_count, active_link_count;
    END IF;
END $$;

-- Return the verified catalogue before COMMIT drops the temporary table.
SELECT
    p.code,
    p.name,
    count(pm.id) AS active_modules,
    array_agg(md.name ORDER BY pm.display_order) AS module_names
FROM sakata_catalogue_batch b
JOIN public.product_definitions p ON p.id = b.product_id
JOIN public.product_modules pm
  ON pm.product_definition_id = p.id
 AND pm.status = 'active'
JOIN public.module_definitions md ON md.id = pm.module_definition_id
GROUP BY p.code, p.name, b.target_code
ORDER BY b.target_code;

COMMIT;
