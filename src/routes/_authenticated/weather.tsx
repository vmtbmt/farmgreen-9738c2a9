import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MapPin, Droplets, Wind, CloudRain, RefreshCw, Locate, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWeather } from "@/lib/use-weather";
import { WeatherAlert } from "@/components/weather-alert";
import { SprayTiming } from "@/components/spray-timing";

export const Route = createFileRoute("/_authenticated/weather")({
  head: () => ({
    meta: [
      { title: "Thời tiết nông nghiệp — Nông Trại Xanh" },
      { name: "description", content: "Thời tiết hiện tại, dự báo 7 ngày và thời gian phun thuốc tối ưu cho nông trại." },
      { property: "og:title", content: "Thời tiết nông nghiệp — Nông Trại Xanh" },
      { property: "og:description", content: "Dự báo và khuyến nghị phun thuốc dựa trên dữ liệu Open-Meteo." },
    ],
  }),
  component: WeatherPage,
});

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function WeatherPage() {
  const { data, isLoading, isFetching, refetch, location, requestGPS } = useWeather();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Thời tiết nông nghiệp</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dữ liệu Open-Meteo · cập nhật mỗi 30 phút
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={requestGPS}>
            <Locate className="h-4 w-4" /> Vị trí GPS
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu thời tiết...
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden border-none bg-gradient-to-br from-sky-500 via-sky-600 to-emerald-600 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-1.5 text-sm opacity-95">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{location?.label || data.location}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-black leading-none">{data.temperature}°</span>
                  <span className="text-4xl">{data.emoji}</span>
                </div>
                <div>
                  <p className="text-lg font-medium">{data.description}</p>
                  <p className="text-sm opacity-90">Xác suất mưa: {data.precipProbability}%</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat icon={<Droplets className="h-4 w-4" />} label="Độ ẩm" value={`${data.humidity}%`} />
                <Stat icon={<CloudRain className="h-4 w-4" />} label="Mưa" value={`${data.rainfall} mm`} />
                <Stat icon={<Wind className="h-4 w-4" />} label="Gió" value={`${data.windSpeed} km/h`} />
                <Stat icon={<Thermometer className="h-4 w-4" />} label="Cảm giác" value={`${data.temperature}°`} />
              </div>
            </CardContent>
          </Card>

          <WeatherAlert />

          <SprayTiming />

          <Card>
            <CardHeader>
              <CardTitle>Dự báo 7 ngày</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {data.daily.map((d, i) => {
                  const date = new Date(d.date);
                  const label = i === 0 ? "Hôm nay" : WEEKDAYS[date.getDay()];
                  return (
                    <div
                      key={d.date}
                      className="flex min-w-[96px] flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3 text-center"
                    >
                      <span className="text-xs font-medium text-muted-foreground">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {date.getDate()}/{date.getMonth() + 1}
                      </span>
                      <span className="text-2xl">{d.emoji}</span>
                      <span className="text-sm font-semibold">
                        {d.tempMax}° <span className="text-muted-foreground">/ {d.tempMin}°</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400">
                        <CloudRain className="h-3 w-3" /> {d.precipProbability}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dự báo giờ (24 giờ tới)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {data.hourly.slice(0, 24).map((h, i) => {
                  const t = new Date(h.time);
                  return (
                    <div
                      key={h.time}
                      className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl border border-border bg-card p-2 text-center"
                    >
                      <span className="text-[11px] text-muted-foreground">
                        {i === 0 ? "Hiện tại" : `${t.getHours().toString().padStart(2, "0")}h`}
                      </span>
                      <span className="text-lg">{emojiFor(h.weatherCode)}</span>
                      <span className="text-sm font-semibold">{h.temperature}°</span>
                      <span className="text-[10px] text-sky-600 dark:text-sky-400">{h.precipProbability}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-3 backdrop-blur">
      <div className="flex items-center gap-1 text-xs opacity-90">{icon}<span>{label}</span></div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function emojiFor(code: number): string {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}
