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
  cost: number;
  createdAt: string;
};

export type DiseaseCheck = {
  id: string;
  gardenId: string | null;
  imageUrl: string;
  diagnosis: string;
  confidence: number;
  cause: string;
  recommendation: string;
  urgency: string;
  createdAt: string;
};

type GardenRow = {
  id: string; name: string; crop: string; area: number | string;
  location: string; planted_at: string; notes: string | null; created_at: string;
};
type LogRow = {
  id: string; garden_id: string; type: string; date: string;
  note: string; cost: number | string | null; created_at: string;
};
type DiseaseRow = {
  id: string; garden_id: string | null; image_url: string; diagnosis: string;
  confidence: number | string; cause: string; recommendation: string;
  urgency: string; created_at: string;
};

const mapGarden = (r: GardenRow): Garden => ({
  id: r.id, name: r.name, crop: r.crop, area: Number(r.area) || 0,
  location: r.location ?? "", plantedAt: r.planted_at,
  notes: r.notes ?? "", createdAt: r.created_at,
});

const mapLog = (r: LogRow): ActivityLog => ({
  id: r.id, gardenId: r.garden_id, type: r.type as ActivityType,
  date: r.date, note: r.note ?? "", cost: Number(r.cost || 0), createdAt: r.created_at,
});

const mapDisease = (r: DiseaseRow): DiseaseCheck => ({
  id: r.id, gardenId: r.garden_id, imageUrl: r.image_url,
  diagnosis: r.diagnosis, confidence: Number(r.confidence || 0),
  cause: r.cause, recommendation: r.recommendation,
  urgency: r.urgency, createdAt: r.created_at,
});

async function fetchGardens(): Promise<Garden[]> {
  const { data, error } = await supabase.from("gardens").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as GardenRow[]).map(mapGarden);
}
async function fetchLogs(): Promise<ActivityLog[]> {
  const { data, error } = await supabase.from("activity_logs").select("*")
    .order("date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as LogRow[]).map(mapLog);
}
async function fetchDiseaseChecks(): Promise<DiseaseCheck[]> {
  const { data, error } = await supabase.from("disease_checks").select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DiseaseRow[]).map(mapDisease);
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

export function useDiseaseChecks() {
  return useQuery({ queryKey: ["disease_checks"], queryFn: fetchDiseaseChecks });
}

export function useFarmActions() {
  const qc = useQueryClient();
  return {
    async addGarden(input: Omit<Garden, "id" | "createdAt">) {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Chưa đăng nhập");
      const { error } = await supabase.from("gardens").insert({
        user_id, name: input.name, crop: input.crop, area: input.area,
        location: input.location, planted_at: input.plantedAt, notes: input.notes ?? null,
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
    async addLog(input: Omit<ActivityLog, "id" | "createdAt" | "cost"> & { cost?: number }) {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Chưa đăng nhập");
      const { error } = await supabase.from("activity_logs").insert({
        user_id, garden_id: input.gardenId, type: input.type,
        date: input.date, note: input.note, cost: input.cost ?? 0,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["logs"] });
    },
    async deleteLog(id: string) {
      const { error } = await supabase.from("activity_logs").delete().eq("id", id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["logs"] });
    },
    async deleteDiseaseCheck(id: string) {
      const { error } = await supabase.from("disease_checks").delete().eq("id", id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["disease_checks"] });
    },
    invalidateAll() {
      qc.invalidateQueries({ queryKey: ["gardens"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["disease_checks"] });
    },
  };
}
