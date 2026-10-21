-- Fix dispatch_sheet_runs RLS policy
-- The original policy used "SELECT company.id FROM company LIMIT 1" which
-- just picks the first company row instead of the current user's company.
-- Replace with my_company_id() for proper multi-tenant isolation.

DROP POLICY IF EXISTS "dispatch_sheet_runs_company" ON "public"."dispatch_sheet_runs";

CREATE POLICY "dispatch_sheet_runs_company"
  ON "public"."dispatch_sheet_runs"
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (company_id = my_company_id())
  WITH CHECK (company_id = my_company_id());
