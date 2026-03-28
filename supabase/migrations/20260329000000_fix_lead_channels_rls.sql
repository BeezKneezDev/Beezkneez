-- Fix RLS policy to match other tables (allow all, like customers/jobs/etc.)
DROP POLICY IF EXISTS "Authenticated users can manage lead_channels" ON lead_channels;
CREATE POLICY "Allow all" ON lead_channels FOR ALL USING (true) WITH CHECK (true);
