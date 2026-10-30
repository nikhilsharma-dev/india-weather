import { owm, fail, num, inIndia, ApiError } from './_lib.js';

const cur = (c) => ({
  name: c.name || null, country: c.sys?.country ?? null, dt: num(c.dt),
  temp: num(c.main?.temp), feels: num(c.main?.feels_like), tmin: num(c.main?.temp_min), tmax: num(c.main?.temp_max),
  humidity: num(c.main?.humidity), pressure: num(c.main?.pressure), visibility: num(c.visibility), clouds: num(c.clouds?.all),
  wind: num(c.wind?.speed), windDeg: num(c.wind?.deg), gust: num(c.wind?.gust),
  desc: c.weather?.[0]?.description ?? null, icon: c.weather?.[0]?.icon ?? null,
  sunrise: num(c.sys?.sunrise), sunset: num(c.sys?.sunset), rain1h: num(c.rain?.['1h']),
});
const hour = (h) => ({
  dt: num(h.dt), temp: num(h.main?.temp), tmin: num(h.main?.temp_min), tmax: num(h.main?.temp_max),
  pop: h.pop == null ? null : Math.round(h.pop * 100), rain: num(h.rain?.['3h']), wind: num(h.wind?.speed),
  icon: h.weather?.[0]?.icon ?? null, desc: h.weather?.[0]?.description ?? null,
});

export default async function handler(req, res) {
  try {
    const lat = num(req.query.lat), lon = num(req.query.lon);
    if (!inIndia(lat, lon)) throw new ApiError(400, 'BAD_REQUEST', 'lat and lon must be valid coordinates inside India.');
    const p = { lat: lat.toFixed(4), lon: lon.toFixed(4), units: 'metric' };
    const [c, f] = await Promise.all([
      owm('api.openweathermap.org', '/data/2.5/weather', p, 10 * 60e3),
      owm('api.openweathermap.org', '/data/2.5/forecast', p, 30 * 60e3),
    ]);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
    res.status(200).json({
      source: 'OpenWeather (current weather + 5-day / 3-hour forecast)',
      fetchedAt: new Date().toISOString(),
      tz: num(f.city?.timezone) ?? num(c.timezone) ?? 19800,
      current: cur(c),
      hourly: (f.list || []).map(hour),
    });
  } catch (e) { fail(res, e); }
}
