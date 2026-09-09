import type { ActivityLog } from "@/lib/farm-store";
import type { Garden } from "@/lib/garden.types";
import type { Harvest } from "@/lib/finance-store";

export type FinanceRangeKey = "today" | "7days" | "30days" | "month" | "year" | "custom";

export const FINANCE_RANGE_LABELS: Record<FinanceRangeKey, string> = {
  today: "Hôm nay",
  "7days": "7 ngày",
  "30days": "30 ngày",
  month: "Tháng này",
  year: "Năm này",
  custom: "Tùy chọn",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function resolveRange(
  key: FinanceRangeKey,
  custom: { from: string; to: string },
  now = new Date(),
): { from: string; to: string } {
  const today = iso(now);
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "7days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: iso(d), to: today };
    }
    case "30days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: iso(d), to: today };
    }
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "year":
      return { from: `${now.getFullYear()}-01-01`, to: today };
    default:
      return { from: custom.from || `${now.getFullYear()}-01-01`, to: custom.to || today };
  }
}

export const inRange = (date: string, from: string, to: string) => date >= from && date <= to;

export const monthKey = (date: string) => date.slice(0, 7);

export const monthLabel = (key: string) => `T${Number(key.slice(5, 7))}/${key.slice(2, 4)}`;

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function sumRevenue(harvests: Harvest[]) {
  return harvests.reduce((s, h) => s + h.netRevenue, 0);
}
export function sumExpense(logs: ActivityLog[]) {
  return logs.reduce((s, l) => s + (l.cost || 0), 0);
}
export function sumQuantity(harvests: Harvest[]) {
  return harvests.reduce((s, h) => s + toKg(h), 0);
}

/** Quy đổi sản lượng về kg để tổng hợp. */
export function toKg(h: Harvest) {
  const q = h.quantity || 0;
  switch (h.unit) {
    case "tấn":
      return q * 1000;
    case "tạ":
      return q * 100;
    default:
      return q;
  }
}

export function revenueByMonth(harvests: Harvest[], months: string[]) {
  const map = new Map(months.map((m) => [m, 0]));
  for (const h of harvests) {
    const k = monthKey(h.harvestDate);
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + h.netRevenue);
  }
  return months.map((m) => ({ month: m, label: monthLabel(m), revenue: map.get(m) ?? 0 }));
}

export function lastMonths(count: number, now = new Date()) {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export type ProfitRow = {
  key: string;
  name: string;
  revenue: number;
  expense: number;
  profit: number;
};

export function profitByGarden(
  gardens: Garden[],
  harvests: Harvest[],
  logs: ActivityLog[],
): ProfitRow[] {
  return gardens
    .map((g) => {
      const revenue = sumRevenue(harvests.filter((h) => h.gardenId === g.id));
      const expense = sumExpense(logs.filter((l) => l.gardenId === g.id));
      return { key: g.id, name: g.name, revenue, expense, profit: revenue - expense };
    })
    .filter((r) => r.revenue > 0 || r.expense > 0)
    .sort((a, b) => b.profit - a.profit);
}

/** Chi phí của vườn được phân bổ cho cây trồng của vườn đó. */
export function profitByCrop(
  gardens: Garden[],
  harvests: Harvest[],
  logs: ActivityLog[],
): ProfitRow[] {
  const cropOfGarden = new Map(gardens.map((g) => [g.id, g.crop || "Khác"]));
  const acc = new Map<string, { revenue: number; expense: number }>();
  const bump = (crop: string, revenue: number, expense: number) => {
    const cur = acc.get(crop) ?? { revenue: 0, expense: 0 };
    acc.set(crop, { revenue: cur.revenue + revenue, expense: cur.expense + expense });
  };
  for (const h of harvests) {
    bump(h.cropName || cropOfGarden.get(h.gardenId) || "Khác", h.netRevenue, 0);
  }
  for (const l of logs) {
    bump(cropOfGarden.get(l.gardenId) || "Khác", 0, l.cost || 0);
  }
  return Array.from(acc.entries())
    .map(([name, v]) => ({ key: name, name, ...v, profit: v.revenue - v.expense }))
    .sort((a, b) => b.profit - a.profit);
}

export function expenseByCategory(logs: ActivityLog[]) {
  const map = new Map<string, number>();
  for (const l of logs) {
    if ((l.cost || 0) <= 0) continue;
    const k = l.expenseCategory || "Khác";
    map.set(k, (map.get(k) ?? 0) + l.cost);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function productivity(gardens: Garden[], harvests: Harvest[]) {
  return gardens
    .filter((g) => (g.plantCount || 0) > 0)
    .map((g) => {
      const total = sumQuantity(harvests.filter((h) => h.gardenId === g.id));
      return {
        key: g.id,
        name: g.name,
        crop: g.crop,
        plantCount: g.plantCount,
        total,
        perPlant: total / g.plantCount,
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.perPlant - a.perPlant);
}

export type Insight = { title: string; detail: string; tone: "good" | "bad" | "neutral" };

const pct = (current: number, previous: number) =>
  previous > 0 ? ((current - previous) / previous) * 100 : null;

export function buildInsights(
  gardens: Garden[],
  harvests: Harvest[],
  logs: ActivityLog[],
  now = new Date(),
): Insight[] {
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonth = shiftMonth(thisMonth, -1);

  const revNow = sumRevenue(harvests.filter((h) => monthKey(h.harvestDate) === thisMonth));
  const revPrev = sumRevenue(harvests.filter((h) => monthKey(h.harvestDate) === prevMonth));
  const expNow = sumExpense(logs.filter((l) => monthKey(l.date) === thisMonth));
  const expPrev = sumExpense(logs.filter((l) => monthKey(l.date) === prevMonth));
  const profitNow = revNow - expNow;
  const profitPrev = revPrev - expPrev;

  const out: Insight[] = [];

  const profitChange = pct(profitNow, profitPrev);
  if (profitChange !== null && Math.abs(profitChange) >= 1) {
    out.push(
      profitChange > 0
        ? {
            title: "Lợi nhuận tăng",
            detail: `Lợi nhuận tăng ${profitChange.toFixed(0)}% so với tháng trước.`,
            tone: "good",
          }
        : {
            title: "Lợi nhuận giảm",
            detail: `Lợi nhuận giảm ${Math.abs(profitChange).toFixed(0)}% so với tháng trước.`,
            tone: "bad",
          },
    );
  }

  const expChange = pct(expNow, expPrev);
  if (expChange !== null && expChange > 1) {
    out.push({
      title: "Chi phí tăng",
      detail: `Chi phí tăng ${expChange.toFixed(0)}% so với tháng trước.`,
      tone: "bad",
    });
  }

  const revChange = pct(revNow, revPrev);
  if (revChange !== null && revChange < -1) {
    out.push({
      title: "Doanh thu giảm",
      detail: `Doanh thu giảm ${Math.abs(revChange).toFixed(0)}% so với tháng trước.`,
      tone: "bad",
    });
  }

  const topGarden = profitByGarden(gardens, harvests, logs)[0];
  if (topGarden && topGarden.profit > 0) {
    out.push({
      title: "Vườn hiệu quả nhất",
      detail: `${topGarden.name} đang cho lợi nhuận cao nhất.`,
      tone: "good",
    });
  }

  const topCrop = profitByCrop(gardens, harvests, logs)[0];
  if (topCrop && topCrop.profit > 0) {
    out.push({
      title: "Cây trồng lãi nhất",
      detail: `${topCrop.name} mang lại lợi nhuận cao nhất.`,
      tone: "good",
    });
  }

  return out;
}
