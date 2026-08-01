import type { GardenTask } from "@/lib/farm-store";

export const TASK_STATUSES = ["Todo", "In Progress", "Completed", "Archived"] as const;
export const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export const TASK_CATEGORIES = [
  "Watering",
  "Fertilizer",
  "Pruning",
  "Disease",
  "Harvest",
  "Cleaning",
  "Inspection",
  "Other",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  Todo: "Cần làm",
  "In Progress": "Đang làm",
  Completed: "Hoàn thành",
  Archived: "Lưu trữ",
};
export const PRIORITY_LABELS: Record<string, string> = {
  Low: "Thấp",
  Medium: "Trung bình",
  High: "Cao",
  Urgent: "Khẩn cấp",
};
export const CATEGORY_LABELS: Record<string, string> = {
  Watering: "Tưới nước",
  Fertilizer: "Bón phân",
  Pruning: "Tỉa cành",
  Disease: "Sâu bệnh",
  Harvest: "Thu hoạch",
  Cleaning: "Dọn vườn",
  Inspection: "Kiểm tra",
  Other: "Khác",
};

const STATUS_ORDER: Record<string, number> = {
  "In Progress": 0,
  Todo: 1,
  Completed: 2,
  Archived: 3,
};
const PRIORITY_ORDER: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export function isTaskOpen(task: GardenTask) {
  return task.status !== "Completed" && task.status !== "Archived";
}

export function isOverdue(task: GardenTask) {
  if (!task.dueDate || !isTaskOpen(task)) return false;
  return task.dueDate < new Date().toISOString().slice(0, 10);
}

/** Default order: In Progress → priority cao → hạn hoàn thành gần nhất. */
export function sortTasksDefault(tasks: GardenTask[]) {
  return [...tasks].sort((a, b) => {
    const s = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (s !== 0) return s;
    const p = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
    if (p !== 0) return p;
    return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
  });
}

export function summarizeTasks(tasks: GardenTask[]) {
  const active = tasks.filter((t) => t.status !== "Archived");
  return {
    total: active.length,
    completed: active.filter((t) => t.status === "Completed").length,
    pending: active.filter(isTaskOpen).length,
    overdue: active.filter(isOverdue).length,
  };
}

export function formatDueDate(due: string | null) {
  return due ? new Date(due).toLocaleDateString("vi-VN") : "Không có hạn";
}
