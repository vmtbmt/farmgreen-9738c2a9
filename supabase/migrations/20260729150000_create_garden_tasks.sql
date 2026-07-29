CREATE TABLE IF NOT EXISTS public.garden_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  garden_id uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Todo',
  due_date date,
  reminder_at timestamptz,
  notes text NOT NULL DEFAULT '',
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.garden_tasks TO authenticated;
GRANT ALL ON public.garden_tasks TO service_role;
ALTER TABLE public.garden_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own garden tasks" ON public.garden_tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS garden_tasks_garden_status_idx ON public.garden_tasks (garden_id, status, due_date);
CREATE TRIGGER update_garden_tasks_updated_at BEFORE UPDATE ON public.garden_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
