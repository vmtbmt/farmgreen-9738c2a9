import type { ActivityLog, ActivityType } from "@/lib/farm-store";

export const EXPENSE_CATEGORIES = [
  "Phân bón",
  "Thuốc BVTV",
  "Nhân công",
  "Tưới nước",
  "Xăng dầu",
  "Giống",
  "Dụng cụ/Máy móc",
  "Vận chuyển",
  "Khác",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Nhóm chi phí gợi ý theo loại hoạt động trong nhật ký. */
export function categoryFromActivity(type: string): ExpenseCategory {
  switch (type) {
    case "Bón phân":
      return "Phân bón";
    case "Phun thuốc":
      return "Thuốc BVTV";
    case "Tưới nước":
      return "Tưới nước";
    case "Gieo trồng":
      return "Giống";
    case "Thu hoạch":
    case "Làm cỏ":
      return "Nhân công";
    default:
      return "Khác";
  }
}

/** Loại hoạt động tương ứng khi ghi chi phí từ công việc. */
export function activityFromCategory(category: string): ActivityType {
  switch (category) {
    case "Phân bón":
      return "Bón phân";
    case "Thuốc BVTV":
      return "Phun thuốc";
    case "Tưới nước":
      return "Tưới nước";
    case "Giống":
      return "Gieo trồng";
    default:
      return "Khác";
  }
}

export const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}₫`;

export const formatShortVnd = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".0", "")} tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")} tr`;
  if (n >= 1_000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
};

export type RangeKey = "month" | "3months" | "year" | "all";

export const RANGE_LABELS: Record<RangeKey, string> = {
  month: "Tháng này",
  "3months": "3 tháng",
  year: "Năm nay",
  all: "Tất cả",
};

export function rangeStart(range: RangeKey, now = new Date()): string | null {
  if (range === "all") return null;
  const d = new Date(now);
  if (range === "month") return `${d.toISOString().slice(0, 7)}-01`;
  if (range === "year") return `${d.getFullYear()}-01-01`;
  d.setMonth(d.getMonth() - 2, 1);
  return d.toISOString().slice(0, 10);
}

/** Chỉ nhật ký có chi phí > 0 mới được xem là khoản chi. */
export function isExpense(log: ActivityLog) {
  return (log.cost || 0) > 0;
}

export function sumBy<T>(rows: T[], key: (row: T) => string, value: (row: T) => number) {
  const map = new Map<string, number>();
  for (const row of rows) map.set(key(row), (map.get(key(row)) ?? 0) + value(row));
  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

/** Tổng chi phí theo từng tháng, tăng dần, tối đa `months` tháng gần nhất. */
export function monthlySeries(logs: ActivityLog[], months = 6, now = new Date()) {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const l of logs) {
    const k = l.date.slice(0, 7);
    if (totals.has(k)) totals.set(k, (totals.get(k) ?? 0) + (l.cost || 0));
  }
  return keys.map((k) => ({
    month: k,
    label: `T${Number(k.slice(5, 7))}`,
    total: totals.get(k) ?? 0,
  }));
}
