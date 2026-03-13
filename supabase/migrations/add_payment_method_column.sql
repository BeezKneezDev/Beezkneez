-- Add payment_method column to invoices table for tracking how payment was received (cash, bank, etc.)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
