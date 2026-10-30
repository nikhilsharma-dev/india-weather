import { owm, fail, num, inIndia, ApiError } from './_lib.js';

const place = (g) => ({ name: g.name, state: g.state ?? null, lat: g.lat, lon: g.lon });

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 's-maxage=3600');
    if (req.query.q !== undefined) {
      const q = String(req.query.q).trim();
      if (q.length < 2 || q.length > 80) throw new ApiError(400, 'BAD_REQUEST', 'Search text must be 2–80 characters.');
      const r = await owm('api.openweathermap.org', '/geo/1.0/direct', { q: `${q},IN`, limit: '5' }, 3600e3);
      return res.status(200).json(r.filter((g) => g.country === 'IN').map(place));
    }
    const lat = num(req.query.lat), lon = num(req.query.lon);
    if (!inIndia(lat, lon)) throw new ApiError(400, 'BAD_REQUEST', 'Provide q=<text> or valid lat/lon inside India.');
    const r = await owm('api.openweathermap.org', '/geo/1.0/reverse', { lat: lat.toFixed(3), lon: lon.toFixed(3), limit: '1' }, 3600e3);
    res.status(200).json(r.map(place));
  } catch (e) { fail(res, e); }
}
