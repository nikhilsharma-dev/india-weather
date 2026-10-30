import { useCallback, useEffect, useRef, useState } from 'react';
import { getWeather, reverse, searchPlaces, type Loc, type Place, type Weather } from './api';
import { Daily, ForecastCharts, Hero, Highlights, Hourly, Rainfall } from './Views';
import { Satellite, WeatherMap } from './Maps';
import { fmt } from './util';

const TABS = ['Home', 'Forecast', 'Weather Map', 'Rainfall', 'Weather Alerts', 'About'] as const;
type Tab = (typeof TABS)[number];
const DISCLAIMER = 'India Weather is an independent weather information platform and is not affiliated with or operated by the India Meteorological Department.';
const REFRESH_MS = 10 * 60e3, STALE_MS = 30 * 60e3;

function Logo() {
  return (<svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#13315c" /><circle cx="24" cy="24" r="9" fill="#ffc857" /><path d="M20 46a9 9 0 0 1 1-18 12 12 0 0 1 23 3 7.5 7.5 0 0 1-1 15z" fill="#90e0ef" /></svg>);
}

function Search({ onPick }: { onPick: (l: Loc) => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Place[]>([]);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); setMsg(''); return; }
    const id = setTimeout(async () => {
      try { const r = await searchPlaces(q.trim()); setRes(r); setMsg(r.length ? '' : 'No matching Indian location found. Try a nearby city or town name.'); }
      catch (e) { setRes([]); setMsg((e as Error).message); }
    }, 350);
    return () => clearTimeout(id);
  }, [q]);
  return (
    <div className="search">
      <label htmlFor="q" className="sr">Search city, town or district</label>
      <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search city, town or district" autoComplete="off" />
      {(res.length > 0 || msg) && (
        <ul className="sugg">
          {res.map((p) => (<li key={`${p.lat},${p.lon}`}><button onClick={() => { onPick({ name: `${p.name}${p.state ? ', ' + p.state : ''}`, lat: p.lat, lon: p.lon }); setQ(''); setRes([]); }}>{p.name}{p.state ? `, ${p.state}` : ''} <span className="muted">({p.lat.toFixed(2)}, {p.lon.toFixed(2)})</span></button></li>))}
          {msg && <li className="muted pad" role="alert">{msg}</li>}
        </ul>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('Home');
  const [loc, setLoc] = useState<Loc>({ name: 'New Delhi, Delhi', lat: 28.6139, lon: 77.209 });
  const [w, setW] = useState<Weather | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [old, setOld] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('theme') ? localStorage.getItem('theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; } });
  const inflight = useRef(false);
  const last = useRef(0);

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* storage unavailable */ } }, [dark]);

  const load = useCallback(async (l: Loc) => {
    if (inflight.current) return;
    inflight.current = true; setBusy(true);
    try { const d = await getWeather(l); setW(d); setErr(''); setOld(false); last.current = Date.now(); }
    catch (e) { setErr((e as Error).message); setOld(true); }
    finally { inflight.current = false; setBusy(false); }
  }, []);

  useEffect(() => {
    setW(null); setOld(false); last.current = 0; inflight.current = false;
    load(loc);
    const id = setInterval(() => { if (!document.hidden) load(loc); }, REFRESH_MS);
    const vis = () => { if (!document.hidden && Date.now() - last.current > REFRESH_MS) load(loc); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [loc, load]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60e3); return () => clearInterval(id); }, []);

  const locate = () => {
    if (!navigator.geolocation) { setErr('This browser does not support location. Use the search box instead.'); return; }
    navigator.geolocation.getCurrentPosition(async (p) => {
      const { latitude: lat, longitude: lon } = p.coords;
      let name = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      try { const g = (await reverse(lat, lon))[0]; if (g) name = `${g.name}${g.state ? ', ' + g.state : ''}`; } catch { /* keep coordinates as name */ }
      setLoc({ name, lat, lon }); // used only for this session; never stored
    }, () => setErr('Location permission was denied or unavailable. Use the search box instead. (Location needs HTTPS, except on localhost.)'), { timeout: 10000 });
  };

  const stale = w ? now - Date.parse(w.fetchedAt) > STALE_MS : false;
  const go = (t: Tab) => { setTab(t); setMenu(false); window.scrollTo(0, 0); };
  const weatherTab = tab === 'Home' || tab === 'Forecast' || tab === 'Rainfall';

  return (
    <>
      <header className="top">
        <div className="bar">
          <button className="brand" onClick={() => go('Home')}><Logo /><span>India Weather</span></button>
          <button className="ico menu" aria-expanded={menu} aria-label="Menu" onClick={() => setMenu(!menu)}>☰</button>
          <nav className={menu ? 'open' : ''} aria-label="Main">
            {TABS.map((t) => (<button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => go(t)}>{t}</button>))}
          </nav>
          <Search onPick={setLoc} />
          <button className="ico" onClick={locate} aria-label="Use my location" title="Use my location">◎</button>
          <button className="ico" onClick={() => setDark(!dark)} aria-label="Toggle dark mode">{dark ? '☀' : '☾'}</button>
        </div>
      </header>

      <main>
        {weatherTab && (
          <div className="status" role="status">
            <strong>{loc.name}</strong>
            {w && <span className="muted"> · Last updated {fmt(Math.floor(Date.parse(w.fetchedAt) / 1000), 19800, { timeStyle: 'short' })} IST</span>}
            <button onClick={() => load(loc)} disabled={busy}>{busy ? 'Refreshing…' : 'Refresh'}</button>
          </div>
        )}
        {err && <p className="warn" role="alert">{err}{old && w ? ' Showing older data from the last successful update.' : ''}</p>}
        {w && stale && <p className="warn" role="alert">This data is more than 30 minutes old.</p>}
        {!w && !err && weatherTab && <div className="card skel" aria-busy="true">Loading weather…</div>}

        {tab === 'Home' && w && (<><Hero w={w} /><Highlights w={w} /><Hourly w={w} /></>)}
        {tab === 'Forecast' && w && (<><Daily w={w} /><ForecastCharts w={w} /></>)}
        {tab === 'Rainfall' && w && <Rainfall w={w} />}
        {tab === 'Weather Map' && (<><WeatherMap loc={loc} onPick={setLoc} /><Satellite /></>)}
        {tab === 'Weather Alerts' && (
          <section className="card"><h2>Weather alerts</h2>
            <p>Official IMD alerts are not currently connected. Please consult the official IMD website for authoritative warnings.</p>
            <p><a href="https://mausam.imd.gov.in/" target="_blank" rel="noopener noreferrer">https://mausam.imd.gov.in/</a></p>
            <p className="muted">Ordinary weather conditions shown elsewhere on this site are never presented as official warnings.</p>
          </section>
        )}
        {tab === 'About' && (
          <section className="card"><h2>About India Weather</h2>
            <p>{DISCLAIMER}</p>
            <p>Weather data comes from OpenWeather. Forecasts are model-based and are not identical to IMD forecasts. Refreshing the page re-fetches the provider's latest data; it does not make the underlying forecast update any faster. Maps © OpenStreetMap contributors; satellite imagery from NASA GIBS.</p>
          </section>
        )}
      </main>
      <footer><p>{DISCLAIMER}</p></footer>
    </>
  );
}
