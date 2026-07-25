
CREATE TABLE public.ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month text NOT NULL,
  title text NOT NULL DEFAULT '',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  top_garden jsonb,
  ai jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_reports TO authenticated;
GRANT ALL ON public.ai_reports TO service_role;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai reports" ON public.ai_reports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_ai_reports_updated_at BEFORE UPDATE ON public.ai_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ai_reports_user_created_idx ON public.ai_reports(user_id, created_at DESC);
