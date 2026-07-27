import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getWeather, type WeatherResult } from "./weather.functions";

const LOCATION_KEY = "farm-weather-location";
const CACHE_PREFIX = "farm-weather-cache:";
const CACHE_TTL = 30 * 60 * 1000; // 30 phút
const DEFAULT_LOCATION = { latitude: 12.6667, longitude: 108.05, label: "Buôn Ma Thuột (mặc định)" };

export type SavedLocation = {
  latitude: number;
  longitude: number;
  label?: string;
  source?: "gps" | "manual" | "default";
};

export function loadSavedLocation(): SavedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedLocation;
  } catch {
    return null;
  }
}

export function saveLocation(loc: SavedLocation) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
}

// Làm tròn toạ độ để cache key ổn định (tránh GPS jitter tạo key mới liên tục)
function roundCoord(n: number) {
  return Math.round(n * 100) / 100;
}

function cacheKey(lat: number, lon: number) {
  return `${CACHE_PREFIX}${roundCoord(lat)},${roundCoord(lon)}`;
}

type CachedWeather = { data: WeatherResult; timestamp: number };

function readCache(lat: number, lon: number): CachedWeather | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(lat, lon));
    if (!raw) return null;
    return JSON.parse(raw) as CachedWeather;
  } catch {
    return null;
  }
}

function writeCache(lat: number, lon: number, data: WeatherResult) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      cacheKey(lat, lon),
      JSON.stringify({ data, timestamp: Date.now() } satisfies CachedWeather),
    );
  } catch {
    // ignore quota errors
  }
}

export function useLocation() {
  const [location, setLocation] = useState<SavedLocation | null>(null);
  const [status, setStatus] = useState<"idle" | "asking" | "ready" | "denied">("idle");

  useEffect(() => {
    const saved = loadSavedLocation();
    if (saved) {
      setLocation(saved);
      setStatus("ready");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocation({ ...DEFAULT_LOCATION, source: "default" });
      setStatus("denied");
      return;
    }
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: SavedLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          source: "gps",
        };
        saveLocation(loc);
        setLocation(loc);
        setStatus("ready");
      },
      () => {
        const loc: SavedLocation = { ...DEFAULT_LOCATION, source: "default" };
        saveLocation(loc);
        setLocation(loc);
        setStatus("denied");
      },
      { timeout: 8000, maximumAge: 60 * 60 * 1000 },
    );
  }, []);

  const requestGPS = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: SavedLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          source: "gps",
        };
        saveLocation(loc);
        setLocation(loc);
        setStatus("ready");
      },
      () => setStatus("denied"),
    );
  };

  const setManual = (lat: number, lon: number, label?: string) => {
    const loc: SavedLocation = { latitude: lat, longitude: lon, label, source: "manual" };
    saveLocation(loc);
    setLocation(loc);
    setStatus("ready");
  };

  return { location, status, requestGPS, setManual };
}

export function useWeather() {
  const { location, status, requestGPS, setManual } = useLocation();
  const fetchWeather = useServerFn(getWeather);

  // Dùng toạ độ đã làm tròn làm key để tránh gọi lại khi GPS lệch nhẹ
  const lat = location ? roundCoord(location.latitude) : undefined;
  const lon = location ? roundCoord(location.longitude) : undefined;

  const cached = location ? readCache(location.latitude, location.longitude) : null;

  const query = useQuery<WeatherResult>({
    queryKey: ["weather", lat, lon],
    queryFn: async () => {
      const fresh = location ? readCache(location.latitude, location.longitude) : null;
      if (fresh && Date.now() - fresh.timestamp < CACHE_TTL) {
        return fresh.data;
      }
      try {
        const result = await fetchWeather({
          data: { latitude: location!.latitude, longitude: location!.longitude },
        });
        writeCache(location!.latitude, location!.longitude, result);
        return result;
      } catch (err) {
        // Bị 429 hoặc lỗi mạng: fallback về cache cũ (nếu có) để không vỡ UI
        if (fresh) return fresh.data;
        throw err;
      }
    },
    enabled: !!location,
    // Luôn cung cấp cache (kể cả cũ) — RQ tự refetch khi initialDataUpdatedAt cũ hơn staleTime
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.timestamp,
    staleTime: CACHE_TTL,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    retry: (failureCount, err) => {
      if (err instanceof Error && /429/.test(err.message)) return false;
      return failureCount < 1;
    },
    retryDelay: (i) => Math.min(2000 * (i + 1), 8000),
  });

  // Cập nhật thủ công: xoá cache rồi refetch để bắt buộc gọi API mới
  const refresh = () => {
    if (location && typeof window !== "undefined") {
      try {
        localStorage.removeItem(cacheKey(location.latitude, location.longitude));
      } catch {
        // ignore
      }
    }
    return query.refetch();
  };

  return { ...query, location, locationStatus: status, requestGPS, setManual, refresh };
}
