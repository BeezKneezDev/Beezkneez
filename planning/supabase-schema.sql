-- Beezkneez Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Customers table
create table customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now()
);

-- Services table
create table services (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

-- Jobs table
create table jobs (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade not null,
  service_id uuid references services(id) on delete set null,
  type text not null,
  description text,
  scheduled_date date,
  status text default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  amount decimal(10,2),
  created_at timestamptz default now()
);

-- Invoices table
create table invoices (
  id uuid default gen_random_uuid() primary key,
  invoice_number text unique not null,
  customer_id uuid references customers(id) on delete cascade not null,
  job_id uuid references jobs(id) on delete set null,
  amount decimal(10,2) not null,
  description text,
  status text default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),
  sent_at timestamptz,
  paid_at timestamptz,
  hnry_ref text,
  created_at timestamptz default now()
);

-- Notes (timestamped log — can belong to a customer, a job, or both)
create table notes (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table customers enable row level security;
alter table services enable row level security;
alter table jobs enable row level security;
alter table invoices enable row level security;
alter table notes enable row level security;

-- For now, allow all access for authenticated users (just Byron)
create policy "Authenticated users can do everything with services"
  on services for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can do everything with customers"
  on customers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can do everything with jobs"
  on jobs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can do everything with invoices"
  on invoices for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can do everything with notes"
  on notes for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Quotes table
create table quotes (
  id uuid default gen_random_uuid() primary key,
  quote_number text unique not null,
  contact_name text not null,
  contact_email text,
  contact_phone text,
  contact_address text,
  service_id uuid references services(id) on delete set null,
  description text,
  amount decimal(10,2),
  status text default 'pending' check (status in ('pending', 'sent', 'approved', 'declined')),
  customer_id uuid references customers(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  created_at timestamptz default now()
);

alter table quotes enable row level security;

create policy "Authenticated users can do everything with quotes"
  on quotes for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Seed data: customers
insert into customers (name, address, email, phone) values
  ('Sarah Mitchell', '14 Banksia St, Capalaba', 'sarah.m@email.com', '0412 345 678'),
  ('James Thornton', '8 Wattle Dr, Cleveland', 'j.thornton@email.com', '0423 456 789'),
  ('Linda Nguyen', '22 Palm Ave, Thornlands', 'linda.n@email.com', '0434 567 890'),
  ('Mark Davidson', '5 Cedar Ct, Victoria Point', 'mark.d@email.com', '0445 678 901'),
  ('Rachel Cooper', '31 Eucalyptus Rd, Redland Bay', 'rachel.c@email.com', '0456 789 012'),
  ('David & Sue Park', '17 Grevillea Ln, Ormiston', 'parkfamily@email.com', '0467 890 123'),
  ('Tom Harris', '9 Bottlebrush Cres, Alexandra Hills', 'tom.harris@email.com', '0478 901 234');

-- Seed data: jobs (using subqueries to get customer IDs)
insert into jobs (customer_id, type, description, scheduled_date, status, amount) values
  ((select id from customers where name = 'Sarah Mitchell'), 'Lawn Mowing', 'Front & back yard — weekly service', '2026-03-10', 'scheduled', 95.00),
  ((select id from customers where name = 'James Thornton'), 'Hedge Trimming', 'Side hedges and front border', '2026-03-10', 'scheduled', 180.00),
  ((select id from customers where name = 'Linda Nguyen'), 'Garden Cleanup', 'Full garden tidy — weeding, pruning, mulch', '2026-03-11', 'in_progress', 320.00),
  ((select id from customers where name = 'Mark Davidson'), 'Lawn Mowing', 'Large corner block — ride-on required', '2026-03-12', 'scheduled', 95.00),
  ((select id from customers where name = 'Rachel Cooper'), 'Mulching', 'Garden beds front and back', '2026-03-06', 'completed', 340.00),
  ((select id from customers where name = 'David & Sue Park'), 'Lawn Mowing', 'Weekly front and back', '2026-03-05', 'completed', 150.00);

-- Seed data: invoices
insert into invoices (invoice_number, customer_id, amount, description, status, sent_at, paid_at) values
  ('INV-001', (select id from customers where name = 'Sarah Mitchell'), 95.00, 'Lawn Mowing — 3 Mar 2026', 'paid', '2026-03-03', '2026-03-05'),
  ('INV-002', (select id from customers where name = 'James Thornton'), 180.00, 'Hedge Trimming — 28 Feb 2026', 'paid', '2026-02-28', '2026-03-02'),
  ('INV-003', (select id from customers where name = 'Linda Nguyen'), 320.00, 'Garden Cleanup — 1 Mar 2026', 'sent', '2026-03-01', null),
  ('INV-004', (select id from customers where name = 'Mark Davidson'), 95.00, 'Lawn Mowing — 25 Feb 2026', 'paid', '2026-02-25', '2026-02-27'),
  ('INV-005', (select id from customers where name = 'Rachel Cooper'), 340.00, 'Mulching — 2 Mar 2026', 'sent', '2026-03-02', null),
  ('INV-006', (select id from customers where name = 'David & Sue Park'), 150.00, 'Lawn Mowing — 27 Feb 2026', 'paid', '2026-02-27', '2026-03-01'),
  ('INV-007', (select id from customers where name = 'Tom Harris'), 450.00, 'Lawn Mowing — 6 Mar 2026', 'sent', '2026-03-06', null);
