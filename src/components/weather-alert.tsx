import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useWeather } from "@/lib/use-weather";

export function WeatherAlert() {
  const { data } = useWeather();

  const alert = useMemo(() => {
    if (!data) return null;
    const next24 = data.hourly.slice(0, 24);
    const totalRain = next24.reduce((s, h) => s + (h.rainfall || 0), 0);
    const maxProb = next24.reduce((m, h) => Math.max(m, h.precipProbability || 0), 0);
    const heavyRain = next24.some((h) => h.rainfall >= 5);
    const strongWind = next24.some((h) => h.windSpeed > 30);

    if (heavyRain || totalRain >= 15) {
      return {
        title: "Dự báo mưa lớn trong 24 giờ tới",
        detail: `Tổng lượng mưa dự kiến ~${totalRain.toFixed(1)} mm. Hoãn phun thuốc và chuẩn bị hệ thống thoát nước.`,
      };
    }
    if (maxProb >= 70) {
      return {
        title: "Khả năng mưa cao trong 24 giờ tới",
        detail: `Xác suất mưa lên tới ${maxProb}%. Cân nhắc hoãn phun thuốc.`,
      };
    }
    if (strongWind) {
      return {
        title: "Gió mạnh trong 24 giờ tới",
        detail: "Không nên phun thuốc hoặc bón phân dạng bột. Kiểm tra giàn leo, cây con.",
      };
    }
    return null;
  }, [data]);

  if (!alert) return null;

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-amber-700 dark:text-amber-300">⚠️ {alert.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{alert.detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
