import { getKey, fail, ApiError } from './_lib.js';
// Proxies OpenWeather weather-map tiles so the API key never reaches the browser.
const LAYERS = new Set(['temp_new', 'precipitation_new', 'clouds_new', 'wind_new', 'pressure_new']);

export default async function handler(req, res) {
  try {
    const { layer } = req.query;
    const z = Number(req.query.z), x = Number(req.query.x), y = Number(req.query.y);
    if (!LAYERS.has(layer) || ![z, x, y].every(Number.isInteger) || z < 0 || z > 10 || x < 0 || y < 0)
      throw new ApiError(400, 'BAD_REQUEST', 'Invalid tile request.');
    let r;
    try {
      r = await fetch(`https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${getKey()}`);
    } catch {
      throw new ApiError(502, 'UPSTREAM', 'Weather map tile could not be loaded.');
    }
    if (!r.ok) throw new ApiError(r.status === 401 ? 403 : 502, 'TILE_UNAVAILABLE', 'Weather layer is not available for this API key.');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, s-maxage=600, max-age=300');
    res.status(200).send(Buffer.from(await r.arrayBuffer()));
  } catch (e) { fail(res, e); }
}
