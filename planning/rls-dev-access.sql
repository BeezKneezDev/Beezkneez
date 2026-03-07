-- Temporary: allow read access while we build out auth
-- These will be replaced with proper auth policies later

create policy "Temp: allow read customers" on customers for select using (true);
create policy "Temp: allow read jobs" on jobs for select using (true);
create policy "Temp: allow read invoices" on invoices for select using (true);
