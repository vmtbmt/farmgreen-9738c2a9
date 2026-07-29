import { supabase } from "@/integrations/supabase/client";
import type { Garden, GardenInput } from "@/lib/garden.types";
type GardenRow = {
  id: string;
  name: string;
  crop: string;
  area: number | string;
  location: string;
  planted_at: string;
  notes: string | null;
  created_at: string;
  archived_at: string | null;
};
const map = (row: GardenRow): Garden => ({
  id: row.id,
  name: row.name,
  crop: row.crop,
  area: Number(row.area) || 0,
  location: row.location ?? "",
  plantedAt: row.planted_at,
  notes: row.notes ?? "",
  createdAt: row.created_at,
  archivedAt: row.archived_at,
});
export const gardenRepository = {
  async listActive(): Promise<Garden[]> {
    const { data, error } = await supabase
      .from("gardens")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as GardenRow[]).map(map);
  },
  async create(input: GardenInput) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("Chưa đăng nhập");
    const { error } = await supabase
      .from("gardens")
      .insert({
        user_id: data.user.id,
        name: input.name,
        crop: input.crop,
        area: input.area,
        location: input.location,
        planted_at: input.plantedAt,
        notes: input.notes || null,
      });
    if (error) throw error;
  },
  async update(id: string, input: GardenInput) {
    const { error } = await supabase
      .from("gardens")
      .update({
        name: input.name,
        crop: input.crop,
        area: input.area,
        location: input.location,
        planted_at: input.plantedAt,
        notes: input.notes || null,
      })
      .eq("id", id);
    if (error) throw error;
  },
  async archive(id: string) {
    const { error } = await supabase
      .from("gardens")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
