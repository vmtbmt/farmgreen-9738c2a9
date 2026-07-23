import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";

type GardenRow = { id: string; name: string; crop: string; area: number; location: string; planted_at: string };
type LogRow = { id: string; garden_id: string; type: string; date: string; note: string; cost: number };

async function loadContext(supabase: any) {
  const [g, l] = await Promise.all([
    supabase.from("gardens").select("id,name,crop,area,location,planted_at"),
    supabase.from("activity_logs").select("id,garden_id,type,date,note,cost").order("date", { ascending: false }).limit(500),
  ]);
  const gardens: GardenRow[] = g.data ?? [];
  const logs: LogRow[] = l.data ?? [];
  return { gardens, logs };
}

// Hàm check cảnh báo cho dashboard
export const checkAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { gardens, logs } = await loadContext(context.supabase);
    const now = new Date();

    const alerts: Array<{ level: "warning" | "danger"; message: string }> = [];
    
    for (const g of gardens) {
      const gLogs = logs.filter((l) => l.garden_id === g.id);
      const last = gLogs[0];
      const daysSince = last ? Math.floor((now.getTime() - new Date(last.date).getTime()) / 86400000) : 9999;
      
      if (daysSince > 20) {
        alerts.push({ level: "danger", message: `Khu ${g.name} đã ${daysSince} ngày chưa có hoạt động nào.` });
      } else if (daysSince > 14) {
        alerts.push({ level: "warning", message: `Khu ${g.name} đã ${daysSince} ngày chưa có hoạt động.` });
      }
      
      const lastWater = gLogs.find((l) => l.type === "Tưới nước");
      const daysWater = lastWater ? Math.floor((now.getTime() - new Date(lastWater.date).getTime()) / 86400000) : 9999;
      
      if (daysWater > 20) {
        alerts.push({ level: "danger", message: `Khu ${g.name} chưa được tưới trong ${daysWater} ngày.` });
      }
    }

    return { alerts };
  });

type AlertsData = Awaited<ReturnType<typeof checkAlerts>> | null;

export function DashboardAI() {
  const check = useServerFn(checkAlerts);
  const [data, setData] = useState<AlertsData>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await check());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi kiểm tra cảnh báo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Cảnh báo thông minh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Cảnh báo thông minh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
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
  );
}
