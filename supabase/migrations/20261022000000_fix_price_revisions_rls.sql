-- Fix price_revisions RLS policies
-- The original policy used core.current_company() which is inconsistent
-- with the rest of the codebase that uses my_company_id().
-- Also adds missing INSERT/UPDATE/DELETE policies.

-- Drop existing read-only policy
DROP POLICY IF EXISTS "p_pr_read" ON "public"."price_revisions";

-- Create full CRUD policies using my_company_id()
CREATE POLICY "price_revisions_select"
  ON "public"."price_revisions"
  FOR SELECT
  USING (company_id = my_company_id());

CREATE POLICY "price_revisions_insert"
  ON "public"."price_revisions"
  FOR INSERT
  WITH CHECK (company_id = my_company_id());

CREATE POLICY "price_revisions_update"
  ON "public"."price_revisions"
  FOR UPDATE
  USING (company_id = my_company_id())
  WITH CHECK (company_id = my_company_id());

CREATE POLICY "price_revisions_delete"
  ON "public"."price_revisions"
  FOR DELETE
  USING (company_id = my_company_id());

-- Fix price_revision_items RLS policies
-- Drop existing read-only policy
DROP POLICY IF EXISTS "p_pri_read" ON "public"."price_revision_items";

-- Create full CRUD policies via join to price_revisions
CREATE POLICY "price_revision_items_select"
  ON "public"."price_revision_items"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM price_revisions pr
      WHERE pr.id = price_revision_items.revision_id
        AND pr.company_id = my_company_id()
    )
  );

CREATE POLICY "price_revision_items_insert"
  ON "public"."price_revision_items"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM price_revisions pr
      WHERE pr.id = price_revision_items.revision_id
        AND pr.company_id = my_company_id()
    )
  );

CREATE POLICY "price_revision_items_update"
  ON "public"."price_revision_items"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM price_revisions pr
      WHERE pr.id = price_revision_items.revision_id
        AND pr.company_id = my_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM price_revisions pr
      WHERE pr.id = price_revision_items.revision_id
        AND pr.company_id = my_company_id()
    )
  );

CREATE POLICY "price_revision_items_delete"
  ON "public"."price_revision_items"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM price_revisions pr
      WHERE pr.id = price_revision_items.revision_id
        AND pr.company_id = my_company_id()
    )
  );
