import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AttendanceStatus = "present" | "half" | "absent";
export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Có mặt",
  half: "Nửa ngày",
  absent: "Vắng",
};
export const WORKER_TYPES = ["Thời vụ", "Thường xuyên", "Hái cà phê", "Làm cỏ", "Phun thuốc", "Khác"];

export type Worker = {
  id: string;
  fullName: string;
  phone: string;
  workerType: string;
  dailyWage: number;
  notes: string;
  active: boolean;
};
export type WorkerInput = Omit<Worker, "id" | "active">;

export type AttendanceRecord = {
  id: string;
  workerId: string;
  workDate: string;
  status: AttendanceStatus;
  overtimeHours: number;
  dailyWage: number;
  wageAmount: number;
  note: string;
};

/** Tiền công: có mặt = lương ngày, nửa ngày = 1/2, vắng = 0; tăng ca = lương ngày / 8 mỗi giờ. */
export function calcWage(status: AttendanceStatus, dailyWage: number, overtimeHours: number) {
  const base = status === "present" ? dailyWage : status === "half" ? dailyWage / 2 : 0;
  const ot = status === "absent" ? 0 : (dailyWage / 8) * (overtimeHours || 0);
  return Math.round(base + ot);
}

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Bạn cần đăng nhập");
  return data.user.id;
}

export function useWorkers() {
  return useQuery({
    queryKey: ["workers"],
    queryFn: async (): Promise<Worker[]> => {
      const { data, error } = await supabase.from("workers").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        fullName: r.full_name,
        phone: r.phone,
        workerType: r.worker_type,
        dailyWage: Number(r.daily_wage),
        notes: r.notes,
        active: r.active,
      }));
    },
  });
}

export function useAttendance(from: string, to: string) {
  return useQuery({
    queryKey: ["attendance", from, to],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .gte("work_date", from)
        .lte("work_date", to)
        .order("work_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        workerId: r.worker_id,
        workDate: r.work_date,
        status: r.status as AttendanceStatus,
        overtimeHours: Number(r.overtime_hours),
        dailyWage: Number(r.daily_wage),
        wageAmount: Number(r.wage_amount),
        note: r.note,
      }));
    },
  });
}

export function useAttendanceActions() {
  const qc = useQueryClient();
  const refreshWorkers = () => qc.invalidateQueries({ queryKey: ["workers"] });
  const refreshAtt = () => qc.invalidateQueries({ queryKey: ["attendance"] });

  return {
    async saveWorker(input: WorkerInput, id?: string) {
      const row = {
        full_name: input.fullName.trim(),
        phone: input.phone.trim(),
        worker_type: input.workerType,
        daily_wage: input.dailyWage,
        notes: input.notes,
      };
      const { error } = id
        ? await supabase.from("workers").update(row).eq("id", id)
        : await supabase.from("workers").insert({ ...row, user_id: await uid() });
      if (error) throw error;
      await refreshWorkers();
    },
    async setWorkerActive(id: string, active: boolean) {
      const { error } = await supabase.from("workers").update({ active }).eq("id", id);
      if (error) throw error;
      await refreshWorkers();
    },
    async mark(
      entries: { worker: Worker; date: string; status: AttendanceStatus; overtimeHours: number; note: string }[],
    ) {
      if (!entries.length) return;
      const user_id = await uid();
      const rows = entries.map((e) => ({
        user_id,
        worker_id: e.worker.id,
        work_date: e.date,
        status: e.status,
        overtime_hours: e.status === "absent" ? 0 : e.overtimeHours,
        daily_wage: e.worker.dailyWage,
        wage_amount: calcWage(e.status, e.worker.dailyWage, e.overtimeHours),
        note: e.note,
      }));
      const { error } = await supabase
        .from("attendance_records")
        .upsert(rows, { onConflict: "worker_id,work_date" });
      if (error) throw error;
      await refreshAtt();
    },
    async clear(id: string) {
      const { error } = await supabase.from("attendance_records").delete().eq("id", id);
      if (error) throw error;
      await refreshAtt();
    },
  };
}
