
CREATE TABLE public.gardens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop TEXT NOT NULL,
  area NUMERIC NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT '',
  planted_at DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gardens TO authenticated;
GRANT ALL ON public.gardens TO service_role;
ALTER TABLE public.gardens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gardens" ON public.gardens FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX gardens_user_id_idx ON public.gardens(user_id);

CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  garden_id UUID NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs" ON public.activity_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX activity_logs_user_id_idx ON public.activity_logs(user_id);
CREATE INDEX activity_logs_garden_id_idx ON public.activity_logs(garden_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_gardens_updated BEFORE UPDATE ON public.gardens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_logs_updated BEFORE UPDATE ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
