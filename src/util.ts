import type { Hour } from './api';
export const fmt = (dt: number | null, tz: number, o: Intl.DateTimeFormatOptions) =>
  dt == null ? 'Data unavailable' : new Date((dt + tz) * 1000).toLocaleString('en-IN', { ...o, timeZone: 'UTC' });
export const compass = (d: number | null) =>
  d == null ? '' : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8];
export const show = (n: number | null | undefined, unit = '', digits = 0) =>
  n == null ? 'Data unavailable' : `${n.toFixed(digits)}${unit}`;
export const iconUrl = (c: string | null) => (c ? `https://openweathermap.org/img/wn/${c}@2x.png` : '');

// Builds day summaries ONLY from the real 3-hourly slots the API returned.
export function daily(h: Hour[], tz: number) {
  const m = new Map<string, Hour[]>();
  for (const x of h) {
    const k = new Date((x.dt + tz) * 1000).toISOString().slice(0, 10);
    m.set(k, [...(m.get(k) ?? []), x]);
  }
  const hrs = (x: Hour) => new Date((x.dt + tz) * 1000).getUTCHours();
  return [...m].map(([date, xs]) => {
    const t = xs.flatMap((x) => [x.tmin, x.tmax]).filter((v): v is number => v !== null);
    const p = xs.map((x) => x.pop).filter((v): v is number => v !== null);
    const r = xs.map((x) => x.rain).filter((v): v is number => v !== null);
    const mid = xs.reduce((a, b) => (Math.abs(hrs(b) - 12) < Math.abs(hrs(a) - 12) ? b : a));
    return {
      date, dt: xs[0].dt, slots: xs.length, icon: mid.icon, desc: mid.desc,
      min: t.length ? Math.min(...t) : null, max: t.length ? Math.max(...t) : null,
      pop: p.length ? Math.max(...p) : null, rain: r.length ? r.reduce((a, b) => a + b, 0) : null,
    };
  });
}
