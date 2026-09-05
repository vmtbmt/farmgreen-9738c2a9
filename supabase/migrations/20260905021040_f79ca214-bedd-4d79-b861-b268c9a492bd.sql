ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.garden_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expense_category text NOT NULL DEFAULT 'Khác';

ALTER TABLE public.garden_tasks
  ADD COLUMN IF NOT EXISTS cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_category text NOT NULL DEFAULT 'Khác';

CREATE UNIQUE INDEX IF NOT EXISTS activity_logs_task_id_key ON public.activity_logs(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS activity_logs_expense_category_idx ON public.activity_logs(expense_category);

UPDATE public.activity_logs SET expense_category = CASE type
  WHEN 'Bón phân' THEN 'Phân bón'
  WHEN 'Phun thuốc' THEN 'Thuốc BVTV'
  WHEN 'Tưới nước' THEN 'Tưới nước'
  WHEN 'Gieo trồng' THEN 'Giống'
  WHEN 'Thu hoạch' THEN 'Nhân công'
  WHEN 'Làm cỏ' THEN 'Nhân công'
  ELSE 'Khác' END
WHERE expense_category = 'Khác';