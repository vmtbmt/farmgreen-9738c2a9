import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { gardenRepository } from "@/lib/garden.repository";
import { activityFromCategory, categoryFromActivity } from "@/lib/expense-utils";
export type { Garden, GardenInput } from "@/lib/garden.types";
import type { Garden, GardenInput } from "@/lib/garden.types";

export type ActivityType =
  "Tưới nước" | "Bón phân" | "Phun thuốc" | "Gieo trồng" | "Thu hoạch" | "Làm cỏ" | "Khác";

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
  expenseCategory: string;
  taskId: string | null;
  createdAt: string;
};

export type ExpenseInput = {
  gardenId: string;
  expenseCategory: string;
  date: string;
  cost: number;
  note: string;
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
export type GardenTask = {
  id: string;
  gardenId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  dueDate: string | null;
  reminderAt: string | null;
  notes: string;
  cost: number;
  expenseCategory: string;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};
export type GardenTaskInput = Omit<GardenTask, "id" | "createdAt" | "completedAt" | "archivedAt">;

type LogRow = {
  id: string;
  garden_id: string;
  type: string;
  date: string;
  note: string;
  cost: number | string | null;
  expense_category: string | null;
  task_id: string | null;
  created_at: string;
};
type DiseaseRow = {
  id: string;
  garden_id: string | null;
  image_url: string;
  diagnosis: string;
  confidence: number | string;
  cause: string;
  recommendation: string;
  urgency: string;
  created_at: string;
};

const mapLog = (r: LogRow): ActivityLog => ({
  id: r.id,
  gardenId: r.garden_id,
  type: r.type as ActivityType,
  date: r.date,
  note: r.note ?? "",
  cost: Number(r.cost || 0),
  expenseCategory: r.expense_category ?? "Khác",
  taskId: r.task_id ?? null,
  createdAt: r.created_at,
});

const mapDisease = (r: DiseaseRow): DiseaseCheck => ({
  id: r.id,
  gardenId: r.garden_id,
  imageUrl: r.image_url,
  diagnosis: r.diagnosis,
  confidence: Number(r.confidence || 0),
  cause: r.cause,
  recommendation: r.recommendation,
  urgency: r.urgency,
  createdAt: r.created_at,
});

async function fetchGardens(): Promise<Garden[]> {
  return gardenRepository.listActive();
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
async function fetchDiseaseChecks(): Promise<DiseaseCheck[]> {
  const { data, error } = await supabase
    .from("disease_checks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DiseaseRow[]).map(mapDisease);
}
async function fetchGardenTasks(gardenId: string): Promise<GardenTask[]> {
  const { data, error } = await supabase
    .from("garden_tasks")
    .select("*")
    .eq("garden_id", gardenId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    gardenId: row.garden_id,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    reminderAt: row.reminder_at,
    notes: row.notes ?? "",
    cost: Number(row.cost || 0),
    expenseCategory: row.expense_category ?? "Khác",
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  }));
}
export function useGardenTasks(gardenId: string) {
  return useQuery({
    queryKey: ["garden_tasks", gardenId],
    queryFn: () => fetchGardenTasks(gardenId),
    enabled: Boolean(gardenId),
  });
}

async function fetchAllGardenTasks(): Promise<GardenTask[]> {
  const { data, error } = await supabase.from("garden_tasks").select("*");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    gardenId: row.garden_id,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    reminderAt: row.reminder_at,
    notes: row.notes ?? "",
    cost: Number(row.cost || 0),
    expenseCategory: row.expense_category ?? "Khác",
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  }));
}

