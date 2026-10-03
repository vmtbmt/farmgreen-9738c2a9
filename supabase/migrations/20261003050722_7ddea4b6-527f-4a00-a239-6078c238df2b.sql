CREATE TABLE public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  worker_type text NOT NULL DEFAULT 'Thời vụ',
  daily_wage numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT ALL ON public.workers TO service_role;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workers" ON public.workers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_workers_updated BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  status text NOT NULL DEFAULT 'present',
  overtime_hours numeric NOT NULL DEFAULT 0,
  daily_wage numeric NOT NULL DEFAULT 0,
  wage_amount numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, work_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attendance" ON public.attendance_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_attendance_user_date ON public.attendance_records(user_id, work_date);
CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();