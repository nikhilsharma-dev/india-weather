const BASE: string = (import.meta as any).env?.VITE_API_BASE ?? '';
export interface Loc { name: string; lat: number; lon: number }
export interface Place { name: string; state: string | null; lat: number; lon: number }
type N = number | null;
export interface Hour { dt: number; temp: N; tmin: N; tmax: N; pop: N; rain: N; wind: N; icon: string | null; desc: string | null }
export interface Current {
  name: string | null; dt: N; temp: N; feels: N; tmin: N; tmax: N; humidity: N; pressure: N; visibility: N; clouds: N;
  wind: N; windDeg: N; gust: N; desc: string | null; icon: string | null; sunrise: N; sunset: N; rain1h: N;
}
export interface Weather { source: string; fetchedAt: string; tz: number; current: Current; hourly: Hour[] }

async function get<T>(path: string): Promise<T> {
  let r: Response;
  try { r = await fetch(BASE + path); } catch { throw new Error('Network error. Check your internet connection.'); }
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.error?.message ?? `Request failed (${r.status}).`);
  return j as T;
}
export const getWeather = (l: Loc) => get<Weather>(`/api/weather?lat=${l.lat}&lon=${l.lon}`);
export const searchPlaces = (q: string) => get<Place[]>(`/api/geocode?q=${encodeURIComponent(q)}`);
export const reverse = (lat: number, lon: number) => get<Place[]>(`/api/geocode?lat=${lat}&lon=${lon}`);
export const tileUrl = (layer: string) => `${BASE}/api/tile?layer=${layer}&z={z}&x={x}&y={y}`;
