-- Reuses the live canonical product and module identities; inserts only missing rows and links.
-- Existing IDs, descriptions, statuses, assignments, and organization enablement are never overwritten.

begin;

create temporary table sakata_expected_catalogue_products (
    code text primary key,
    name text not null unique
) on commit drop;

insert into sakata_expected_catalogue_products (code, name)
values
    ('school_os', 'SAKATA Education OS'),
    ('business_os', 'SAKATA Business OS'),
    ('retail_os', 'SAKATA Commerce OS'),
    ('finance_os', 'SAKATA Finance OS'),
    ('fleet_mobility_os', 'SAKATA Fleet & Mobility OS'),
    ('real_estate_os', 'SAKATA Property OS'),
    ('hotel_os', 'SAKATA Hospitality OS'),
    ('garage_os', 'SAKATA Garage OS'),
    ('parking_access_os', 'SAKATA Parking & Access OS'),
    ('factory_os', 'SAKATA Manufacturing OS'),
    ('microfinance_os', 'SAKATA Microfinance OS'),
    ('wholesale_os', 'SAKATA Supply Chain OS'),
    ('hospital_os', 'SAKATA Healthcare Administration OS'),
    ('construction_os', 'SAKATA Construction OS'),
    ('agriculture_os', 'SAKATA Agriculture OS'),
    ('workforce_os', 'SAKATA Workforce OS');

do $$
declare
    mismatch record;
begin
    select expected.code, expected.name, actual.name as actual_name, actual.status as actual_status
    into mismatch
    from sakata_expected_catalogue_products expected
    left join public.product_definitions actual on actual.code = expected.code
    where (actual.id is not null and (actual.name <> expected.name or actual.status <> 'active'))
       or (actual.id is null and exists (
            select 1 from public.product_definitions duplicate
            where lower(duplicate.name) = lower(expected.name)
       ))
    limit 1;

    if found then
        raise exception 'Canonical product conflict for code %, expected %, actual %, status %',
            mismatch.code, mismatch.name, mismatch.actual_name, mismatch.actual_status;
    end if;
end;
$$;

insert into public.product_definitions (code, name, status)
select code, name, 'active' from sakata_expected_catalogue_products
on conflict (code) do nothing;

create temporary table sakata_expected_catalogue_modules (
    product_code text not null,
    module_code text not null,
    module_name text not null,
    display_order integer not null check (display_order > 0),
    primary key (product_code, module_code),
    unique (product_code, display_order)
) on commit drop;

