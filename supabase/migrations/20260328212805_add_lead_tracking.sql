-- Lead channels table (Google Ads, Flyer Drops, Jims Leads, etc.)
CREATE TABLE lead_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lead_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage lead_channels"
  ON lead_channels FOR ALL
  USING (auth.role() = 'authenticated');

-- Add lead_source column to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lead_source TEXT;
