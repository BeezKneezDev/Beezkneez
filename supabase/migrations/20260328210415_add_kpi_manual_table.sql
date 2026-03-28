-- KPI manual tracking table for manually-tracked metrics
CREATE TABLE IF NOT EXISTS kpi_manual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kpi_manual ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON kpi_manual FOR ALL USING (true) WITH CHECK (true);
