CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view warehouses" ON public.warehouses FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert warehouses" ON public.warehouses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update warehouses" ON public.warehouses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete warehouses" ON public.warehouses FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_warehouses_updated_at ON public.warehouses;
CREATE TRIGGER update_warehouses_updated_at
BEFORE UPDATE ON public.warehouses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one default warehouse
CREATE OR REPLACE FUNCTION public.ensure_single_default_warehouse()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.warehouses SET is_default = false WHERE id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS warehouses_single_default ON public.warehouses;
CREATE TRIGGER warehouses_single_default
AFTER INSERT OR UPDATE OF is_default ON public.warehouses
FOR EACH ROW WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.ensure_single_default_warehouse();