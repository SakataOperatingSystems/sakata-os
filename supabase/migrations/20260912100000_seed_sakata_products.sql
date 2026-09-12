-- SAKATA OS
-- Initial Product Catalogue
-- Registers the first SAKATA domain products.

insert into public.product_definitions (
    code,
    name,
    description,
    status
)
values
(
    'school_os',
    'SAKATA School OS',
    'Operational management platform for schools and educational institutions.',
    'active'
),
(
    'pharmacy_os',
    'SAKATA Pharmacy OS',
    'Operational management platform for pharmacies and pharmaceutical retail operations.',
    'active'
),
(
    'hospital_os',
    'SAKATA Hospital OS',
    'Operational management platform for hospitals, clinics, patient workflows and healthcare operations.',
    'active'
),
(
    'hotel_os',
    'SAKATA Hotel OS',
    'Operational management platform for hotels, accommodation and hospitality operations.',
    'active'
),
(
    'retail_os',
    'SAKATA Retail OS',
    'Operational management platform for supermarkets, shops and retail businesses.',
    'active'
),
(
    'wholesale_os',
    'SAKATA Wholesale OS',
    'Operational management platform for wholesalers, distributors and bulk trading operations.',
    'active'
),
(
    'factory_os',
    'SAKATA Factory OS',
    'Operational management platform for manufacturing and factory operations.',
    'active'
),
(
    'restaurant_os',
    'SAKATA Restaurant OS',
    'Operational management platform for restaurants, cafes and food-service businesses.',
    'active'
),
(
    'petrol_station_os',
    'SAKATA Petrol Station OS',
    'Operational management platform for petrol stations and fuel retail operations.',
    'active'
),
(
    'warehouse_os',
    'SAKATA Warehouse OS',
    'Operational management platform for warehouses, stock control and distribution operations.',
    'active'
),
(
    'ngo_os',
    'SAKATA NGO OS',
    'Operational management platform for non-governmental and community organizations.',
    'active'
),
(
    'training_os',
    'SAKATA Training OS',
    'Operational management platform for vocational institutions, training centres and professional education providers.',
    'active'
)
on conflict (code)
do update set
    name = excluded.name,
    description = excluded.description,
    status = excluded.status;