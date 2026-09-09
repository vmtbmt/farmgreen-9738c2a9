
ALTER TABLE public.gardens ADD COLUMN IF NOT EXISTS plant_count integer NOT NULL DEFAULT 0;

CREATE TABLE public.harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garden_id uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  crop_name text NOT NULL DEFAULT '',
  harvest_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  price_per_unit numeric NOT NULL DEFAULT 0,
  buyer_name text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.harvests TO authenticated;
GRANT ALL ON public.harvests TO service_role;
ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own harvests" ON public.harvests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_harvests_updated_at BEFORE UPDATE ON public.harvests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_harvests_user_date ON public.harvests(user_id, harvest_date DESC);

CREATE TABLE public.revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  harvest_id uuid NOT NULL REFERENCES public.harvests(id) ON DELETE CASCADE,
  gross_revenue numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  commission_cost numeric NOT NULL DEFAULT 0,
  other_cost numeric NOT NULL DEFAULT 0,
  net_revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenues TO authenticated;
GRANT ALL ON public.revenues TO service_role;
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own revenues" ON public.revenues FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_revenues_updated_at BEFORE UPDATE ON public.revenues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX idx_revenues_harvest ON public.revenues(harvest_id);

CREATE VIEW public.profit_summary_view
WITH (security_invoker = true) AS
WITH rev AS (
  SELECT h.user_id, h.garden_id, h.crop_name,
         to_char(h.harvest_date, 'YYYY-MM') AS month,
         EXTRACT(YEAR FROM h.harvest_date)::int AS year,
         SUM(COALESCE(r.net_revenue, h.quantity * h.price_per_unit)) AS revenue,
         SUM(h.quantity) AS quantity
  FROM public.harvests h
  LEFT JOIN public.revenues r ON r.harvest_id = h.id
  GROUP BY 1,2,3,4,5
), exp AS (
  SELECT l.user_id, l.garden_id,
         to_char(l.date, 'YYYY-MM') AS month,
         EXTRACT(YEAR FROM l.date)::int AS year,
         SUM(l.cost) AS expense
  FROM public.activity_logs l
  WHERE l.cost > 0
  GROUP BY 1,2,3,4
)
SELECT
  COALESCE(rev.user_id, exp.user_id) AS user_id,
  COALESCE(rev.garden_id, exp.garden_id) AS garden_id,
  COALESCE(rev.crop_name, '') AS crop_name,
  COALESCE(rev.month, exp.month) AS month,
  COALESCE(rev.year, exp.year) AS year,
  COALESCE(rev.revenue, 0) AS revenue,
  COALESCE(exp.expense, 0) AS expense,
  COALESCE(rev.revenue, 0) - COALESCE(exp.expense, 0) AS profit,
  COALESCE(rev.quantity, 0) AS quantity
FROM rev
FULL OUTER JOIN exp
  ON rev.user_id = exp.user_id AND rev.garden_id = exp.garden_id AND rev.month = exp.month;

GRANT SELECT ON public.profit_summary_view TO authenticated;
GRANT SELECT ON public.profit_summary_view TO service_role;
