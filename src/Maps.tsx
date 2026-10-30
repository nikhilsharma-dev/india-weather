import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reverse, tileUrl, type Loc } from './api';

const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const INDIA: L.LatLngTuple = [22.5, 79];

function useLeaflet(zoom: number) {
  const el = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { minZoom: 3, maxBounds: [[-5, 55], [45, 110]] }).setView(INDIA, zoom);
    L.tileLayer(OSM, { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(m);
    setMap(m);
    return () => { m.remove(); };
  }, [zoom]);
  return { el, map };
}

const LAYERS: [string, string][] = [['precipitation_new', 'Precipitation'], ['clouds_new', 'Cloud cover'], ['temp_new', 'Temperature'], ['wind_new', 'Wind']];

export function WeatherMap({ loc, onPick }: { loc: Loc; onPick: (l: Loc) => void }) {
  const { el, map } = useLeaflet(5);
  const [layer, setLayer] = useState(LAYERS[0][0]);
  const [warn, setWarn] = useState('');
  const pick = useRef(onPick); pick.current = onPick;

  useEffect(() => {
    if (!map) return;
    const h = async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      try { const p = (await reverse(lat, lng))[0]; pick.current({ name: p ? `${p.name}${p.state ? ', ' + p.state : ''}` : `${lat.toFixed(2)}, ${lng.toFixed(2)}`, lat, lon: lng }); }
      catch { pick.current({ name: `${lat.toFixed(2)}, ${lng.toFixed(2)}`, lat, lon: lng }); }
    };
    map.on('click', h);
    return () => { map.off('click', h); };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    setWarn('');
    let fails = 0;
    const t = L.tileLayer(tileUrl(layer), { opacity: 0.7, maxZoom: 10, attribution: 'Weather layer © OpenWeather' }).addTo(map);
    t.on('tileerror', () => { if (++fails >= 3) setWarn('This weather layer could not be loaded. It may not be included in your OpenWeather plan, or the server is not configured.'); });
    return () => { t.remove(); };
  }, [map, layer]);

  useEffect(() => {
    if (!map) return;
    const m = L.circleMarker([loc.lat, loc.lon], { radius: 8, color: '#0b2545', fillColor: '#00b4d8', fillOpacity: 1 }).addTo(map).bindTooltip(loc.name);
    return () => { m.remove(); };
  }, [map, loc]);

  return (
    <section className="card" aria-label="Weather map">
      <h2>Weather map</h2>
      <div className="seg" role="group" aria-label="Weather layer">
        {LAYERS.map(([id, label]) => (<button key={id} aria-pressed={layer === id} onClick={() => setLayer(id)}>{label}</button>))}
      </div>
      {warn && <p role="alert" className="warn">{warn}</p>}
      <div ref={el} className="map" />
      <p className="muted">Base map: OpenStreetMap. Coloured overlay: OpenWeather forecast-model layer (not satellite imagery, not IMD). Tap the map to load weather for that point.</p>
    </section>
  );
}

// ---- Satellite: NASA GIBS, MODIS Terra true-colour daily composites ----
const day = (offset: number) => new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10);
const DATES = Array.from({ length: 8 }, (_, i) => day(8 - i)); // oldest to yesterday (UTC)
const gibs = (d: string) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;

export function Satellite() {
  const { el, map } = useLeaflet(5);
  const [i, setI] = useState(DATES.length - 1);
  const [play, setPlay] = useState(false);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const layer = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!map) return;
    const t = L.tileLayer(gibs(DATES[i]), { maxNativeZoom: 9, maxZoom: 12, attribution: 'Imagery: NASA GIBS / EOSDIS (MODIS Terra)' }).addTo(map);
    let fails = 0;
    t.on('loading', () => setBusy(true)).on('load', () => setBusy(false));
    t.on('tileerror', () => { if (++fails >= 4) setErr('Satellite imagery could not be loaded for this date. NASA GIBS may be unavailable.'); });
    layer.current = t;
    return () => { t.remove(); };
  }, [map]);

  useEffect(() => { setErr(''); layer.current?.setUrl(gibs(DATES[i])); }, [i]);
  useEffect(() => {
    if (!play) return;
    const id = setInterval(() => setI((x) => (x + 1) % DATES.length), 1500);
    return () => clearInterval(id);
  }, [play]);

  return (
    <section className="card" aria-label="Satellite imagery">
      <h2>Satellite imagery</h2>
      <p className="muted">Real NASA MODIS Terra daily true-colour images. These are once-a-day composites, not live imagery, and not from IMD.</p>
      <div className="row">
        <button onClick={() => setPlay(!play)}>{play ? 'Pause' : 'Play'}</button>
        <input type="range" min={0} max={DATES.length - 1} value={i} onChange={(e) => { setPlay(false); setI(+e.target.value); }} aria-label="Imagery date" />
        <strong>{DATES[i]} (UTC)</strong>
      </div>
      {busy && <p className="muted" role="status">Loading imagery…</p>}
      {err && <p role="alert" className="warn">{err}</p>}
      <div ref={el} className="map" />
    </section>
  );
}
