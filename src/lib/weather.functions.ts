import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const WeatherInput = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type HourlyPoint = {
  time: string;
  temperature: number;
  humidity: number;
  precipProbability: number;
  rainfall: number;
  weatherCode: number;
  windSpeed: number;
};

export type DailyPoint = {
  date: string;
  tempMax: number;
  tempMin: number;
  precipProbability: number;
  rainfall: number;
  weatherCode: number;
  emoji: string;
};

export type WeatherResult = {
  temperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  rainfall: number;
  precipProbability: number;
  location: string;
  description: string;
  emoji: string;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
};

function getWeatherDescription(code: number): string {
  const m: Record<number, string> = {
    0: "Trời quang", 1: "Hầu như quang", 2: "Cục bộ có mây", 3: "Nhiều mây",
    45: "Sương mù", 48: "Sương đông",
    51: "Mưa phùn nhẹ", 53: "Mưa phùn vừa", 55: "Mưa phùn nặng",
    61: "Mưa nhẹ", 63: "Mưa vừa", 65: "Mưa nặng",
    71: "Tuyết nhẹ", 73: "Tuyết vừa", 75: "Tuyết nặng", 77: "Mưa tuyết",
    80: "Mưa rào nhẹ", 81: "Mưa rào vừa", 82: "Mưa rào lớn",
    85: "Tuyết rào nhẹ", 86: "Tuyết rào nặng",
    95: "Giông", 96: "Giông + mưa đá nhẹ", 99: "Giông + mưa đá nặng",
  };
  return m[code] || "Không xác định";
}

function getWeatherEmoji(code: number): string {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const fallback = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { "User-Agent": "FarmGreen/1.0 (contact@farmgreen.app)" }, signal: ctrl.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return fallback;
    const data = await res.json();
    const a = data.address || {};
    return a.city || a.town || a.village || a.county || a.state || fallback;
  } catch {
    return fallback;
  }
}


export const getWeather = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => WeatherInput.parse(d))
  .handler(async ({ data }): Promise<WeatherResult> => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${data.latitude}&longitude=${data.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,rain,precipitation_probability` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,rain,weather_code,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
      `&forecast_days=7&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Không thể lấy dữ liệu thời tiết (HTTP ${res.status})`);
    const json = await res.json();
    if (!json?.current) throw new Error("Dữ liệu thời tiết không hợp lệ");

    const current = json.current;
    const location = await reverseGeocode(data.latitude, data.longitude);


    const hourly: HourlyPoint[] = (json.hourly?.time || []).map((t: string, i: number) => ({
      time: t,
      temperature: Math.round(json.hourly.temperature_2m[i]),
      humidity: Math.round(json.hourly.relative_humidity_2m[i]),
      precipProbability: json.hourly.precipitation_probability?.[i] ?? 0,
      rainfall: json.hourly.rain?.[i] ?? 0,
      weatherCode: json.hourly.weather_code[i],
      windSpeed: Math.round((json.hourly.wind_speed_10m[i] ?? 0) * 10) / 10,
    }));

    const daily: DailyPoint[] = (json.daily?.time || []).map((t: string, i: number) => ({
      date: t,
      tempMax: Math.round(json.daily.temperature_2m_max[i]),
      tempMin: Math.round(json.daily.temperature_2m_min[i]),
      precipProbability: json.daily.precipitation_probability_max?.[i] ?? 0,
      rainfall: json.daily.precipitation_sum?.[i] ?? 0,
      weatherCode: json.daily.weather_code[i],
      emoji: getWeatherEmoji(json.daily.weather_code[i]),
    }));

    return {
      temperature: Math.round(current.temperature_2m),
      humidity: current.relative_humidity_2m,
      weatherCode: current.weather_code,
      windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
      rainfall: current.rain || 0,
      precipProbability: current.precipitation_probability ?? 0,
      location,
      description: getWeatherDescription(current.weather_code),
      emoji: getWeatherEmoji(current.weather_code),
      hourly,
      daily,
    };
  });
