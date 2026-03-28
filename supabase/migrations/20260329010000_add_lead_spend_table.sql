-- Spend log per lead channel (tracks budget over time)
CREATE TABLE lead_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES lead_channels(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  spend_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_spend ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON lead_spend FOR ALL USING (true) WITH CHECK (true);
