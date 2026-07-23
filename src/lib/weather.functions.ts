import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const WeatherInput = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type WeatherData = {
  temperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  rainfall: number;
  location: string;
  description: string;
  emoji: string;
};

// Hàm chuyển đổi WMO weather code thành mô tả
function getWeatherDescription(code: number): string {
  const weatherDescriptions: Record<number, string> = {
    0: "Trời quang",
    1: "Hầu như quang",
    2: "Cục bộ có mây",
    3: "Toàn bộ có mây",
    45: "Sương mù",
    48: "Sương đông",
    51: "Mưa phùn nhẹ",
    53: "Mưa phùn vừa",
    55: "Mưa phùn nặng",
    61: "Mưa nhẹ",
    63: "Mưa vừa",
    65: "Mưa nặng",
    71: "Tuyết rơi nhẹ",
    73: "Tuyết rơi vừa",
    75: "Tuyết rơi nặng",
    77: "Tuyết tạo hạt",
    80: "Mưa bão nhẹ",
    81: "Mưa bão vừa",
    82: "Mưa bão nặng",
    85: "Tuyết bão nhẹ",
    86: "Tuyết bão nặng",
    95: "Giông nổi nhẹ",
    96: "Giông nổi có mưa đá nhẹ",
    99: "Giông nổi có mưa đá nặng",
  };
  return weatherDescriptions[code] || "Không xác định";
}

// Hàm chuyển đổi WMO code thành emoji
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
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      { headers: { "User-Agent": "FarmGreen" } }
    );
    const data = await res.json();
    if (data.address?.city) return data.address.city;
    if (data.address?.town) return data.address.town;
    if (data.address?.county) return data.address.county;
    if (data.address?.province) return data.address.province;
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  } catch {
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }
}

export const getWeather = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => WeatherInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${data.latitude}&longitude=${data.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,rain&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`
      );

      if (!res.ok) throw new Error("Không thể lấy dữ liệu thời tiết");

      const json = await res.json();
      const current = json.current;

      const location = await reverseGeocode(data.latitude, data.longitude);
      const weatherCode = current.weather_code;

      return {
        temperature: Math.round(current.temperature_2m),
        humidity: current.relative_humidity_2m,
        weatherCode: weatherCode,
        windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
        rainfall: current.rain || 0,
        location,
        description: getWeatherDescription(weatherCode),
        emoji: getWeatherEmoji(weatherCode),
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Lỗi lấy dữ liệu thời tiết"
      );
    }
  });
