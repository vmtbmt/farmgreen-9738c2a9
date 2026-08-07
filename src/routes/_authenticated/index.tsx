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
  Bell,
  Sun,
  Thermometer,
  Droplet,
  Wind,
  Image,
  FilePlus,
} from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFarmStore, useAllGardenTasks } from "@/lib/farm-store";
import { supabase } from "@/integrations/supabase/client";
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
    const totalArea = gardens.reduce((s, g) => s + (g.area || 0), 0);
    return { tasksToday, overdue, monthlyCost, totalArea };
  }, [allTasks, logs, gardens, today]);

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

  const recentLogs = logs.slice(0, 8);
  const gardenById = new Map(gardens.map((g) => [g.id, g]));

  const hour = new Date().getHours();
  const greetingBase = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  const [userName, setUserName] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const u = data.user;
      if (!u) return setUserName(null);
      // Prefer user metadata full name, fall back to email prefix
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
      {/* Header */}
      <header className="grid items-center gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{greeting},</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{headline}</p>
        </div>

        <div className="hidden sm:flex sm:items-center sm:justify-end lg:col-span-3">
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <Button variant="ghost" className="rounded-xl p-2" title="Thông báo">
                <Bell className="h-5 w-5" />
              </Button>
              {stats.overdue.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-xs font-semibold">
                  {stats.overdue.length}
                </span>
              )}
            </div>

            <Button asChild size="lg" className="rounded-xl bg-emerald-600 text-white shadow-md hover:bg-emerald-700">
              <Link to="/logs/new" className="flex items-center gap-2 px-4 py-2">
                <Plus className="h-4 w-4" /> Ghi nhật ký nhanh
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* First row: Weather (left) & Today's tasks (right) */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div className="md:col-span-2 lg:col-span-2">
          <WeatherCard />
        </div>
        <div className="md:col-span-1 lg:col-span-2">
          <TodayTasks />
        </div>
      </div>

      {/* Second row: Alerts (3-card layout similar to mock) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {attention.length === 0 ? (
          <Card className="col-span-3">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Sun className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">Không có cảnh báo</p>
                  <p className="mt-1 text-sm text-muted-foreground">Mọi khu vườn đang ổn định.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {attention.slice(0,3).map((a, i) => (
              <Card key={a.garden.id} className="rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      {/* differentiate icon by index */}
                      {i === 0 ? <AlertTriangle className="h-6 w-6 text-amber-500" /> : <Sun className="h-6 w-6 text-sky-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{a.garden.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.reasons.join(' · ')}</p>
                        </div>
                        <Badge variant="secondary" className={a.level === 'high' ? 'bg-destructive/10 text-destructive' : ''}>{a.level === 'high' ? 'Khẩn' : 'Cần chú ý'}</Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button asChild size="sm">
                          <Link to={`/gardens/${a.garden.id}`}>Xem chi tiết</Link>
                        </Button>
                        <Button size="sm" variant="outline">Ghi nhật ký</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Third row: Statistics (compact colorful tiles) */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <Sprout className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Diện tích canh tác</div>
              <div className="mt-1 text-lg font-bold">{stats.totalArea} ha</div>
              <div className="text-[11px] text-muted-foreground">{gardens.length} khu vườn</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <Image className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Số cây trồng</div>
              <div className="mt-1 text-lg font-bold">—</div>
              <div className="text-[11px] text-muted-foreground">Tổng số cây</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <ListChecks className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Việc hôm nay</div>
              <div className="mt-1 text-lg font-bold">{stats.tasksToday.length}</div>
              <div className="text-[11px] text-muted-foreground">Việc đến hạn hôm nay</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Chi phí tháng</div>
              <div className="mt-1 text-lg font-bold">{currency(stats.monthlyCost)}</div>
              <div className="text-[11px] text-muted-foreground">Từ nhật ký</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fourth row: Garden Cards */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="mb-3 text-lg font-semibold">Các khu vườn của bạn</h2>
          <Link to="/gardens" className="text-sm text-primary underline-offset-2 hover:underline">Xem tất cả →</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gardens.map((g) => {
            const gTasks = allTasks.filter((t) => t.gardenId === g.id && isTaskOpen(t));
            const taskCount = gTasks.length;
            const month = today.slice(0, 7);
            const monthlyExpense = logs.filter((l) => l.gardenId === g.id && l.date.slice(0, 7) === month).reduce((s, l) => s + (l.cost || 0), 0);
            const att = attention.find((x) => x.garden.id === g.id);
            const health = att ? (att.level === 'high' ? 'Cần chú ý' : 'Trung bình') : 'Tốt';
            return (
              <Link
                key={g.id}
                to="/gardens/$gardenId"
                params={{ gardenId: g.id }}
                className="group block rounded-xl border border-border bg-card/50 overflow-hidden transition hover:shadow-lg"
              >
                <div className="h-36 w-full overflow-hidden">
                  {/* Placeholder thumbnail: use accent gradient with crop name overlay (no fake data added) */}
                  <div className="h-36 w-full bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-end p-3 text-white">
                    <div>
                      <div className="text-sm font-semibold">{g.name}</div>
                      <div className="text-xs opacity-90">{g.crop} • {g.area} ha</div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${att ? (att.level === 'high' ? 'bg-destructive' : 'bg-amber-500') : 'bg-emerald-500'}`} />
                      <div className="text-sm font-medium">{g.name}</div>
                    </div>
                    <Badge variant="secondary">{g.crop}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{taskCount} việc • Chi phí tháng {monthlyExpense > 0 ? currency(monthlyExpense) : '0 đ'}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Fifth row: Recent Activities (timeline) */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Hoạt động gần đây</h2>
        <div className="space-y-4">
          {recentLogs.map((l) => {
            const g = gardenById.get(l.gardenId);
            return (
              <div key={l.id} className="flex items-start gap-4">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <NotebookPen className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{l.type}</span>
                      <Badge variant="secondary">{g?.name ?? 'Khu đã xoá'}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(l.date).toLocaleDateString('vi-VN')}</div>
                  </div>
                  {l.note && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{l.note}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sixth row: AI Advisor (kept as-is, only triggers on user click) */}
      <div>
        <DashboardAI />
      </div>

      {/* Bottom: Quick Actions */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className="rounded-full bg-emerald-600 text-white px-4 py-2 shadow-md">
            <Link to="/logs/new" className="flex items-center gap-2"><Plus /> Thêm nhật ký</Link>
          </Button>
          <Link to="/gardens"><Button className="rounded-full px-4 py-2">Thêm khu vườn</Button></Link>
          <Link to="/diagnose"><Button className="rounded-full px-4 py-2"><AlertTriangle /> Scan bệnh</Button></Link>
          <Link to="/reports"><Button className="rounded-full px-4 py-2"><FilePlus /> Báo cáo</Button></Link>
          <Link to="/gardens"><Button className="rounded-full px-4 py-2"><ListChecks /> Thêm việc</Button></Link>
          <Button className="ml-auto rounded-full bg-primary text-primary-foreground px-3 py-2">+ </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint, icon, alert = false }: { label: string; value: number | string; hint?: string; icon: React.ReactNode; alert?: boolean; }) {
  return (
    <Card className={alert ? 'overflow-hidden border-destructive/40 bg-destructive/5' : 'overflow-hidden'}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{label}</p>
            <p className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
            {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
          </div>
          <div className={alert ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground' : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-primary text-primary-foreground'}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({ title, description, level = 'medium', to }: { title: string; description: string; level?: 'high' | 'medium'; to: string }) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start gap-3">
          <div className={level === 'high' ? 'rounded-lg bg-destructive/10 p-2 text-destructive' : 'rounded-lg bg-amber-100 p-2 text-amber-700'}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{title}</h3>
              <Link to={to} className="text-xs text-primary">Mở</Link>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <div className="mt-3">
              <Button asChild size="sm">
                <Link to={to}>Xem chi tiết</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
