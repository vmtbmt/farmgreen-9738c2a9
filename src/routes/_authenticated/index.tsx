import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sprout,
  Plus,
  ListChecks,
  AlertTriangle,
  Wallet,
  ArrowRight,
  NotebookPen,
  Clock3,
  Loader2,
  Coins,
  CloudSun,
  Stethoscope,
  BarChart3,
} from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { toast } from "sonner";
import { useFarmActions } from "@/lib/farm-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFarmStore, useAllGardenTasks } from "@/lib/farm-store";
import { supabase } from "@/integrations/supabase/client";
import { isTaskOpen, isOverdue } from "@/lib/garden-task-utils";
import { DashboardAI } from "@/components/dashboard-ai";
import { WeatherCard } from "@/components/weather-card";
import { useWeather } from "@/lib/use-weather";
import { useHarvests } from "@/lib/finance-store";
import { formatVnd } from "@/lib/expense-utils";
import { sumRevenue, sumExpense, sumQuantity, monthKey } from "@/lib/finance-utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Hôm nay — Nông Trại Xanh" },
      {
        name: "description",
        content: "Việc cần làm hôm nay, khu vườn cần chú ý và chi phí tháng này.",
      },
      { property: "og:title", content: "Hôm nay — Nông Trại Xanh" },
      {
        property: "og:description",
        content: "Việc cần làm hôm nay, khu vườn cần chú ý và chi phí tháng này.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function formatTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function Dashboard() {
  const { gardens, logs } = useFarmStore();
  const { data: allTasks = [] } = useAllGardenTasks();
  const { data: weather } = useWeather();
  const { data: harvests = [] } = useHarvests();

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const openTasks = allTasks.filter(isTaskOpen);
    const tasksToday = openTasks.filter((t) => t.dueDate === todayKey);
    const overdue = openTasks.filter(isOverdue);
    return { tasksToday, overdue };
  }, [allTasks, todayKey]);

  const finance = useMemo(() => {
    const month = todayKey.slice(0, 7);
    const h = harvests.filter((x) => monthKey(x.harvestDate) === month);
    const l = logs.filter((x) => monthKey(x.date) === month);
    const revenue = sumRevenue(h);
    const expense = sumExpense(l);
    return { revenue, expense, profit: revenue - expense, quantity: sumQuantity(h) };
  }, [harvests, logs, todayKey]);


  const todayTasks = useMemo(
    () =>
      stats.tasksToday.map((task) => ({
        ...task,
        garden: gardens.find((g) => g.id === task.gardenId),
        dueTime: formatTime(task.reminderAt),
      })),
    [stats.tasksToday, gardens],
  );

  const attention = useMemo(() => {
    const now = Date.now();
    return gardens
      .map((g) => {
        const gTasks = allTasks.filter((t) => t.gardenId === g.id && isTaskOpen(t));
        const overdue = gTasks.filter(isOverdue).length;
        const dueToday = gTasks.filter((t) => t.dueDate === todayKey).length;
        const gLogs = logs.filter((l) => l.gardenId === g.id);
        const lastLog = gLogs[0];
        const daysSince = lastLog
          ? Math.floor((now - new Date(lastLog.date).getTime()) / 86400000)
          : null;
        const reasons: string[] = [];
        if (overdue > 0) reasons.push(`${overdue} việc quá hạn`);
        if (dueToday > 0) reasons.push(`${dueToday} việc đến hạn hôm nay`);
        if (daysSince === null) reasons.push("chưa có nhật ký");
        else if (daysSince >= 14) reasons.push(`${daysSince} ngày chưa cập nhật`);
        const score = overdue * 100 + dueToday * 10 + (daysSince === null ? 5 : daysSince >= 14 ? 3 : 0);
        return { garden: g, reasons, score, level: overdue > 0 ? "high" : "medium" };
      })
      .filter((x) => x.reasons.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [gardens, allTasks, logs, todayKey]);

  const recentLogs = logs.slice(0, 4);
  const gardenById = new Map(gardens.map((g) => [g.id, g]));

  const hour = today.getHours();
  const greetingBase = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  const [userName, setUserName] = useState<string | null>(null);
  const farmActions = useFarmActions();
  const [busyTaskIds, setBusyTaskIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const u = data.user;
      if (!u) return setUserName(null);
      const metaName = (u.user_metadata as any)?.full_name || (u.user_metadata as any)?.name;
      if (metaName) return setUserName(String(metaName));
      if (u.email) return setUserName(u.email.split("@")[0]);
      return setUserName(null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const greeting = userName ? `Xin chào, ${userName}!` : `${greetingBase}`;

  async function toggleTaskComplete(task: any) {
    if (busyTaskIds[task.id]) return;
    try {
      setBusyTaskIds((s) => ({ ...s, [task.id]: true }));
      const newStatus = task.status === "Completed" ? "Todo" : "Completed";
      await farmActions.updateGardenTask(task.id, {
        gardenId: task.gardenId,
        title: task.title,
        description: task.description ?? "",
        category: task.category ?? "Other",
        priority: task.priority ?? "Medium",
        cost: task.cost ?? 0,
        expenseCategory: task.expenseCategory ?? "Khác",
        status: newStatus,
        dueDate: task.dueDate ?? null,
        reminderAt: task.reminderAt ?? null,
        notes: task.notes ?? "",
      });
      // Thông báo thành công
      if (newStatus === "Completed") {
        toast.success("Đã đánh dấu hoàn thành.");
      } else {
        toast.success("Đã chuyển về chưa hoàn thành.");
      }
    } catch (e) {
      console.error("Failed to update task status", e);
      toast.error(e instanceof Error ? e.message : "Không thể cập nhật trạng thái");
    } finally {
      setBusyTaskIds((s) => ({ ...s, [task.id]: false }));
    }
  }
  const formattedDate = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(today);

  const headline =
    stats.overdue.length > 0
      ? `Có ${stats.overdue.length} việc quá hạn cần xử lý ngay.`
      : stats.tasksToday.length > 0
        ? `Hôm nay có ${stats.tasksToday.length} việc đến hạn.`
        : gardens.length === 0
          ? "Thêm khu vườn đầu tiên để bắt đầu theo dõi."
          : "Không có việc quá hạn. Kiểm tra vườn và ghi nhật ký nhé.";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden p-4 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
          <h1 className="mt-1 text-3xl font-bold">{greeting}</h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">{headline}</p>
        </div>
        <Button asChild size="lg" className="gradient-primary min-h-11 shrink-0 text-primary-foreground">
            <Link to="/logs/new" className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Ghi nhật ký
            </Link>
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Việc hôm nay" value={stats.tasksToday.length} hint="Cần hoàn thành" icon={<ListChecks className="h-5 w-5" />} />
        <StatCard label="Quá hạn" value={stats.overdue.length} hint={stats.overdue.length ? "Cần xử lý ngay" : "Không có việc trễ"} icon={<AlertTriangle className="h-5 w-5" />} tone={stats.overdue.length ? "bad" : "good"} />
        <StatCard label="Chi phí tháng" value={formatVnd(finance.expense)} hint="Nhật ký và công việc" icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Lợi nhuận tháng" value={formatVnd(finance.profit)} hint="Doanh thu trừ chi phí" icon={<Coins className="h-5 w-5" />} tone={finance.profit >= 0 ? "good" : "bad"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card className="border-border shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-5">
            <div>
              <h2 className="text-lg font-semibold">Việc cần làm hôm nay</h2>
              <p className="mt-1 text-sm text-muted-foreground">Đánh dấu ngay khi hoàn thành.</p>
            </div>
            <Badge variant="secondary">{stats.tasksToday.length} việc</Badge>
          </div>
          <CardContent className="space-y-4 p-5">
            {todayTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="font-medium">Hôm nay chưa có việc đến hạn</p>
                  <p className="mt-1 text-sm text-muted-foreground">Bạn có thể kiểm tra các vườn hoặc ghi nhật ký mới.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {todayTasks.slice(0, 5).map((task) => {
                  const priority = task.priority || "Trung bình";
                  const priorityClasses =
                    priority.toLowerCase() === "cao"
                      ? "bg-rose-500/10 text-rose-700"
                      : priority.toLowerCase() === "thấp"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-amber-500/10 text-amber-700";
                  return (
                    <li key={task.id} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start gap-4">
                        <label className="mt-1 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={task.status === "Completed"}
                            onChange={async () => await toggleTaskComplete(task)}
                            disabled={!!busyTaskIds[task.id]}
                            aria-busy={busyTaskIds[task.id] ? true : undefined}
                           className={`h-5 w-5 rounded border-input text-primary focus:ring-ring ${busyTaskIds[task.id] ? "cursor-not-allowed opacity-60" : ""}`}
                          />
                           {busyTaskIds[task.id] && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        </label>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{task.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{task.garden?.name ?? "Khu vườn"}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          {task.dueTime ?? "Không có giờ"}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${priorityClasses}`}>{priority}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex justify-end">
              <Link to="/gardens" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline">
                Xem các khu vườn
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><CloudSun className="h-5 w-5 text-primary" /> Thời tiết hôm nay</h2>
            <Link to="/weather" className="text-sm font-semibold text-primary hover:underline">Xem 7 ngày</Link>
          </div>
          <WeatherCard compact />
          {!weather && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Chưa có dữ liệu thời tiết.</p>}
        </div>
      </div>

      {attention.length > 0 && (
        <section className="space-y-3" aria-labelledby="attention-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="attention-title" className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-5 w-5 text-destructive" /> Vườn cần chú ý</h2>
            <Link to="/gardens" className="text-sm font-semibold text-primary hover:underline">Xem tất cả</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {attention.slice(0, 2).map(({ garden, reasons, level }) => (
              <Link key={garden.id} to="/gardens/$gardenId" params={{ gardenId: garden.id }} className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent">
                <div className="min-w-0">
                  <p className="font-semibold">{garden.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{reasons.join(" · ")}</p>
                </div>
                <Badge variant={level === "high" ? "destructive" : "secondary"}>{level === "high" ? "Cần xử lý" : "Theo dõi"}</Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Các khu vườn của bạn</h2>
            <p className="mt-1 text-sm text-muted-foreground">Mở nhanh khu vườn cần làm việc.</p>
          </div>
          <Link to="/gardens" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Xem tất cả
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {gardens.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="font-medium">Chưa có khu vườn nào</p>
            <Button asChild size="lg" className="mt-4"><Link to="/gardens"><Plus className="h-4 w-4" /> Thêm khu vườn</Link></Button>
          </div>
        ) : <div className="grid gap-4 lg:grid-cols-3">
          {gardens.slice(0, 3).map((g) => {
            const gTasks = allTasks.filter((t) => t.gardenId === g.id && isTaskOpen(t));
            const taskCount = gTasks.length;
            const att = attention.find((x) => x.garden.id === g.id);
            const healthLabel = att ? (att.level === "high" ? "Cần chú ý" : "Trung bình") : "Tốt";
            return (
              <Link
                key={g.id}
                to="/gardens/$gardenId"
                params={{ gardenId: g.id }}
                className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary">{g.crop}</Badge>
                    <span className="text-sm font-medium text-muted-foreground">{g.area} ha</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{g.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{taskCount > 0 ? `${taskCount} việc đang chờ` : "Không có việc đang chờ"}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <Badge variant={att?.level === "high" ? "destructive" : "outline"}>{healthLabel}</Badge>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">Mở vườn <ArrowRight className="h-4 w-4" /></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Các ghi chú mới nhất từ vườn của bạn.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có hoạt động gần đây.</p>
            ) : (
              <div className="space-y-4">
                {recentLogs.map((l) => {
                  const g = gardenById.get(l.gardenId);
                  return (
                    <div key={l.id} className="flex items-start gap-4">
                       <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <NotebookPen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                           <p className="text-sm font-semibold">{l.type}</p>
                           <Badge variant="secondary">{g?.name ?? "Khu vườn"}</Badge>
                        </div>
                        {l.note && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{l.note}</p>}
                        <p className="mt-2 text-xs text-muted-foreground">{new Date(l.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <DashboardAI />
      </div>

      <section className="space-y-3" aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="text-lg font-semibold">Mở nhanh</h2>
        <div className="grid gap-3 sm:grid-cols-3">
        <Button asChild variant="outline" size="lg" className="min-h-12 justify-start">
          <Link to="/gardens" className="flex items-center justify-center gap-2">
            <Sprout className="h-5 w-5" /> Quản lý khu vườn
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="min-h-12 justify-start">
          <Link to="/diagnose" className="flex items-center justify-center gap-2">
            <Stethoscope className="h-5 w-5" /> Chẩn đoán sâu bệnh
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="min-h-12 justify-start">
          <Link to="/finance" className="flex items-center justify-center gap-2">
            <BarChart3 className="h-5 w-5" /> Báo cáo tài chính
          </Link>
        </Button>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint, icon, tone }: { label: string; value: number | string; hint?: string; icon: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
             <p className="text-sm text-muted-foreground">{label}</p>
             <p className={`mt-2 text-2xl font-bold ${tone === "good" ? "text-primary" : tone === "bad" ? "text-destructive" : "text-foreground"}`}>{value}</p>
            {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
          </div>
           <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
