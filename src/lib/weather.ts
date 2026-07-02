// Open-Meteo (무료·키 불필요). 경기 시간대 핀포인트 예보.
// 좌표는 우선 서울 기본값 — 추후 matches.place_lat/lng 저장 시 그걸 사용.

export type Weather = {
  temp: number;
  feels: number;
  precip: number;
  wind: number; // m/s
  hour: number;
};

export async function getMatchWeather(
  dateIso: string,
  time: string | null,
  lat = 37.5665,
  lon = 126.978,
): Promise<Weather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m` +
    `&wind_speed_unit=ms&timezone=Asia%2FSeoul&start_date=${dateIso}&end_date=${dateIso}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const hour = time ? parseInt(time.slice(0, 2), 10) : 21;
    const target = `${dateIso}T${String(hour).padStart(2, "0")}:00`;
    const idx: number = data.hourly?.time?.indexOf(target) ?? -1;
    if (idx < 0) return null;
    return {
      temp: Math.round(data.hourly.temperature_2m[idx]),
      feels: Math.round(data.hourly.apparent_temperature[idx]),
      precip: Math.round(data.hourly.precipitation_probability[idx]),
      wind: Math.round(data.hourly.wind_speed_10m[idx]),
      hour,
    };
  } catch {
    return null;
  }
}
