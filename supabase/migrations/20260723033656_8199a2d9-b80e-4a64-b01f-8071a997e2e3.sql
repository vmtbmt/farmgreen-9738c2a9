
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS cost numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.disease_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  garden_id uuid REFERENCES public.gardens(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  diagnosis text NOT NULL DEFAULT '',
  confidence numeric NOT NULL DEFAULT 0,
  cause text NOT NULL DEFAULT '',
  recommendation text NOT NULL DEFAULT '',
  urgency text NOT NULL DEFAULT 'thấp',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.disease_checks TO authenticated;
GRANT ALL ON public.disease_checks TO service_role;

ALTER TABLE public.disease_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own disease checks" ON public.disease_checks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_disease_checks_updated_at BEFORE UPDATE ON public.disease_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
