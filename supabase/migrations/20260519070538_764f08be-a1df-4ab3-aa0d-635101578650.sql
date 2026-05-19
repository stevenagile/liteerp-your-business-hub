
CREATE TABLE public.company (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tax_id TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view company" ON public.company FOR SELECT USING (true);
CREATE POLICY "Authenticated can update company" ON public.company FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can insert company" ON public.company FOR INSERT TO authenticated WITH CHECK (true);

INSERT INTO public.company (name, tax_id) VALUES ('測試股份有限公司', '12345678');