insert into sakata_expected_catalogue_modules (product_code, module_code, module_name, display_order)
values
    ('school_os', 'education_os_admissions_enquiries', 'Admissions & enquiries', 10),
    ('school_os', 'education_os_student_information', 'Student information', 20),
    ('school_os', 'education_os_classrooms_timetables', 'Classrooms & timetables', 30),
    ('school_os', 'education_os_attendance', 'Attendance', 40),
    ('school_os', 'education_os_examinations_grading', 'Examinations & grading', 50),
    ('school_os', 'education_os_fees_billing', 'Fees & billing', 60),
    ('school_os', 'education_os_parent_communication', 'Parent communication', 70),
    ('school_os', 'education_os_staff_hr', 'Staff & HR', 80),
    ('school_os', 'education_os_transport', 'Transport', 90),
    ('school_os', 'education_os_library', 'Library', 100),
    ('school_os', 'education_os_inventory', 'Inventory', 110),
    ('school_os', 'education_os_reports_analytics', 'Reports & analytics', 120),
    ('business_os', 'business_os_executive_dashboard', 'Executive dashboard', 10),
    ('business_os', 'business_os_crm', 'CRM', 20),
    ('business_os', 'business_os_tasks_projects', 'Tasks & projects', 30),
    ('business_os', 'business_os_approvals', 'Approvals', 40),
    ('business_os', 'business_os_documents', 'Documents', 50),
    ('business_os', 'business_os_team_directory', 'Team directory', 60),
    ('business_os', 'business_os_expenses', 'Expenses', 70),
    ('business_os', 'business_os_budgets', 'Budgets', 80),
    ('business_os', 'business_os_service_requests', 'Service requests', 90),
    ('business_os', 'business_os_reports', 'Reports', 100),
    ('business_os', 'business_os_notifications', 'Notifications', 110),
    ('business_os', 'business_os_organisation_settings', 'Organisation settings', 120),
    ('retail_os', 'commerce_os_point_of_sale', 'Point of sale', 10),
    ('retail_os', 'commerce_os_product_catalogue', 'Product catalogue', 20),
    ('retail_os', 'commerce_os_stock_control', 'Stock control', 30),
    ('retail_os', 'commerce_os_purchasing', 'Purchasing', 40),
    ('retail_os', 'commerce_os_suppliers', 'Suppliers', 50),
    ('retail_os', 'commerce_os_customer_accounts', 'Customer accounts', 60),
    ('retail_os', 'commerce_os_discounts_promotions', 'Discounts & promotions', 70),
    ('retail_os', 'commerce_os_returns', 'Returns', 80),
    ('retail_os', 'commerce_os_branch_management', 'Branch management', 90),
    ('retail_os', 'commerce_os_cash_up', 'Cash-up', 100),
    ('retail_os', 'commerce_os_sales_reports', 'Sales reports', 110),
    ('retail_os', 'commerce_os_loyalty', 'Loyalty', 120),
    ('finance_os', 'finance_os_chart_of_accounts', 'Chart of accounts', 10),
    ('finance_os', 'finance_os_general_ledger', 'General ledger', 20),
    ('finance_os', 'finance_os_accounts_receivable', 'Accounts receivable', 30),
    ('finance_os', 'finance_os_accounts_payable', 'Accounts payable', 40),
    ('finance_os', 'finance_os_cash_bank', 'Cash & bank', 50),
    ('finance_os', 'finance_os_budgets', 'Budgets', 60),
    ('finance_os', 'finance_os_expenses', 'Expenses', 70),
    ('finance_os', 'finance_os_reconciliation', 'Reconciliation', 80),
    ('finance_os', 'finance_os_financial_periods', 'Financial periods', 90),
    ('finance_os', 'finance_os_statements', 'Statements', 100),
    ('finance_os', 'finance_os_audit_trail', 'Audit trail', 110),
    ('finance_os', 'finance_os_management_reports', 'Management reports', 120),
    ('fleet_mobility_os', 'fleet_mobility_os_vehicle_register', 'Vehicle register', 10),
    ('fleet_mobility_os', 'fleet_mobility_os_drivers', 'Drivers', 20),
    ('fleet_mobility_os', 'fleet_mobility_os_trip_planning', 'Trip planning', 30),
    ('fleet_mobility_os', 'fleet_mobility_os_dispatch', 'Dispatch', 40),
    ('fleet_mobility_os', 'fleet_mobility_os_fuel_management', 'Fuel management', 50),
    ('fleet_mobility_os', 'fleet_mobility_os_maintenance', 'Maintenance', 60),
    ('fleet_mobility_os', 'fleet_mobility_os_inspections', 'Inspections', 70),
    ('fleet_mobility_os', 'fleet_mobility_os_incidents', 'Incidents', 80),
    ('fleet_mobility_os', 'fleet_mobility_os_licences_compliance', 'Licences & compliance', 90),
    ('fleet_mobility_os', 'fleet_mobility_os_expenses', 'Expenses', 100),
    ('fleet_mobility_os', 'fleet_mobility_os_utilisation', 'Utilisation', 110),
    ('fleet_mobility_os', 'fleet_mobility_os_fleet_analytics', 'Fleet analytics', 120),
    ('real_estate_os', 'property_os_property_portfolio', 'Property portfolio', 10),
    ('real_estate_os', 'property_os_buildings_units', 'Buildings & units', 20),
    ('real_estate_os', 'property_os_tenants', 'Tenants', 30),
    ('real_estate_os', 'property_os_leases', 'Leases', 40),
    ('real_estate_os', 'property_os_rent_schedules', 'Rent schedules', 50),
    ('real_estate_os', 'property_os_collections', 'Collections', 60),
    ('real_estate_os', 'property_os_deposits', 'Deposits', 70),
    ('real_estate_os', 'property_os_maintenance', 'Maintenance', 80),
    ('real_estate_os', 'property_os_inspections', 'Inspections', 90),
    ('real_estate_os', 'property_os_utilities', 'Utilities', 100),
    ('real_estate_os', 'property_os_documents', 'Documents', 110),
    ('real_estate_os', 'property_os_occupancy_reports', 'Occupancy reports', 120),
    ('hotel_os', 'hospitality_os_reservations', 'Reservations', 10),
    ('hotel_os', 'hospitality_os_room_inventory', 'Room inventory', 20),
    ('hotel_os', 'hospitality_os_guest_profiles', 'Guest profiles', 30),
    ('hotel_os', 'hospitality_os_check_in_checkout', 'Check-in & checkout', 40),
    ('hotel_os', 'hospitality_os_housekeeping', 'Housekeeping', 50),
    ('hotel_os', 'hospitality_os_front_desk', 'Front desk', 60),
    ('hotel_os', 'hospitality_os_guest_requests', 'Guest requests', 70),
    ('hotel_os', 'hospitality_os_billing', 'Billing', 80),
    ('hotel_os', 'hospitality_os_rates_availability', 'Rates & availability', 90),
    ('hotel_os', 'hospitality_os_maintenance', 'Maintenance', 100),
    ('hotel_os', 'hospitality_os_staff_shifts', 'Staff shifts', 110),
    ('hotel_os', 'hospitality_os_occupancy_analytics', 'Occupancy analytics', 120),
    ('garage_os', 'garage_os_customer_vehicles', 'Customer vehicles', 10),
    ('garage_os', 'garage_os_bookings', 'Bookings', 20),
    ('garage_os', 'garage_os_vehicle_inspections', 'Vehicle inspections', 30),
    ('garage_os', 'garage_os_diagnostics', 'Diagnostics', 40),
    ('garage_os', 'garage_os_estimates', 'Estimates', 50),
    ('garage_os', 'garage_os_job_cards', 'Job cards', 60),
    ('garage_os', 'garage_os_technicians', 'Technicians', 70),
    ('garage_os', 'garage_os_parts_inventory', 'Parts inventory', 80),
    ('garage_os', 'garage_os_labour_tracking', 'Labour tracking', 90),
    ('garage_os', 'garage_os_invoices', 'Invoices', 100),
    ('garage_os', 'garage_os_warranty_claims', 'Warranty claims', 110),
    ('garage_os', 'garage_os_service_history', 'Service history', 120),
    ('parking_access_os', 'parking_access_os_parking_locations', 'Parking locations', 10),
    ('parking_access_os', 'parking_access_os_zones_bays', 'Zones & bays', 20),
    ('parking_access_os', 'parking_access_os_permits', 'Permits', 30),
    ('parking_access_os', 'parking_access_os_visitor_access', 'Visitor access', 40),
    ('parking_access_os', 'parking_access_os_parking_sessions', 'Parking sessions', 50),
    ('parking_access_os', 'parking_access_os_tariffs', 'Tariffs', 60),
    ('parking_access_os', 'parking_access_os_payments', 'Payments', 70),
    ('parking_access_os', 'parking_access_os_access_logs', 'Access logs', 80),
    ('parking_access_os', 'parking_access_os_enforcement', 'Enforcement', 90),
    ('parking_access_os', 'parking_access_os_equipment', 'Equipment', 100),
    ('parking_access_os', 'parking_access_os_operator_shifts', 'Operator shifts', 110),
    ('parking_access_os', 'parking_access_os_utilisation_reports', 'Utilisation reports', 120),
    ('factory_os', 'manufacturing_os_product_specifications', 'Product specifications', 10),
    ('factory_os', 'manufacturing_os_bills_of_materials', 'Bills of materials', 20),
    ('factory_os', 'manufacturing_os_production_planning', 'Production planning', 30),
    ('factory_os', 'manufacturing_os_work_orders', 'Work orders', 40),
    ('factory_os', 'manufacturing_os_work_centres', 'Work centres', 50),
    ('factory_os', 'manufacturing_os_material_issue', 'Material issue', 60),
    ('factory_os', 'manufacturing_os_quality_control', 'Quality control', 70),
    ('factory_os', 'manufacturing_os_finished_goods', 'Finished goods', 80),
    ('factory_os', 'manufacturing_os_waste_scrap', 'Waste & scrap', 90),
    ('factory_os', 'manufacturing_os_maintenance', 'Maintenance', 100),
    ('factory_os', 'manufacturing_os_production_costing', 'Production costing', 110),
    ('factory_os', 'manufacturing_os_performance_reports', 'Performance reports', 120),
    ('microfinance_os', 'microfinance_os_borrower_onboarding', 'Borrower onboarding', 10),
    ('microfinance_os', 'microfinance_os_applications', 'Applications', 20),
    ('microfinance_os', 'microfinance_os_assessments', 'Assessments', 30),
    ('microfinance_os', 'microfinance_os_loan_products', 'Loan products', 40),
    ('microfinance_os', 'microfinance_os_approvals', 'Approvals', 50),
    ('microfinance_os', 'microfinance_os_disbursement', 'Disbursement', 60),
    ('microfinance_os', 'microfinance_os_repayment_schedules', 'Repayment schedules', 70),
    ('microfinance_os', 'microfinance_os_collections', 'Collections', 80),
    ('microfinance_os', 'microfinance_os_arrears', 'Arrears', 90),
    ('microfinance_os', 'microfinance_os_guarantors', 'Guarantors', 100),
    ('microfinance_os', 'microfinance_os_cashier_operations', 'Cashier operations', 110),
    ('microfinance_os', 'microfinance_os_portfolio_reporting', 'Portfolio reporting', 120),
    ('wholesale_os', 'supply_chain_os_supplier_directory', 'Supplier directory', 10),
    ('wholesale_os', 'supply_chain_os_requisitions', 'Requisitions', 20),
    ('wholesale_os', 'supply_chain_os_purchase_orders', 'Purchase orders', 30),
    ('wholesale_os', 'supply_chain_os_receiving', 'Receiving', 40),
    ('wholesale_os', 'supply_chain_os_warehouses', 'Warehouses', 50),
    ('wholesale_os', 'supply_chain_os_bin_locations', 'Bin locations', 60),
    ('wholesale_os', 'supply_chain_os_stock_transfers', 'Stock transfers', 70),
    ('wholesale_os', 'supply_chain_os_picking_packing', 'Picking & packing', 80),
    ('wholesale_os', 'supply_chain_os_dispatch', 'Dispatch', 90),
    ('wholesale_os', 'supply_chain_os_deliveries', 'Deliveries', 100),
    ('wholesale_os', 'supply_chain_os_supplier_invoices', 'Supplier invoices', 110),
    ('wholesale_os', 'supply_chain_os_supply_analytics', 'Supply analytics', 120),
    ('hospital_os', 'healthcare_administration_os_patient_registration', 'Patient registration', 10),
    ('hospital_os', 'healthcare_administration_os_appointments', 'Appointments', 20),
    ('hospital_os', 'healthcare_administration_os_queue_management', 'Queue management', 30),
    ('hospital_os', 'healthcare_administration_os_provider_schedules', 'Provider schedules', 40),
    ('hospital_os', 'healthcare_administration_os_facility_services', 'Facility services', 50),
    ('hospital_os', 'healthcare_administration_os_billing_administration', 'Billing administration', 60),
    ('hospital_os', 'healthcare_administration_os_payments', 'Payments', 70),
    ('hospital_os', 'healthcare_administration_os_resource_allocation', 'Resource allocation', 80),
    ('hospital_os', 'healthcare_administration_os_referrals', 'Referrals', 90),
    ('hospital_os', 'healthcare_administration_os_document_controls', 'Document controls', 100),
    ('hospital_os', 'healthcare_administration_os_user_permissions', 'User permissions', 110),
    ('hospital_os', 'healthcare_administration_os_operations_reports', 'Operations reports', 120),
    ('construction_os', 'construction_os_project_portfolio', 'Project portfolio', 10),
    ('construction_os', 'construction_os_sites_work_packages', 'Sites & work packages', 20),
    ('construction_os', 'construction_os_schedules', 'Schedules', 30),
    ('construction_os', 'construction_os_tasks_milestones', 'Tasks & milestones', 40),
    ('construction_os', 'construction_os_budgets', 'Budgets', 50),
    ('construction_os', 'construction_os_procurement', 'Procurement', 60),
    ('construction_os', 'construction_os_materials', 'Materials', 70),
    ('construction_os', 'construction_os_contractors', 'Contractors', 80),
    ('construction_os', 'construction_os_site_diaries', 'Site diaries', 90),
    ('construction_os', 'construction_os_variations', 'Variations', 100),
    ('construction_os', 'construction_os_inspections', 'Inspections', 110),
    ('construction_os', 'construction_os_progress_claims', 'Progress claims', 120),
    ('agriculture_os', 'agriculture_os_farm_register', 'Farm register', 10),
    ('agriculture_os', 'agriculture_os_plots_fields', 'Plots & fields', 20),
    ('agriculture_os', 'agriculture_os_crop_cycles', 'Crop cycles', 30),
    ('agriculture_os', 'agriculture_os_planting_plans', 'Planting plans', 40),
    ('agriculture_os', 'agriculture_os_field_activities', 'Field activities', 50),
    ('agriculture_os', 'agriculture_os_inputs_supplies', 'Inputs & supplies', 60),
    ('agriculture_os', 'agriculture_os_labour', 'Labour', 70),
    ('agriculture_os', 'agriculture_os_equipment', 'Equipment', 80),
    ('agriculture_os', 'agriculture_os_harvest_records', 'Harvest records', 90),
    ('agriculture_os', 'agriculture_os_storage', 'Storage', 100),
    ('agriculture_os', 'agriculture_os_produce_sales', 'Produce sales', 110),
    ('agriculture_os', 'agriculture_os_yield_analytics', 'Yield analytics', 120),
    ('workforce_os', 'workforce_os_employee_directory', 'Employee directory', 10),
    ('workforce_os', 'workforce_os_teams_roles', 'Teams & roles', 20),
    ('workforce_os', 'workforce_os_shift_planning', 'Shift planning', 30),
    ('workforce_os', 'workforce_os_attendance', 'Attendance', 40),
    ('workforce_os', 'workforce_os_leave_requests', 'Leave requests', 50),
    ('workforce_os', 'workforce_os_work_assignments', 'Work assignments', 60),
    ('workforce_os', 'workforce_os_field_service', 'Field service', 70),
    ('workforce_os', 'workforce_os_timesheets', 'Timesheets', 80),
    ('workforce_os', 'workforce_os_expenses', 'Expenses', 90),
    ('workforce_os', 'workforce_os_equipment_allocation', 'Equipment allocation', 100),
    ('workforce_os', 'workforce_os_performance_reviews', 'Performance reviews', 110),
    ('workforce_os', 'workforce_os_workforce_reports', 'Workforce reports', 120);

