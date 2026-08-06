import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sprout,
  Plus,
  ListChecks,
  AlertTriangle,
  Wallet,
  ArrowRight,
  Activity,
  NotebookPen,
} from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFarmStore, useAllGardenTasks } from "@/lib/farm-store";
import { isTaskOpen, isOverdue } from "@/lib/garden-task-utils";
import { DashboardAI } from "@/components/dashboard-ai";
import { WeatherCard } from "@/components/weather-card";
import { WeatherAlert } from "@/components/weather-alert";
import { TodayTasks } from "@/components/today-tasks";
import { SprayTiming } from "@/components/spray-timing";
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

function Dashboard() {
  const { gardens, logs } = useFarmStore();
  const { data: allTasks = [] } = useAllGardenTasks();
  const { data: weather } = useWeather();

  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const openTasks = allTasks.filter(isTaskOpen);
    const tasksToday = openTasks.filter((t) => t.dueDate === today);
    const overdue = openTasks.filter(isOverdue);
    const month = today.slice(0, 7);
    const monthlyCost = logs
      .filter((l) => l.date.slice(0, 7) === month)
      .reduce((s, l) => s + (l.cost || 0), 0);
    return { tasksToday, overdue, monthlyCost };
  }, [allTasks, logs, today]);

  const attention = useMemo(() => {
    const now = Date.now();
    return gardens
      .map((g) => {
        const gTasks = allTasks.filter((t) => t.gardenId === g.id && isTaskOpen(t));
        const overdue = gTasks.filter(isOverdue).length;
        const dueToday = gTasks.filter((t) => t.dueDate === today).length;
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
  }, [gardens, allTasks, logs, today]);

  const recentLogs = logs.slice(0, 5);
  const gardenById = new Map(gardens.map((g) => [g.id, g]));

  const headline =
    stats.overdue.length > 0
      ? `Có ${stats.overdue.length} việc quá hạn cần xử lý ngay.`
      : stats.tasksToday.length > 0
        ? `Hôm nay có ${stats.tasksToday.length} việc đến hạn.`
        : gardens.length === 0
          ? "Thêm khu vườn đầu tiên để bắt đầu theo dõi."
          : "Không có việc quá hạn. Kiểm tra vườn và ghi nhật ký nhé.";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden p-4 sm:p-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "numeric",
              month: "numeric",
            })}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Hôm nay cần làm gì?</h1>
          <p className="mt-1 text-sm text-muted-foreground">{headline}</p>
        </div>
        <Button asChild size="lg" className="gradient-primary shrink-0 text-primary-foreground">
          <Link to="/logs/new">
            <Plus /> Ghi nhật ký
          </Link>
        </Button>
      </header>

      <WeatherAlert />

      <TodayTasks />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Khu vườn"
          value={gardens.length}
          hint="đang quản lý"
          icon={<Sprout className="h-5 w-5" />}
        />
        <StatCard
          label="Việc hôm nay"
          value={stats.tasksToday.length}
          hint="đến hạn hôm nay"
          icon={<ListChecks className="h-5 w-5" />}
        />
        <StatCard
          label="Việc quá hạn"
          value={stats.overdue.length}
          hint="cần xử lý ngay"
          icon={<AlertTriangle className="h-5 w-5" />}
          alert={stats.overdue.length > 0}
        />
        <StatCard
          label="Chi phí tháng này"
          value={currency(stats.monthlyCost)}
          hint="từ nhật ký"
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Khu vườn cần chú ý
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tất cả khu vườn đều ổn. Không có việc quá hạn.
              </p>
            ) : (
              <ul className="space-y-2">
                {attention.map(({ garden, reasons, level }) => (
                  <li key={garden.id}>
                    <Link
                      to="/gardens/$gardenId"
                      params={{ gardenId: garden.id }}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card/50 p-3 transition hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={
                              level === "high"
                                ? "h-2.5 w-2.5 shrink-0 rounded-full bg-destructive"
                                : "h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500"
                            }
                          />
                          <span className="truncate font-medium">{garden.name}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {reasons.join(" · ")}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <WeatherCard compact />
          {weather ? <SprayTiming /> : null}
        </div>
      </div>

      <DashboardAI />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Hoạt động gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
              <p className="font-medium">Chưa có hoạt động nào</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Bắt đầu ghi nhật ký để theo dõi công việc trên nông trại.
              </p>
              <Button asChild className="mt-4 gradient-primary text-primary-foreground">
                <Link to="/logs/new">
                  <Plus /> Ghi nhật ký
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentLogs.map((l) => {
                const g = gardenById.get(l.gardenId);
                return (
                  <li key={l.id} className="flex items-start gap-3 py-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <NotebookPen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{l.type}</span>
                        <Badge variant="secondary">{g?.name ?? "Khu đã xoá"}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(l.date).toLocaleDateString("vi-VN")}
                        </span>
                        {l.cost > 0 && (
                          <span className="text-xs text-muted-foreground">{currency(l.cost)}</span>
                        )}
                      </div>
                      {l.note && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{l.note}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  alert = false,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "overflow-hidden border-destructive/40 bg-destructive/5" : "overflow-hidden"}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{label}</p>
            <p className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
          </div>
          <div
            className={
              alert
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground"
                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-primary text-primary-foreground"
            }
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
