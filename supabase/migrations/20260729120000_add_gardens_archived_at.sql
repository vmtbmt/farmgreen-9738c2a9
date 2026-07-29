ALTER TABLE public.gardens
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS gardens_user_id_archived_at_idx
  ON public.gardens (user_id, archived_at);

CREATE OR REPLACE FUNCTION public.prevent_garden_delete_with_related_data()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.activity_logs WHERE garden_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.disease_checks WHERE garden_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete a garden with related data';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS prevent_garden_delete_with_related_data ON public.gardens;
CREATE TRIGGER prevent_garden_delete_with_related_data
  BEFORE DELETE ON public.gardens
  FOR EACH ROW EXECUTE FUNCTION public.prevent_garden_delete_with_related_data();
