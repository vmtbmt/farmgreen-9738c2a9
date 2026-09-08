import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { ExpenseDialog } from "@/components/expense-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EXPENSE_CATEGORIES,
  formatShortVnd,
  formatVnd,
  isExpense,
  monthlySeries,
  RANGE_LABELS,
  rangeStart,
  sumBy,
  type RangeKey,
} from "@/lib/expense-utils";
import { type ActivityLog, useFarmActions, useFarmStore } from "@/lib/farm-store";

export function ExpensesDashboard({ gardenId }: { gardenId?: string }) {
  const { gardens, logs, isLoading } = useFarmStore();
  const actions = useFarmActions();
  const [range, setRange] = useState<RangeKey>("month");
  const [category, setCategory] = useState("all");
  const [garden, setGarden] = useState(gardenId ?? "all");
  const [editing, setEditing] = useState<Partial<ActivityLog> | undefined>();

  const gardenName = (id: string) => gardens.find((g) => g.id === id)?.name ?? "Khu vườn";

  const all = useMemo(() => logs.filter(isExpense), [logs]);

  const filtered = useMemo(() => {
    const from = rangeStart(range);
    return all.filter(
      (l) =>
        (!from || l.date >= from) &&
        (category === "all" || l.expenseCategory === category) &&
        (garden === "all" || l.gardenId === garden),
    );
  }, [all, range, category, garden]);

  const monthKey = new Date().toISOString().slice(0, 7);
  const total = filtered.reduce((s, l) => s + l.cost, 0);
  const monthTotal = filtered
    .filter((l) => l.date.slice(0, 7) === monthKey)
    .reduce((s, l) => s + l.cost, 0);
  const byCategory = sumBy(
    filtered,
    (l) => l.expenseCategory || "Khác",
    (l) => l.cost,
  );
  const byGarden = sumBy(
    filtered,
    (l) => gardenName(l.gardenId),
    (l) => l.cost,
  );
  const chart = useMemo(() => monthlySeries(filtered, 6), [filtered]);
  const recent = [...filtered].slice(0, 12);

  const remove = async (log: ActivityLog) => {
    try {
      await actions.deleteExpense(log);
      toast.success("Đã xoá khoản chi.");
    } catch (error) {
      toast.error(`Không xoá được: ${(error as Error).message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {RANGE_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nhóm</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={garden} onValueChange={setGarden}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả khu vườn</SelectItem>
            {gardens.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="gradient-primary text-primary-foreground sm:ml-auto"
          onClick={() => setEditing({ gardenId: gardenId ?? undefined })}
        >
          <Plus /> Thêm khoản chi
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Tổng chi phí" value={formatVnd(total)} />
        <StatCard label="Chi phí tháng này" value={formatVnd(monthTotal)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title="Chi phí theo nhóm" rows={byCategory} total={total} />
        <BreakdownCard title="Chi phí theo khu vườn" rows={byGarden} total={total} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi phí 6 tháng gần đây</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ left: 4, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(v: number) => formatShortVnd(v)}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                formatter={(v) => formatVnd(Number(v))}
                labelFormatter={(l) => `Tháng ${String(l).replace("T", "")}`}
              />
              <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi phí gần đây</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Wallet className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="font-medium">Chưa có khoản chi nào</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nhập chi phí khi tạo công việc, hoặc bấm “Thêm khoản chi” cho khoản không gắn công
                việc.
              </p>
            </div>
          ) : (
            recent.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{l.expenseCategory || "Khác"}</span>
                    {l.taskId && <Badge variant="secondary">Từ công việc</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {new Date(l.date).toLocaleDateString("vi-VN")} · {gardenName(l.gardenId)}
                    {l.note ? ` · ${l.note}` : ""}
                  </p>
                </div>
                <span className="font-semibold">{formatVnd(l.cost)}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" aria-label="Sửa" onClick={() => setEditing(l)}>
                    <Pencil />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Xoá" onClick={() => remove(l)}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {editing && (
        <ExpenseDialog expense={editing} gardenId={gardenId} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { name: string; total: number }[];
  total: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
        ) : (
          rows.slice(0, 6).map((r) => (
            <div key={r.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{r.name}</span>
                <span className="font-medium">{formatVnd(r.total)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${total ? Math.max(4, (r.total / total) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