export function useAllGardenTasks() {
  return useQuery({ queryKey: ["garden_tasks", "all"], queryFn: fetchAllGardenTasks });
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

/** Ghi/cập nhật khoản chi gắn với công việc. Chi phí = 0 thì gỡ khoản chi đó. */
async function syncTaskExpense(taskId: string, input: GardenTaskInput, userId: string) {
  const cost = Number(input.cost || 0);
  const category = input.expenseCategory || "Khác";
  const { data: existing, error: findError } = await supabase
    .from("activity_logs")
    .select("id")
    .eq("task_id", taskId)
    .maybeSingle();
  if (findError) throw findError;

  if (cost <= 0) {
    if (existing) {
      const { error } = await supabase.from("activity_logs").delete().eq("id", existing.id);
      if (error) throw error;
    }
    return;
  }

  const payload = {
    garden_id: input.gardenId,
    type: activityFromCategory(category),
    date: input.dueDate ?? new Date().toISOString().slice(0, 10),
    note: input.title,
    cost,
    expense_category: category,
  };
  const { error } = existing
    ? await supabase.from("activity_logs").update(payload).eq("id", existing.id)
    : await supabase.from("activity_logs").insert({ ...payload, user_id: userId, task_id: taskId });
  if (error) throw error;
}

export function useFarmActions() {
  const qc = useQueryClient();
  return {
    async addGarden(input: GardenInput) {
      await gardenRepository.create(input);
      await qc.invalidateQueries({ queryKey: ["gardens"] });
    },
    async updateGarden(id: string, input: GardenInput) {
      await gardenRepository.update(id, input);
      await qc.invalidateQueries({ queryKey: ["gardens"] });
    },
    async archiveGarden(id: string) {
      await gardenRepository.archive(id);
      await qc.invalidateQueries({ queryKey: ["gardens"] });
    },
    async deleteGarden(id: string) {
      const results = await Promise.all([
        supabase.from("activity_logs").delete().eq("garden_id", id),
        supabase.from("garden_tasks").delete().eq("garden_id", id),
        supabase.from("disease_checks").delete().eq("garden_id", id),
      ]);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      const { error } = await supabase.from("gardens").delete().eq("id", id);
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["gardens"] }),
        qc.invalidateQueries({ queryKey: ["logs"] }),
        qc.invalidateQueries({ queryKey: ["garden_tasks"] }),
        qc.invalidateQueries({ queryKey: ["disease_checks"] }),
      ]);
    },
    async addGardenTask(input: GardenTaskInput) {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Chưa đăng nhập");
      const { data: row, error } = await supabase
        .from("garden_tasks")
        .insert({
          user_id: data.user.id,
          garden_id: input.gardenId,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          status: input.status,
          due_date: input.dueDate,
          reminder_at: input.reminderAt,
          notes: input.notes,
          cost: input.cost ?? 0,
          expense_category: input.expenseCategory || "Khác",
        })
        .select("id")
        .single();
      if (error) throw error;
      await syncTaskExpense(row.id, input, data.user.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["garden_tasks"] }),
        qc.invalidateQueries({ queryKey: ["logs"] }),
      ]);
    },
    async updateGardenTask(id: string, input: GardenTaskInput) {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Chưa đăng nhập");
      const { error } = await supabase
        .from("garden_tasks")
        .update({
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          status: input.status,
          due_date: input.dueDate,
          reminder_at: input.reminderAt,
          notes: input.notes,
          cost: input.cost ?? 0,
          expense_category: input.expenseCategory || "Khác",
          completed_at: input.status === "Completed" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
      await syncTaskExpense(id, input, data.user.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["garden_tasks"] }),
        qc.invalidateQueries({ queryKey: ["logs"] }),
      ]);
    },
    async archiveGardenTask(id: string, gardenId: string) {
      const { error } = await supabase
        .from("garden_tasks")
        .update({ status: "Archived", archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["garden_tasks", gardenId] });
    },
    async deleteGardenTask(id: string, _gardenId?: string) {
      const { error } = await supabase.from("garden_tasks").delete().eq("id", id);
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["garden_tasks"] }),
        qc.invalidateQueries({ queryKey: ["logs"] }),
      ]);
    },
    async addLog(
      input: Omit<ActivityLog, "id" | "createdAt" | "cost" | "expenseCategory" | "taskId"> & {
        cost?: number;
        expenseCategory?: string;
      },
    ) {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Chưa đăng nhập");
      const { error } = await supabase.from("activity_logs").insert({
        user_id,
        garden_id: input.gardenId,
        type: input.type,
        date: input.date,
        note: input.note,
        cost: input.cost ?? 0,
        expense_category: input.expenseCategory ?? categoryFromActivity(input.type),
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["logs"] });
    },
    async addExpense(input: ExpenseInput) {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Chưa đăng nhập");
      const { error } = await supabase.from("activity_logs").insert({
        user_id,
        garden_id: input.gardenId,
        type: activityFromCategory(input.expenseCategory),
        date: input.date,
        note: input.note,
        cost: input.cost,
        expense_category: input.expenseCategory,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["logs"] });
    },
    /** Chỉ cập nhật khoản chi; liên kết công việc (task_id) được giữ nguyên. */
    async updateExpense(id: string, input: ExpenseInput) {
      const { error } = await supabase
        .from("activity_logs")
        .update({
          garden_id: input.gardenId,
          date: input.date,
          note: input.note,
          cost: input.cost,
          expense_category: input.expenseCategory,
        })
        .eq("id", id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["logs"] });
    },
    /** Xóa khoản chi. Nếu khoản chi đến từ công việc thì chỉ đưa chi phí công việc về 0. */
    async deleteExpense(log: ActivityLog) {
      if (log.taskId) {
        const { error: taskError } = await supabase
          .from("garden_tasks")
          .update({ cost: 0 })
          .eq("id", log.taskId);
        if (taskError) throw taskError;
      }
      const { error } = await supabase.from("activity_logs").delete().eq("id", log.id);
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["logs"] }),
        qc.invalidateQueries({ queryKey: ["garden_tasks"] }),
      ]);
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
