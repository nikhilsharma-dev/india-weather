const cache = new Map();
export const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

export function getKey() {
  const k = process.env.OPENWEATHER_API_KEY;
  if (!k || k === 'YOUR_API_KEY_HERE') throw new ApiError(500, 'NO_KEY', 'The server has no OPENWEATHER_API_KEY configured. See the README, step 3.');
  return k;
}

export async function owm(host, path, params, ttlMs) {
  const key = getKey();
  const ck = host + path + JSON.stringify(params);
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.t < ttlMs) return hit.d;
  const url = `https://${host}${path}?${new URLSearchParams({ ...params, appid: key })}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  let r;
  try { r = await fetch(url, { signal: ctl.signal }); }
  catch { throw new ApiError(504, 'TIMEOUT', 'The weather provider did not respond in time.'); }
  finally { clearTimeout(timer); }
  if (r.status === 401) throw new ApiError(502, 'BAD_KEY', 'OpenWeather rejected the API key. New keys can take a couple of hours to activate.');
  if (r.status === 429) throw new ApiError(429, 'QUOTA', 'OpenWeather request limit reached. Please try again later.');
  if (!r.ok) throw new ApiError(502, 'UPSTREAM', `OpenWeather returned an error (${r.status}).`);
  const d = await r.json();
  cache.set(ck, { t: Date.now(), d });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return d;
}

export function fail(res, e) {
  const status = e.status || 500;
  if (!e.status) console.error('Unexpected error:', e.message); // never log the key
  res.status(status).json({ error: { code: e.code || 'ERROR', message: e.status ? e.message : 'Unexpected server error.' } });
}

export const inIndia = (lat, lon) => lat !== null && lon !== null && lat >= 5 && lat <= 38 && lon >= 67 && lon <= 98;
