import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MapPin, Droplets, Wind, CloudRain, RefreshCw, Locate } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWeather } from "@/lib/use-weather";

const COOLDOWN_SECONDS = 60;

export function WeatherCard({ compact = false }: { compact?: boolean } = {}) {
  const { data, isLoading, isFetching, isError, error, refresh, location, requestGPS } = useWeather();
  const isRateLimited = error instanceof Error && /429/.test(error.message);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (isRateLimited) setCooldown(COOLDOWN_SECONDS);
  }, [isRateLimited, error]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleRefresh = () => {
    if (cooldown > 0 || isFetching) return;
    refresh();
  };

  // Chế độ gọn: ẩn hoàn toàn nếu chưa có dữ liệu thời tiết
  if (compact) {
    if (!data) return null;
    return (
      <Card className="overflow-hidden border-none bg-gradient-to-br from-sky-500 via-sky-600 to-emerald-600 text-white shadow-lg">
        <CardContent className="p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] opacity-90">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{location?.label || data.location}</span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-3xl font-black leading-none">{data.temperature}°</span>
                <span className="text-lg">{data.emoji}</span>
                <span className="truncate text-xs opacity-95">{data.description}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-95">
                <span className="flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5" />
                  {data.humidity}%
                </span>
                <span className="flex items-center gap-1">
                  <CloudRain className="h-3.5 w-3.5" />
                  {data.rainfall} mm
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5" />
                  {data.windSpeed} km/h
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleRefresh}
                disabled={isFetching || cooldown > 0}
                aria-label="Cập nhật thời tiết"
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Link to="/weather" className="text-[11px] font-medium underline-offset-2 hover:underline">
                7 ngày →
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-none bg-gradient-to-br from-sky-500 via-sky-600 to-emerald-600 text-white shadow-lg">
      <CardContent className="p-5">
        {isError && !data ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              {isRateLimited ? "Máy chủ thời tiết đang bận" : "Không tải được thời tiết"}
            </p>
            <p className="text-xs opacity-90">
              {isRateLimited
                ? "Đã vượt giới hạn truy vấn. Vui lòng thử lại sau giây lát."
                : error instanceof Error ? error.message : "Lỗi mạng"}
            </p>
            <Button size="sm" variant="secondary" onClick={handleRefresh} disabled={cooldown > 0 || isFetching}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {cooldown > 0 ? `Thử lại sau ${cooldown}s` : "Thử lại"}
            </Button>
          </div>
        ) : isLoading || !data ? (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải thời tiết...
          </div>
        ) : (

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs opacity-90">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{location?.label || data.location}</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-5xl font-black leading-none">{data.temperature}°</span>
                  <span className="text-2xl">{data.emoji}</span>
                </div>
                <p className="mt-1 text-sm opacity-95">{data.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={handleRefresh}
                  disabled={isFetching || cooldown > 0}
                  aria-label="Cập nhật thời tiết"
                >
                  {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={requestGPS}
                  aria-label="Vị trí GPS"
                >
                  <Locate className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MiniStat icon={<Droplets className="h-4 w-4" />} label="Độ ẩm" value={`${data.humidity}%`} />
              <MiniStat icon={<CloudRain className="h-4 w-4" />} label="Mưa" value={`${data.rainfall} mm`} />
              <MiniStat icon={<Wind className="h-4 w-4" />} label="Gió" value={`${data.windSpeed} km/h`} />
            </div>

            <Link
              to="/weather"
              className="block rounded-lg bg-white/15 py-2 text-center text-sm font-medium backdrop-blur transition hover:bg-white/25"
            >
              Xem dự báo 7 ngày →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur">
      <div className="flex items-center gap-1 text-[11px] opacity-90">{icon}<span>{label}</span></div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
