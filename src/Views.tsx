import { CartesianGrid, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Weather } from './api';
import { compass, daily, fmt, iconUrl, show } from './util';

export function Hero({ w }: { w: Weather }) {
  const c = w.current, tz = w.tz;
  return (
    <section className="card hero" aria-label="Current weather">
      <div>
        <h2>{c.name ?? 'Selected location'}</h2>
        <p className="temp">{show(c.temp, '°C')}</p>
        <p className="muted">Feels like {show(c.feels, '°C')} · Low {show(c.tmin, '°C')} / High {show(c.tmax, '°C')}</p>
      </div>
      <div className="cond">
        {c.icon && <img src={iconUrl(c.icon)} alt="" width={96} height={96} />}
        <p>{c.desc ?? 'Condition unavailable'}</p>
      </div>
      <p className="muted src">Source: {w.source}. Observation time {fmt(c.dt, tz, { dateStyle: 'medium', timeStyle: 'short' })} (local).</p>
    </section>
  );
}

export function Highlights({ w }: { w: Weather }) {
  const c = w.current, tz = w.tz;
  const items: [string, string][] = [
    ['Temperature', show(c.temp, '°C')],
    ['Humidity', show(c.humidity, '%')],
    ['Wind', c.wind == null ? 'Data unavailable' : `${(c.wind * 3.6).toFixed(0)} km/h ${compass(c.windDeg)}`],
    ['Pressure', show(c.pressure, ' hPa')],
    ['Visibility', c.visibility == null ? 'Data unavailable' : `${(c.visibility / 1000).toFixed(1)} km`],
    ['Cloud cover', show(c.clouds, '%')],
    ['Sunrise', fmt(c.sunrise, tz, { timeStyle: 'short' })],
    ['Sunset', fmt(c.sunset, tz, { timeStyle: 'short' })],
  ];
  return (
    <section aria-label="Weather highlights" className="grid">
      {items.map(([k, v]) => (<div className="card stat" key={k}><span className="muted">{k}</span><strong>{v}</strong></div>))}
    </section>
  );
}

export function Hourly({ w }: { w: Weather }) {
  return (
    <section className="card" aria-label="Forecast every 3 hours">
      <h2>Next hours, every 3 hours</h2>
      <p className="muted">OpenWeather's free forecast returns 3-hour steps, not hourly steps.</p>
      <div className="strip" tabIndex={0}>
        {w.hourly.slice(0, 16).map((h) => (
          <div className="slot" key={h.dt}>
            <span>{fmt(h.dt, w.tz, { weekday: 'short', hour: 'numeric' })}</span>
            {h.icon && <img src={iconUrl(h.icon)} alt={h.desc ?? ''} width={48} height={48} />}
            <strong>{show(h.temp, '°')}</strong>
            <span className="muted">Rain chance {show(h.pop, '%')}</span>
            <span className="muted">{h.rain == null ? '' : `${h.rain} mm`}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Daily({ w }: { w: Weather }) {
  const days = daily(w.hourly, w.tz);
  return (
    <section className="card" aria-label="Daily forecast">
      <h2>{days.length}-day forecast</h2>
      <p className="muted">OpenWeather's free forecast covers 5 days. Daily values are summarised from the real 3-hour steps; the first and last days may be partial.</p>
      <ul className="days">
        {days.map((d) => (
          <li key={d.date}>
            <span className="d">{fmt(d.dt, w.tz, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            {d.icon && <img src={iconUrl(d.icon)} alt="" width={40} height={40} />}
            <span className="c">{d.desc ?? 'Data unavailable'}{d.slots < 8 ? ' (partial day)' : ''}</span>
            <span>{show(d.min, '°')} / {show(d.max, '°')}</span>
            <span className="muted">Rain chance {show(d.pop, '%')}{d.rain != null ? ` · ${d.rain.toFixed(1)} mm` : ''}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <section className="card" aria-label={title}>
      <h2>{title}</h2>
      <div className="chart"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </section>
  );
}
const rows = (w: Weather) => w.hourly.map((h) => ({ t: fmt(h.dt, w.tz, { weekday: 'short', hour: 'numeric' }), temp: h.temp, pop: h.pop, rain: h.rain, wind: h.wind == null ? null : +(h.wind * 3.6).toFixed(1) }));
const axes = (<><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="t" minTickGap={40} fontSize={11} /><YAxis width={36} fontSize={11} /><Tooltip /></>);

export function ForecastCharts({ w }: { w: Weather }) {
  const d = rows(w);
  return (<>
    <Chart title="Temperature (°C)"><LineChart data={d}>{axes}<Line dataKey="temp" stroke="#00b4d8" strokeWidth={2} dot={false} connectNulls={false} /></LineChart></Chart>
    <Chart title="Wind speed (km/h)"><LineChart data={d}>{axes}<Line dataKey="wind" stroke="#4361ee" strokeWidth={2} dot={false} connectNulls={false} /></LineChart></Chart>
  </>);
}

export function Rainfall({ w }: { w: Weather }) {
  const d = rows(w), c = w.current;
  return (<>
    <section className="card">
      <h2>Rainfall</h2>
      <p>Last hour (reported by OpenWeather): <strong>{c.rain1h == null ? 'No value reported' : `${c.rain1h} mm`}</strong></p>
      <p className="muted">Charts below show <b>forecast</b> rainfall from OpenWeather, not observed rainfall and not an IMD prediction. Where the provider sends no value, the chart shows a gap; it is not treated as zero.</p>
    </section>
    <Chart title="Chance of precipitation (%)"><BarChart data={d}>{axes}<Bar dataKey="pop" fill="#00b4d8" /></BarChart></Chart>
    <Chart title="Forecast rainfall (mm per 3 hours)"><BarChart data={d}>{axes}<Bar dataKey="rain" fill="#13315c" /></BarChart></Chart>
  </>);
}
