import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sprout,
  Plus,
  ListChecks,
  AlertTriangle,
  Wallet,
  ArrowRight,
  NotebookPen,
  Bell,
  Sun,
  Image,
  FilePlus,
  CheckSquare,
  Clock3,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useEffect, useState } from "react";
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

const currency = (n: number) => `${n.toLocaleString("vi-VN")} đ`;

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

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const openTasks = allTasks.filter(isTaskOpen);
    const tasksToday = openTasks.filter((t) => t.dueDate === todayKey);
    const overdue = openTasks.filter(isOverdue);
    const month = todayKey.slice(0, 7);
    const monthlyCost = logs
      .filter((l) => l.date.slice(0, 7) === month)
      .reduce((s, l) => s + (l.cost || 0), 0);
    const totalArea = gardens.reduce((s, g) => s + (g.area || 0), 0);
    return { tasksToday, overdue, monthlyCost, totalArea };
  }, [allTasks, logs, gardens, todayKey]);

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

  const weatherWarning = useMemo(() => {
    if (!weather) return null;
    const next24 = weather.hourly.slice(0, 24);
    const totalRain = next24.reduce((s, h) => s + (h.rainfall || 0), 0);
    const maxProb = next24.reduce((m, h) => Math.max(m, h.precipProbability || 0), 0);
    if (totalRain >= 15) {
      return `Mưa lớn trong 24 giờ tới, dự kiến ${totalRain.toFixed(1)} mm.`;
    }
    if (maxProb >= 70) {
      return `Khả năng mưa cao ${maxProb}%. Hoãn phun thuốc.`;
    }
    return "Thời tiết ổn định, thuận lợi cho công việc ngoài trời.";
  }, [weather]);

  const alertCards = useMemo(
    () => {
      const cards: Array<{
        title: string;
        description: string;
        tag: string;
        icon: React.ReactNode;
        to: string;
        variant: "danger" | "warning" | "info";
      }> = [];

      if (attention[0]) {
        cards.push({
          title: `Vườn ${attention[0].garden.name}`,
          description: attention[0].reasons.join(" · "),
          tag: attention[0].level === "high" ? "Khẩn cấp" : "Cần theo dõi",
          icon: <AlertTriangle className="h-5 w-5 text-rose-600" />,
          to: `/gardens/${attention[0].garden.id}`,
          variant: attention[0].level === "high" ? "danger" : "warning",
        });
      }

      if (attention[1]) {
        cards.push({
          title: `Vườn ${attention[1].garden.name}`,
          description: attention[1].reasons.join(" · "),
          tag: "Kiểm tra bệnh",
          icon: <ShieldAlert className="h-5 w-5 text-amber-600" />,
          to: `/gardens/${attention[1].garden.id}`,
          variant: "warning",
        });
      }

      cards.push({
        title: "Dự báo thời tiết",
        description: weatherWarning ?? "Chưa có dữ liệu thời tiết.",
        tag: "Thời tiết",
        icon: <Sun className="h-5 w-5 text-sky-600" />,
        to: "/weather",
        variant: "info",
      });

      return cards.slice(0, 3);
    },
    [attention, weatherWarning],
  );

  const recentLogs = logs.slice(0, 8);
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
        status: newStatus,
        dueDate: task.dueDate ?? null,
        reminderAt: task.reminderAt ?? null,
        notes: task.notes ?? "",
      });
    } catch (e) {
      console.error("Failed to update task status", e);
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
      <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1.6fr)_auto]">
        <div className="min-w-0 rounded-3xl border border-border bg-white/95 p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Xin chào,</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{greeting} <span className="inline-block">👋</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">{formattedDate}</p>
          <p className="mt-4 max-w-2xl text-sm text-slate-600">{headline}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="ghost" className="rounded-3xl px-4 py-3 text-slate-700 shadow-sm hover:bg-slate-100">
            <Bell className="h-5 w-5" />
          </Button>
          <Button asChild size="lg" className="rounded-3xl bg-emerald-600 px-5 py-3 text-white shadow-md hover:bg-emerald-700">
            <Link to="/logs/new" className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Ghi nhật ký nhanh
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-white/95 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                  <p className="text-sm font-semibold text-slate-900">Thời tiết Đắk Lắk</p>
                </div>
              <Button asChild variant="outline" size="sm" className="rounded-full px-4 py-2">
                <Link to="/weather">Xem chi tiết</Link>
              </Button>
            </div>
          </div>
          <WeatherCard />
        </div>

        <Card className="h-full rounded-3xl border border-border bg-white/95 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">Việc cần làm hôm nay</p>
              <p className="mt-1 text-sm text-muted-foreground">Danh sách nhiệm vụ được ưu tiên theo hạn chót.</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">{stats.tasksToday.length} việc</span>
          </div>
          <CardContent className="space-y-4 p-5">
            {todayTasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                Không có việc nào đến hạn hôm nay.
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
                    <li key={task.id} className="rounded-3xl border border-border bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <label className="mt-1 flex h-5 w-5 items-center justify-center">
                          <input
                            type="checkbox"
                            checked={task.status === "Completed"}
                            onChange={async () => await toggleTaskComplete(task)}
                            className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </label>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{task.garden?.name ?? "Khu vườn"}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
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
              <Link to="/gardens" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                Xem tất cả công việc
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {alertCards.map((card) => (
          <AlertCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Diện tích canh tác"
          value={`${stats.totalArea.toFixed(1)} ha`}
          hint={`${gardens.length} khu vườn`}
          icon={<Sprout className="h-5 w-5" />}
        />
        <StatCard
          label="Số khu vườn"
          value={gardens.length}
          hint="Tổng số vườn đang quản lý"
          icon={<Image className="h-5 w-5" />}
        />
        <StatCard
          label="Việc đến hạn hôm nay"
          value={stats.tasksToday.length}
          hint="Nhiệm vụ cần ưu tiên"
          icon={<ListChecks className="h-5 w-5" />}
        />
        <StatCard
          label="Chi phí tháng"
          value={currency(stats.monthlyCost)}
          hint="Từ nhật ký hoạt động"
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Các khu vườn của bạn</h2>
            <p className="mt-1 text-sm text-muted-foreground">Theo dõi sức khỏe, công việc và chi phí từng vườn.</p>
          </div>
          <Link to="/gardens" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Xem tất cả
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {gardens.slice(0, 3).map((g) => {
            const gTasks = allTasks.filter((t) => t.gardenId === g.id && isTaskOpen(t));
            const taskCount = gTasks.length;
            const monthlyExpense = logs
              .filter((l) => l.gardenId === g.id && l.date.slice(0, 7) === todayKey.slice(0, 7))
              .reduce((s, l) => s + (l.cost || 0), 0);
            const att = attention.find((x) => x.garden.id === g.id);
            const healthLabel = att ? (att.level === "high" ? "Cần chú ý" : "Trung bình") : "Tốt";
            return (
              <Link
                key={g.id}
                to="/gardens/$gardenId"
                params={{ gardenId: g.id }}
                className="group block overflow-hidden rounded-3xl border border-border bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-44 overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-slate-900 text-white">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_35%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(15,23,42,0.9))]" />
                  <div className="relative flex h-full flex-col justify-end p-5">
                    <div className="text-sm uppercase tracking-[0.18em] text-emerald-100/80">{g.crop}</div>
                    <h3 className="mt-2 text-2xl font-semibold">{g.name}</h3>
                    <p className="mt-1 text-sm text-emerald-100/80">{g.area} ha</p>
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      <span className={`h-2.5 w-2.5 rounded-full ${att ? (att.level === "high" ? "bg-rose-500" : "bg-amber-500") : "bg-emerald-500"}`} />
                      {healthLabel}
                    </span>
                    <Badge variant="secondary">{g.crop}</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Công việc</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{taskCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Chi phí</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{monthlyExpense > 0 ? currency(monthlyExpense) : "0 đ"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sức khỏe</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{healthLabel}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="rounded-3xl border border-border bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Các ghi chú mới nhất từ vườn của bạn.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có hoạt động gần đây.</p>
            ) : (
              <div className="space-y-4">
                {recentLogs.slice(0, 5).map((l) => {
                  const g = gardenById.get(l.gardenId);
                  return (
                    <div key={l.id} className="flex items-start gap-4">
                      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <NotebookPen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{l.type}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{g?.name ?? "Khu vườn"}</span>
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Button asChild className="rounded-full bg-emerald-600 px-4 py-3 text-white shadow-md hover:bg-emerald-700">
          <Link to="/gardens" className="flex items-center justify-center gap-2">
            <ListChecks className="h-5 w-5" /> Thêm công việc
          </Link>
        </Button>
        <Button asChild className="rounded-full bg-white px-4 py-3 text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
          <Link to="/logs/new" className="flex items-center justify-center gap-2">
            <NotebookPen className="h-5 w-5" /> Ghi nhật ký
          </Link>
        </Button>
        <Button asChild className="rounded-full bg-white px-4 py-3 text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
          <Link to="/gardens" className="flex items-center justify-center gap-2">
            <Wallet className="h-5 w-5" /> Thêm chi phí
          </Link>
        </Button>
        <Button asChild className="rounded-full bg-white px-4 py-3 text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
          <Link to="/diagnose" className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Scan sâu bệnh
          </Link>
        </Button>
        <Button asChild className="rounded-full bg-white px-4 py-3 text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
          <Link to="/reports" className="flex items-center justify-center gap-2">
            <FilePlus className="h-5 w-5" /> Báo cáo nhanh
          </Link>
        </Button>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint, icon }: { label: string; value: number | string; hint?: string; icon: React.ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-3xl border border-border bg-white/95 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
            {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({
  title,
  description,
  tag,
  icon,
  to,
  variant = "info",
}: {
  title: string;
  description: string;
  tag: string;
  icon: React.ReactNode;
  to: string;
  variant?: "danger" | "warning" | "info";
}) {
  const tone =
    variant === "danger"
      ? "bg-rose-50 text-rose-700"
      : variant === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-sky-50 text-sky-700";
  return (
    <Card className="rounded-3xl border border-border bg-white/95 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-3xl ${tone}`}>{icon}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-600">{tag}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div>
          <Button asChild size="sm" className="rounded-full px-4 py-2">
            <Link to={to}>Xem chi tiết</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
