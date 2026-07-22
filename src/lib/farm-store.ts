import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Garden = {
  id: string;
  name: string;
  crop: string;
  area: number;
  location: string;
  plantedAt: string;
  notes?: string;
  createdAt: string;
};

export type ActivityType =
  | "Tưới nước"
  | "Bón phân"
  | "Phun thuốc"
  | "Gieo trồng"
  | "Thu hoạch"
  | "Làm cỏ"
  | "Khác";

export const ACTIVITY_TYPES: ActivityType[] = [
  "Tưới nước",
  "Bón phân",
  "Phun thuốc",
  "Gieo trồng",
  "Thu hoạch",
  "Làm cỏ",
  "Khác",
];

export type ActivityLog = {
  id: string;
  gardenId: string;
  type: ActivityType;
  date: string;
  note: string;
  createdAt: string;
};

type GardenRow = {
  id: string;
  name: string;
  crop: string;
  area: number | string;
  location: string;
  planted_at: string;
  notes: string | null;
  created_at: string;
};

type LogRow = {
  id: string;
  garden_id: string;
  type: string;
  date: string;
  note: string;
  created_at: string;
};

const mapGarden = (r: GardenRow): Garden => ({
  id: r.id,
  name: r.name,
  crop: r.crop,
  area: Number(r.area) || 0,
  location: r.location ?? "",
  plantedAt: r.planted_at,
  notes: r.notes ?? "",
  createdAt: r.created_at,
});

const mapLog = (r: LogRow): ActivityLog => ({
  id: r.id,
  gardenId: r.garden_id,
  type: r.type as ActivityType,
  date: r.date,
  note: r.note ?? "",
  createdAt: r.created_at,
});

async function fetchGardens(): Promise<Garden[]> {
  const { data, error } = await supabase
    .from("gardens")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as GardenRow[]).map(mapGarden);
}

async function fetchLogs(): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as LogRow[]).map(mapLog);
}

export function useFarmStore() {
  const gardensQ = useQuery({ queryKey: ["gardens"], queryFn: fetchGardens });
  const logsQ = useQuery({ queryKey: ["logs"], queryFn: fetchLogs });
  return {
    gardens: gardensQ.data ?? [],
    logs: logsQ.data ?? [],
    isLoading: gardensQ.isLoading || logsQ.isLoading,
  };
}

export function useFarmActions() {
  const qc = useQueryClient();
  return {
    async addGarden(input: Omit<Garden, "id" | "createdAt">) {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Chưa đăng nhập");
      const { error } = await supabase.from("gardens").insert({
        user_id,
        name: input.name,
        crop: input.crop,
        area: input.area,
        location: input.location,
        planted_at: input.plantedAt,
        notes: input.notes ?? null,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["gardens"] });
    },
    async deleteGarden(id: string) {
      const { error } = await supabase.from("gardens").delete().eq("id", id);
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["gardens"] }),
        qc.invalidateQueries({ queryKey: ["logs"] }),
      ]);
    },
    async addLog(input: Omit<ActivityLog, "id" | "createdAt">) {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Chưa đăng nhập");
      const { error } = await supabase.from("activity_logs").insert({
        user_id,
        garden_id: input.gardenId,
        type: input.type,
        date: input.date,
        note: input.note,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["logs"] });
    },
    async deleteLog(id: string) {
      const { error } = await supabase.from("activity_logs").delete().eq("id", id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["logs"] });
    },
  };
}
