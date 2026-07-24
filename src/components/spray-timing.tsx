import { useMemo } from "react";
import { SprayCan, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HourlyPoint } from "@/lib/weather.functions";
import { useWeather } from "@/lib/use-weather";

type Rating = "good" | "medium" | "bad";

function rateHour(h: HourlyPoint): { rating: Rating; reason: string } {
  if (h.windSpeed > 25) return { rating: "bad", reason: "Gió mạnh" };
  if (h.rainfall > 0.1 || h.precipProbability >= 70) return { rating: "bad", reason: "Có mưa" };
  if (h.humidity > 90) return { rating: "medium", reason: "Ẩm cao" };
  if (h.windSpeed > 15) return { rating: "medium", reason: "Gió khá" };
  if (h.precipProbability >= 40) return { rating: "medium", reason: "Có thể mưa" };
  return { rating: "good", reason: "Điều kiện tốt" };
}

const styles: Record<Rating, { dot: string; label: string; ring: string }> = {
  good: { dot: "bg-emerald-500", label: "Tốt", ring: "border-emerald-500/40 bg-emerald-500/5" },
  medium: { dot: "bg-amber-500", label: "TB", ring: "border-amber-500/40 bg-amber-500/5" },
  bad: { dot: "bg-red-500", label: "Không nên", ring: "border-red-500/40 bg-red-500/5" },
};

export function SprayTiming() {
  const { data, isLoading } = useWeather();

  const slots = useMemo(() => {
    if (!data?.hourly?.length) return [];
    const now = new Date();
    const upcoming = data.hourly.filter((h) => new Date(h.time).getTime() >= now.getTime() - 3600000);
    return upcoming.slice(0, 8);
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SprayCan className="h-5 w-5 text-primary" /> Thời gian phun thuốc
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {slots.map((h, i) => {
              const r = rateHour(h);
              const s = styles[r.rating];
              const d = new Date(h.time);
              const label = i === 0 ? "Hiện tại" : `${d.getHours().toString().padStart(2, "0")}h`;
              return (
                <div
                  key={h.time}
                  className={cn(
                    "flex min-w-[78px] flex-col items-center gap-1 rounded-2xl border p-3 text-center",
                    s.ring,
                  )}
                >
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  <span className="text-lg font-semibold">{h.temperature}°</span>
                  <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                  <span className="text-[11px] font-medium">{s.label}</span>
                  <span className="text-[10px] text-muted-foreground">{r.reason}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
