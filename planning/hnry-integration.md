# Beezkneez + Hnry Integration Plan

## Overview

Beezkneez is the client-facing CRM and invoicing system. Hnry runs invisibly in the background as the tax/payment engine. The client never sees or interacts with Hnry.

## Architecture

```
┌─────────────┐          ┌────────┐          ┌──────┐
│  Beezkneez  │──create──→│ Zapier │──mirror──→│ Hnry │
│  (frontend  │          │        │          │      │
│  + Supabase)│←─paid────│        │←─paid────│      │
└─────────────┘          └────────┘          └──────┘
       │                                        ↑
       │         ┌──────────┐                   │
       └─invoice→│  Client  │──pays into────────┘
                 └──────────┘
```

## How It Works

### Invoice Flow (Outbound)

1. You finish a job in Beezkneez, click "Create Invoice"
2. Invoice pre-fills with customer details, job description, amount
3. You review and click "Send"
4. Beezkneez generates a branded PDF (your logo, ABN, Hnry bank details)
5. Beezkneez emails the PDF to the client
6. A webhook fires to Zapier, which creates a matching invoice in Hnry (does NOT send to client — just logs it for tax/income tracking)

### Payment Flow (Inbound)

1. Client pays into your Hnry bank account (details on the invoice)
2. Hnry auto-detects the payment and matches it to the invoice
3. Hnry calculates tax, sets aside GST/income tax, pays the rest to your personal account
4. Zapier triggers on "invoice paid" in Hnry
5. Zapier calls Beezkneez webhook: `PATCH /api/invoices/:id { status: "paid" }`
6. Beezkneez updates the invoice status — customer page shows "Paid"

### What the Client Sees

- A professional invoice from **Beezkneez** with your branding
- Payment details pointing to your **Hnry bank account**
- That's it — they never see or hear about Hnry

### What Hnry Does (Behind the Scenes)

- Receives a mirrored copy of every invoice via Zapier
- Auto-matches incoming payments
- Handles GST, income tax, ACC levies
- Pays your personal account the net amount

## Two-Way API

### Outbound (Beezkneez → Zapier → Hnry)

- **Trigger:** New invoice created in Supabase
- **Zapier action:** Create Invoice in Hnry (client, amount, line items, reference number)
- **Purpose:** Hnry knows about the invoice for tax tracking

### Inbound (Hnry → Zapier → Beezkneez)

- **Trigger:** Invoice marked paid in Hnry
- **Zapier action:** Call Beezkneez webhook (Supabase Edge Function)
- **Payload:** `{ invoice_ref, status: "paid", paid_date, amount }`
- **Purpose:** Beezkneez dashboard shows real-time payment status

## Database Schema (Supabase)

### customers

| Column     | Type   | Notes                    |
| ---------- | ------ | ------------------------ |
| id         | uuid   | Primary key              |
| name       | text   | Full name                |
| address    | text   | Service address          |
| email      | text   |                          |
| phone      | text   |                          |
| notes      | text   | Optional                 |
| created_at | timestamp | Auto                  |

### jobs

| Column      | Type   | Notes                           |
| ----------- | ------ | ------------------------------- |
| id          | uuid   | Primary key                     |
| customer_id | uuid   | FK → customers                  |
| type        | text   | Lawn Mowing, Hedge Trimming etc |
| description | text   | Job details                     |
| scheduled_date | date |                                |
| status      | text   | scheduled, in_progress, completed, cancelled |
| amount      | decimal |                                |
| created_at  | timestamp | Auto                         |

### invoices

| Column      | Type   | Notes                           |
| ----------- | ------ | ------------------------------- |
| id          | uuid   | Primary key                     |
| invoice_number | text | INV-001, INV-002 etc           |
| customer_id | uuid   | FK → customers                  |
| job_id      | uuid   | FK → jobs (nullable for extras) |
| amount      | decimal |                                |
| description | text   | Line item summary               |
| status      | text   | draft, sent, paid, overdue      |
| sent_at     | timestamp | When emailed to client        |
| paid_at     | timestamp | When Hnry confirms payment    |
| hnry_ref    | text   | Hnry's invoice ID for matching  |
| created_at  | timestamp | Auto                         |

## Customer Detail View

Clicking a customer in the dashboard shows:

```
Sarah Mitchell
14 Banksia St, Capalaba | 0412 345 678 | sarah.m@email.com

Total Invoiced: $1,140.00    Paid: $950.00    Outstanding: $190.00

Jobs (12)
─────────────────────────────────────────────────────
Lawn Mowing      3 Mar 2026    $95.00    INV-001   Paid
Lawn Mowing     24 Feb 2026    $95.00    INV-008   Paid
Hedge Trim      15 Feb 2026   $180.00    INV-012   Paid
Garden Cleanup  10 Feb 2026   $120.00    INV-015   Unpaid
...
```

## Zapier Setup

### Zap 1: New Invoice → Hnry

- **Trigger:** Supabase → New row in `invoices` table (where status = "sent")
- **Action:** Hnry → Create Invoice
  - Client: match by name or create
  - Amount, description, reference number
  - Do NOT send from Hnry (just record it)

### Zap 2: Payment Received → Beezkneez

- **Trigger:** Hnry → Invoice paid
- **Action:** Webhooks by Zapier → POST to Supabase Edge Function
  - URL: `https://<project>.supabase.co/functions/v1/hnry-payment-webhook`
  - Body: `{ hnry_ref, status: "paid", paid_date }`

## Tech Stack

| Layer          | Tool                | Purpose                        |
| -------------- | ------------------- | ------------------------------ |
| Frontend       | React + Vite        | Dashboard UI (already built)   |
| Database       | Supabase (Postgres) | Customers, jobs, invoices      |
| Auth           | Supabase Auth       | Login for Byron                |
| File storage   | Supabase Storage    | Invoice PDFs                   |
| Email          | Resend (free tier)  | Send invoices to clients       |
| PDF generation | @react-pdf/renderer | Generate branded invoice PDFs  |
| Webhooks       | Supabase Edge Functions | Inbound from Zapier/Hnry   |
| Integration    | Zapier              | Bridge between Beezkneez & Hnry|
| Tax engine     | Hnry                | Payment processing, tax, GST   |

## Build Order

### Phase 1: Real Data (Supabase Backend)

1. Set up Supabase project
2. Create tables: customers, jobs, invoices
3. Connect dashboard to Supabase (replace mock data)
4. Add Supabase Auth (login for Byron)

### Phase 2: Customer Detail Pages

5. Customer detail view — click in, see full job/invoice history
6. Job creation from customer page
7. Totals: invoiced, paid, outstanding per customer

### Phase 3: Invoicing

8. Invoice creation from completed jobs
9. PDF generation with Beezkneez branding + Hnry bank details
10. Email sending via Resend

### Phase 4: Hnry Integration

11. Outbound Zapier zap — new invoice → create in Hnry
12. Inbound webhook — Hnry payment → update Beezkneez
13. Auto-status sync (paid/overdue)

### Phase 5: Polish

14. Invoice templates / recurring invoices
15. Payment reminders (overdue emails)
16. Dashboard stats from real data (revenue, outstanding, etc.)
