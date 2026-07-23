import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, AlertTriangle, Loader2, RefreshCw, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { analyzeFarm } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

type Analysis = Awaited<ReturnType<typeof analyzeFarm>> | null;

export function DashboardAI() {
  const analyze = useServerFn(analyzeFarm);
  const [data, setData] = useState<Analysis>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setError(null);
    try { setData(await analyze()); }
    catch (e) { setError(e instanceof Error ? e.message : "Lỗi phân tích"); }
    finally { setLoading(false); }
  };

  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="grid gap-6">
      {/* 
      COMMENTED: Phần "Phân tích AI tháng này"
      
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Phân tích AI tháng này
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={run} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && !data && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> AI đang phân tích dữ liệu...
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {data && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MiniStat label="Hoạt động" value={data.summary.activities_this_month} />
                  <MiniStat label="Tổng chi phí" value={`${data.summary.total_cost.toLocaleString("vi-VN")}₫`} />
                  <MiniStat label="Nhiều hoạt động" value={data.summary.top_activity_garden ?? "—"} />
                  <MiniStat label="Nhiều chi phí" value={data.summary.top_cost_garden ?? "—"} />
                </div>
                {data.recommendations.length > 0 && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                      <Target className="h-4 w-4" /> Khuyến nghị của AI
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {data.recommendations.map((r, i) => (
                        <li key={i} className="flex gap-2"><span className="text-primary">•</span><span>{r}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Cảnh báo thông minh
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!data || data.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có cảnh báo. Tuyệt vời! 🌱</p>
            ) : (
              data.alerts.map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2 rounded-lg border p-3 text-sm",
                    a.level === "danger"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                  )}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{a.message}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      */}

      {/* Cảnh báo thông minh - Hiển thị toàn chiều rộng */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Cảnh báo thông minh
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!data || data.alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có cảnh báo. Tuyệt vời! 🌱</p>
          ) : (
            data.alerts.map((a, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2 rounded-lg border p-3 text-sm",
                  a.level === "danger"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                )}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{a.message}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-lg font-bold">{value}</div>
    </div>
  );
}
