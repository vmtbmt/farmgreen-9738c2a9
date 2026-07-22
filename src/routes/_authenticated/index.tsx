import { createFileRoute, Link } from "@tanstack/react-router";
import { Sprout, NotebookPen, Ruler, Activity, TrendingUp, Plus } from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFarmStore } from "@/lib/farm-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tổng quan — Nông Trại Xanh" },
      { name: "description", content: "Bảng điều khiển thống kê khu vườn và hoạt động nông trại." },
      { property: "og:title", content: "Tổng quan — Nông Trại Xanh" },
      { property: "og:description", content: "Bảng điều khiển thống kê khu vườn và hoạt động." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { gardens, logs } = useFarmStore();

  const stats = useMemo(() => {
    const totalArea = gardens.reduce((s, g) => s + (g.area || 0), 0);
    const last7 = logs.filter((l) => {
      const d = new Date(l.date).getTime();
      return d >= Date.now() - 7 * 86400000;
    }).length;
    const byType = logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + 1;
      return acc;
    }, {});
    return { totalArea, last7, byType };
  }, [gardens, logs]);

  const recentLogs = logs.slice(0, 5);
  const gardenById = new Map(gardens.map((g) => [g.id, g]));

  const maxCount = Math.max(1, ...Object.values(stats.byType));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Xin chào, Nông dân 👋</h1>
          <p className="mt-1 text-muted-foreground">
            Tổng quan tình trạng nông trại của bạn hôm nay.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/gardens">
              <Sprout /> Khu vườn
            </Link>
          </Button>
          <Button asChild className="gradient-primary text-primary-foreground">
            <Link to="/logs/new">
              <Plus /> Ghi nhật ký
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tổng số khu vườn"
          value={gardens.length}
          hint="khu đang quản lý"
          icon={<Sprout className="h-5 w-5" />}
        />
        <StatCard
          label="Tổng diện tích"
          value={stats.totalArea.toLocaleString("vi-VN")}
          hint="m² canh tác"
          icon={<Ruler className="h-5 w-5" />}
        />
        <StatCard
          label="Nhật ký hoạt động"
          value={logs.length}
          hint="lượt ghi nhận"
          icon={<NotebookPen className="h-5 w-5" />}
        />
        <StatCard
          label="Hoạt động 7 ngày"
          value={stats.last7}
          hint="gần đây"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Hoạt động gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <EmptyState
                title="Chưa có hoạt động nào"
                description="Bắt đầu ghi nhật ký để theo dõi công việc trên nông trại."
                action={
                  <Button asChild className="gradient-primary text-primary-foreground">
                    <Link to="/logs/new">
                      <Plus /> Ghi nhật ký
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentLogs.map((l) => {
                  const g = gardenById.get(l.gardenId);
                  return (
                    <li key={l.id} className="flex items-start gap-3 py-3">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <NotebookPen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{l.type}</span>
                          <Badge variant="secondary">{g?.name ?? "Khu đã xoá"}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(l.date).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        {l.note && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {l.note}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phân bổ hoạt động</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(stats.byType).length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
            ) : (
              Object.entries(stats.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{type}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full gradient-primary"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
