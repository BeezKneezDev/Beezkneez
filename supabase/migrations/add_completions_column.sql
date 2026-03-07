-- Add completions JSONB column to jobs table for tracking recurring job completion history
-- Each entry: { completed_at: ISO string, invoice_id: UUID }
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completions JSONB DEFAULT '[]';
