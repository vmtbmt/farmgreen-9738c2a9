import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  BarChart3, Download, FileText, Loader2, TrendingUp, TrendingDown, Wallet, Sprout, Trophy,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFarmStore } from "@/lib/farm-store";
import { useHarvests } from "@/lib/finance-store";
import { formatVnd, formatShortVnd } from "@/lib/expense-utils";
import {
  FINANCE_RANGE_LABELS, type FinanceRangeKey, resolveRange, inRange, lastMonths,
  revenueByMonth, sumRevenue, sumExpense, sumQuantity, profitByGarden, profitByCrop,
  expenseByCategory, productivity, buildInsights, monthLabel,
} from "@/lib/finance-utils";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({
    meta: [
      { title: "Báo cáo tài chính — Nông Trại Xanh" },
      { name: "description", content: "Doanh thu, chi phí, lợi nhuận và năng suất của nông trại." },
      { property: "og:title", content: "Báo cáo tài chính — Nông Trại Xanh" },
      { property: "og:description", content: "Doanh thu, chi phí, lợi nhuận và năng suất của nông trại." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinancePage,
});

const PIE_COLORS = ["#16a34a", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#64748b", "#a3a3a3"];
const RANGE_KEYS: FinanceRangeKey[] = ["today", "7days", "30days", "month", "year", "custom"];

function FinancePage() {
  const { gardens, logs, isLoading: farmLoading, error: farmError } = useFarmStore();
  const { data: harvests = [], isLoading: harvestLoading, error: harvestError, refetch } = useHarvests();

  const [rangeKey, setRangeKey] = useState<FinanceRangeKey>("month");
  const [custom, setCustom] = useState({ from: "", to: "" });

  const range = useMemo(() => resolveRange(rangeKey, custom), [rangeKey, custom]);

  const scoped = useMemo(() => {
    const h = harvests.filter((x) => inRange(x.harvestDate, range.from, range.to));
    const l = logs.filter((x) => inRange(x.date, range.from, range.to) && (x.cost || 0) > 0);
    return { h, l };
  }, [harvests, logs, range]);

  const revenue = sumRevenue(scoped.h);
  const expense = sumExpense(scoped.l);
  const profit = revenue - expense;
  const quantity = sumQuantity(scoped.h);

  const months = useMemo(() => lastMonths(6), []);
  const revenueSeries = useMemo(() => revenueByMonth(harvests, months), [harvests, months]);
  const pie = useMemo(() => expenseByCategory(scoped.l), [scoped.l]);
  const gardenRows = useMemo(() => profitByGarden(gardens, scoped.h, scoped.l), [gardens, scoped]);
  const cropRows = useMemo(() => profitByCrop(gardens, scoped.h, scoped.l), [gardens, scoped]);
  const yields = useMemo(() => productivity(gardens, scoped.h), [gardens, scoped.h]);
  const insights = useMemo(() => buildInsights(gardens, harvests, logs), [gardens, harvests, logs]);

  const isLoading = farmLoading || harvestLoading;
  const error = farmError || harvestError;

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Báo cáo tài chính", `${range.from} → ${range.to}`],
        ["Doanh thu (VND)", Math.round(revenue)],
        ["Chi phí (VND)", Math.round(expense)],
        ["Lợi nhuận (VND)", Math.round(profit)],
        ["Sản lượng (kg)", Math.round(quantity)],
      ]),
      "Tổng quan",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["Tháng", "Doanh thu (VND)"], ...revenueSeries.map((r) => [r.label, Math.round(r.revenue)])]),
      "Doanh thu theo tháng",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["Nhóm chi phí", "Số tiền (VND)"], ...pie.map((p) => [p.name, Math.round(p.value)])]),
      "Chi phí theo nhóm",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Khu vườn", "Doanh thu", "Chi phí", "Lợi nhuận"],
        ...gardenRows.map((r) => [r.name, Math.round(r.revenue), Math.round(r.expense), Math.round(r.profit)]),
      ]),
      "Lợi nhuận theo vườn",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Cây trồng", "Doanh thu", "Chi phí", "Lợi nhuận"],
        ...cropRows.map((r) => [r.name, Math.round(r.revenue), Math.round(r.expense), Math.round(r.profit)]),
      ]),
      "Lợi nhuận theo cây",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Khu vườn", "Cây trồng", "Số cây", "Tổng sản lượng (kg)", "kg/cây"],
        ...yields.map((r) => [r.name, r.crop, r.plantCount, Math.round(r.total), Number(r.perPlant.toFixed(2))]),
      ]),
      "Năng suất",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["Nhận định"], ...(insights.length ? insights.map((i) => [`${i.title}: ${i.detail}`]) : [["Chưa có nhận định"]])]),
      "Nhận định",
    );
    XLSX.writeFile(wb, `bao-cao-tai-chinh-${range.from}-${range.to}.xlsx`);
    toast.success("Đã xuất file Excel");
  };

  const exportPdf = () => {
    toast.info("Chọn 'Lưu thành PDF' trong hộp thoại in");
    setTimeout(() => window.print(), 300);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải báo cáo...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="space-y-3 p-6 text-sm">
            <p>Không tải được dữ liệu báo cáo.</p>
            <Button variant="outline" onClick={() => refetch()}>Thử lại</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden p-4 sm:p-6 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Báo cáo tài chính</h1>
            <p className="text-sm text-muted-foreground">Doanh thu, chi phí và lợi nhuận của nông trại.</p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={exportExcel}>
            <Download className="mr-2 h-4 w-4" /> Xuất Excel
          </Button>
          <Button variant="outline" onClick={exportPdf}>
            <FileText className="mr-2 h-4 w-4" /> Xuất PDF
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {RANGE_KEYS.map((k) => (
              <Button
                key={k}
                size="sm"
                variant={rangeKey === k ? "default" : "outline"}
                className={rangeKey === k ? "gradient-primary text-primary-foreground" : ""}
                onClick={() => setRangeKey(k)}
              >
                {FINANCE_RANGE_LABELS[k]}
              </Button>
            ))}
          </div>
          {rangeKey === "custom" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="from">Từ ngày</Label>
                <Input id="from" type="date" value={custom.from} onChange={(e) => setCustom((s) => ({ ...s, from: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="to">Đến ngày</Label>
                <Input id="to" type="date" value={custom.to} onChange={(e) => setCustom((s) => ({ ...s, to: e.target.value }))} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Doanh thu" value={formatVnd(revenue)} icon={<TrendingUp className="h-4 w-4" />} />
        <Metric label="Chi phí" value={formatVnd(expense)} icon={<Wallet className="h-4 w-4" />} />
        <Metric
          label="Lợi nhuận"
          value={formatVnd(profit)}
          icon={profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          tone={profit >= 0 ? "good" : "bad"}
        />
        <Metric label="Sản lượng" value={`${quantity.toLocaleString("vi-VN")} kg`} icon={<Sprout className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Doanh thu theo tháng</CardTitle></CardHeader>
          <CardContent className="h-72">
            {revenueSeries.every((r) => r.revenue === 0) ? (
              <Empty text="Chưa có doanh thu" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueSeries} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis tickFormatter={(v) => formatShortVnd(Number(v))} fontSize={12} width={52} />
                  <Tooltip formatter={(v) => formatVnd(Number(v))} labelFormatter={(l) => `Tháng ${l}`} />
                  <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#16a34a" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Chi phí theo nhóm</CardTitle></CardHeader>
          <CardContent className="h-72">
            {pie.length === 0 ? (
              <Empty text="Chưa có chi phí trong khoảng thời gian này" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" outerRadius={90} label={false}>
                    {pie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatVnd(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfitTable title="Lợi nhuận theo khu vườn" head="Khu vườn" rows={gardenRows} />
        <ProfitTable title="Lợi nhuận theo cây trồng" head="Cây trồng" rows={cropRows} highlightTop />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Năng suất (kg/cây)</CardTitle></CardHeader>
        <CardContent>
          {yields.length === 0 ? (
            <Empty text="Chưa có dữ liệu thu hoạch hoặc số cây trong vườn" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Khu vườn</th><th>Cây trồng</th>
                    <th className="text-right">Số cây</th><th className="text-right">Sản lượng</th><th className="text-right">kg/cây</th>
                  </tr>
                </thead>
                <tbody>
                  {yields.map((r) => (
                    <tr key={r.key} className="border-b last:border-0">
                      <td className="py-2 font-medium">{r.name}</td>
                      <td>{r.crop}</td>
                      <td className="text-right">{r.plantCount.toLocaleString("vi-VN")}</td>
                      <td className="text-right">{r.total.toLocaleString("vi-VN")} kg</td>
                      <td className="text-right font-semibold">{r.perPlant.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Nhận định</CardTitle></CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <Empty text="Chưa đủ dữ liệu để đưa ra nhận định" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {insights.map((i) => (
                <div
                  key={i.title}
                  className={`rounded-xl border p-4 ${
                    i.tone === "good"
                      ? "border-primary/40 bg-primary/5"
                      : i.tone === "bad"
                        ? "border-destructive/40 bg-destructive/10"
                        : "border-border"
                  }`}
                >
                  <p className="font-medium">{i.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{i.detail}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Kỳ báo cáo: {range.from} → {range.to} · {monthLabel(range.to.slice(0, 7))}
      </p>
    </div>
  );
}

function Metric({
  label, value, icon, tone,
}: { label: string; value: string; icon: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
        <div
          className={`mt-1 text-xl font-bold ${
            tone === "good" ? "text-primary" : tone === "bad" ? "text-destructive" : ""
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfitTable({
  title, head, rows, highlightTop,
}: {
  title: string;
  head: string;
  rows: Array<{ key: string; name: string; revenue: number; expense: number; profit: number }>;
  highlightTop?: boolean;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty text="Chưa có dữ liệu" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">{head}</th>
                  <th className="text-right">Doanh thu</th>
                  <th className="text-right">Chi phí</th>
                  <th className="text-right">Lợi nhuận</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key} className="border-b last:border-0">
                    <td className="py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        {highlightTop && i === 0 && r.profit > 0 && <Trophy className="h-4 w-4 text-amber-500" />}
                        {r.name}
                      </span>
                    </td>
                    <td className="text-right">{formatVnd(r.revenue)}</td>
                    <td className="text-right">{formatVnd(r.expense)}</td>
                    <td className={`text-right font-semibold ${r.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                      {formatVnd(r.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
