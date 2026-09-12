-- SAKATA OS
-- Core Reusable Module Catalogue
-- These modules are reusable capabilities from which SAKATA products are composed.

insert into public.module_definitions (
    code,
    name,
    description,
    category,
    status
)
values

-- PEOPLE & ACCESS
(
    'people',
    'People',
    'Core person records used across operational domains.',
    'people',
    'active'
),
(
    'staff',
    'Staff',
    'Staff and workforce management capability.',
    'people',
    'active'
),
(
    'customers',
    'Customers',
    'Customer, client or service-recipient management.',
    'people',
    'active'
),
(
    'suppliers',
    'Suppliers',
    'Supplier and vendor management.',
    'people',
    'active'
),

-- OPERATIONS
(
    'tasks',
    'Tasks',
    'Operational task creation, assignment, tracking and completion.',
    'operations',
    'active'
),
(
    'workflows',
    'Workflows',
    'Configurable operational process and workflow management.',
    'operations',
    'active'
),
(
    'approvals',
    'Approvals',
    'Controlled approval and decision workflows.',
    'governance',
    'active'
),
(
    'incidents',
    'Incidents',
    'Operational incident recording, investigation and resolution.',
    'operations',
    'active'
),
(
    'activities',
    'Activities & Events',
    'Planning and management of operational activities and events.',
    'operations',
    'active'
),
(
    'documents',
    'Documents',
    'Document registration, classification and operational tracking.',
    'operations',
    'active'
),
(
    'communications',
    'Communications',
    'Operational communication records and communication tracking.',
    'operations',
    'active'
),

-- TIME & SCHEDULING
(
    'calendar',
    'Calendar',
    'Organizational calendar, dates, periods and scheduling.',
    'time',
    'active'
),
(
    'attendance',
    'Attendance',
    'Attendance and presence tracking.',
    'time',
    'active'
),
(
    'appointments',
    'Appointments',
    'Appointment and scheduled-service management.',
    'time',
    'active'
),

-- COMMERCIAL
(
    'sales',
    'Sales',
    'Sales transactions and commercial order processing.',
    'commercial',
    'active'
),
(
    'purchasing',
    'Purchasing',
    'Purchasing and supplier order management.',
    'commercial',
    'active'
),
(
    'billing',
    'Billing',
    'Customer billing, charges and account management.',
    'finance',
    'active'
),
(
    'payments',
    'Payments',
    'Payment recording, allocation and reconciliation.',
    'finance',
    'active'
),

-- FINANCE
(
    'finance',
    'Finance',
    'Financial transaction and operational finance management.',
    'finance',
    'active'
),
(
    'budgets',
    'Budgets',
    'Budget planning, allocation and monitoring.',
    'finance',
    'active'
),
(
    'financial_support',
    'Financial Support',
    'Controlled financial assistance, exemptions and support programmes.',
    'finance',
    'active'
),

-- INVENTORY & SUPPLY CHAIN
(
    'inventory',
    'Inventory',
    'Stock items, quantities and inventory control.',
    'supply_chain',
    'active'
),
(
    'inventory_transactions',
    'Inventory Transactions',
    'Stock movements, adjustments, transfers and consumption.',
    'supply_chain',
    'active'
),
(
    'warehousing',
    'Warehousing',
    'Warehouse locations, storage and stock handling.',
    'supply_chain',
    'active'
),
(
    'procurement',
    'Procurement',
    'Controlled procurement from requirement through acquisition.',
    'supply_chain',
    'active'
),

-- ASSETS & FACILITIES
(
    'assets',
    'Assets',
    'Organizational asset registration and lifecycle management.',
    'assets',
    'active'
),
(
    'maintenance',
    'Maintenance',
    'Maintenance requests, work and maintenance history.',
    'assets',
    'active'
),
(
    'facilities',
    'Facilities',
    'Facilities, spaces and physical-resource management.',
    'assets',
    'active'
),

-- GOVERNANCE & CONTROL
(
    'audit',
    'Audit',
    'System activity, changes and accountability tracking.',
    'governance',
    'active'
),
(
    'compliance',
    'Compliance',
    'Operational compliance requirements and evidence tracking.',
    'governance',
    'active'
),
(
    'requirements',
    'Requirements',
    'Tracking of required submissions, items, actions and obligations.',
    'governance',
    'active'
),

-- REPORTING & INTELLIGENCE
(
    'reporting',
    'Reporting',
    'Operational reporting and management information.',
    'intelligence',
    'active'
),
(
    'dashboards',
    'Dashboards',
    'Management dashboards and operational visibility.',
    'intelligence',
    'active'
),
(
    'alerts',
    'Alerts & Notifications',
    'Operational alerts, notifications and escalation signals.',
    'intelligence',
    'active'
),
(
    'intelligence',
    'Operational Intelligence',
    'Analysis, thresholds, indicators and decision-support capability.',
    'intelligence',
    'active'
),

-- EDUCATION
(
    'students',
    'Students',
    'Student master records and lifecycle management.',
    'education',
    'active'
),
(
    'admissions',
    'Admissions',
    'Admission applications and student intake processes.',
    'education',
    'active'
),
(
    'enrollments',
    'Enrollments',
    'Enrollment and academic participation management.',
    'education',
    'active'
),
(
    'academic_structure',
    'Academic Structure',
    'Classes, subjects, academic periods and teaching structure.',
    'education',
    'active'
),
(
    'assessments',
    'Assessments',
    'Academic assessments and assessment configuration.',
    'education',
    'active'
),
(
    'student_results',
    'Student Results',
    'Student academic results and performance records.',
    'education',
    'active'
),

-- HEALTHCARE
(
    'patients',
    'Patients',
    'Patient records and healthcare service lifecycle.',
    'healthcare',
    'active'
),
(
    'clinical_visits',
    'Clinical Visits',
    'Patient consultation and clinical encounter management.',
    'healthcare',
    'active'
),
(
    'admissions_discharge',
    'Admissions & Discharge',
    'Healthcare admission, transfer and discharge workflows.',
    'healthcare',
    'active'
),

-- HOSPITALITY
(
    'guests',
    'Guests',
    'Guest records and hospitality customer lifecycle.',
    'hospitality',
    'active'
),
(
    'reservations',
    'Reservations',
    'Reservation and booking management.',
    'hospitality',
    'active'
),
(
    'rooms',
    'Rooms & Accommodation',
    'Rooms, accommodation units and availability management.',
    'hospitality',
    'active'
),

-- RETAIL & COMMERCIAL OPERATIONS
(
    'products',
    'Products',
    'Product and service catalogue management.',
    'commercial',
    'active'
),
(
    'point_of_sale',
    'Point of Sale',
    'Point-of-sale transaction processing and sales control.',
    'commercial',
    'active'
),
(
    'pricing',
    'Pricing',
    'Prices, price lists and pricing rules.',
    'commercial',
    'active'
),

-- MANUFACTURING
(
    'manufacturing',
    'Manufacturing',
    'Production planning, execution and manufacturing operations.',
    'manufacturing',
    'active'
),
(
    'production_orders',
    'Production Orders',
    'Controlled production orders and production status tracking.',
    'manufacturing',
    'active'
),
(
    'quality_control',
    'Quality Control',
    'Quality inspections, defects and corrective actions.',
    'manufacturing',
    'active'
)

on conflict (code)
do update set
    name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    status = excluded.status;