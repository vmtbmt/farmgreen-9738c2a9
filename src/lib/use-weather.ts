import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getWeather, type WeatherResult } from "./weather.functions";

const LOCATION_KEY = "farm-weather-location";
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

  const query = useQuery<WeatherResult>({
    queryKey: ["weather", location?.latitude, location?.longitude],
    queryFn: () =>
      fetchWeather({ data: { latitude: location!.latitude, longitude: location!.longitude } }),
    enabled: !!location,
    staleTime: 30 * 60 * 1000, // 30 phút cache
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (i) => Math.min(1500 * (i + 1), 5000),
  });


  return { ...query, location, locationStatus: status, requestGPS, setManual };
}