do $$
declare
    mismatch record;
begin
    select expected.product_code, expected.module_code, expected.module_name,
           actual.name as actual_name, actual.status as actual_status
    into mismatch
    from sakata_expected_catalogue_modules expected
    left join public.module_definitions actual on actual.code = expected.module_code
    where actual.id is null
       or actual.name <> expected.module_name
       or actual.status <> 'active'
    limit 1;

    if found then
        raise exception 'Existing module definition missing or conflicting for product %, code %, expected %, actual %, status %',
            mismatch.product_code, mismatch.module_code, mismatch.module_name,
            mismatch.actual_name, mismatch.actual_status;
    end if;
end;
$$;

insert into public.product_modules (product_definition_id, module_definition_id, status, display_order)
select product.id, module.id, 'active', expected.display_order
from sakata_expected_catalogue_modules expected
join public.product_definitions product on product.code = expected.product_code
join public.module_definitions module on module.code = expected.module_code
on conflict (product_definition_id, module_definition_id) do nothing;

do $$
declare
    mismatch record;
begin
    select expected.product_code, expected.module_code,
           assignment.status as assignment_status, assignment.display_order as actual_order,
           expected.display_order as expected_order
    into mismatch
    from sakata_expected_catalogue_modules expected
    join public.product_definitions product on product.code = expected.product_code
    join public.module_definitions module on module.code = expected.module_code
    left join public.product_modules assignment
      on assignment.product_definition_id = product.id
     and assignment.module_definition_id = module.id
    where assignment.id is null
       or assignment.status <> 'active'
       or assignment.display_order <> expected.display_order
    limit 1;

    if found then
        raise exception 'Existing assignment is missing or conflicting for product %, module %, status %, order %, expected %',
            mismatch.product_code, mismatch.module_code, mismatch.assignment_status,
            mismatch.actual_order, mismatch.expected_order;
    end if;

    select product.code, count(assignment.id) filter (where assignment.status = 'active') as active_count
    into mismatch
    from sakata_expected_catalogue_products expected
    join public.product_definitions product on product.code = expected.code
    left join public.product_modules assignment on assignment.product_definition_id = product.id
    group by product.code
    having count(assignment.id) filter (where assignment.status = 'active') <> 12
    limit 1;

    if found then
        raise exception 'Canonical product % has % active assignments; expected 12',
            mismatch.code, mismatch.active_count;
    end if;
end;
$$;

commit;
