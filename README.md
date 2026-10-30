# India Weather

Independent weather dashboard for India (React + Vite + TypeScript frontend, Vercel serverless functions as the backend that holds your OpenWeather key).

> India Weather is an independent weather information platform and is not affiliated with or operated by the India Meteorological Department.

## What it does (and its limits)
- Current weather, 3-hour forecast and a 5-day summary from OpenWeather's **free** endpoints (`/data/2.5/weather`, `/data/2.5/forecast`, Geocoding). The 7-day forecast needs OpenWeather One Call 3.0 (separate subscription, card required), so this project does not use it and never invents the missing days.
- Weather-map overlays (precipitation, clouds, temperature, wind) via OpenWeather Maps 1.0 tiles, proxied through `/api/tile` so the key stays on the server.
- Satellite: NASA GIBS MODIS Terra true-colour, **daily** images, last 8 days, play/pause/slider. Not live, not IMD.
- Alerts: no official IMD feed is connected; the page says so and links to https://mausam.imd.gov.in/.
- Auto-refresh every 10 min (only when the tab is visible), manual refresh, stale-data warning after 30 min, old data kept and labelled when a refresh fails.

## Status of each feature (honest)
No `npm install`, build or live API call could be run while this was written (no network in the build sandbox). Only the backend handler was run against a *mocked* OpenWeather (valid request, out-of-India rejection, missing key).

| Feature | Status |
|---|---|
| Backend: weather / geocode / tile functions | Implemented, mock-tested only |
| Missing-key error, input validation, caching, timeouts | Implemented, mock-tested only (missing key, invalid coordinates) |
| Invalid key / quota (429) handling | Implemented, not tested |
| Home, forecast, charts, rainfall, search, dark mode | Implemented, not built or run yet |
| Auto and manual refresh, stale warning | Implemented, not tested |
| Use my location | Implemented, not tested (needs HTTPS or localhost) |
| Weather map layers | Implemented, not tested; depends on your key's plan |
| Satellite (NASA GIBS) | Implemented, not tested; layer/URL not verified live |
| Official IMD alerts | Not connected (message shown) |
| PWA / offline install | Not implemented |
| Tailwind | Not used (plain CSS) |

## Setup
1. Install Node.js 20+ from https://nodejs.org and unzip this project.
2. In the project folder: `npm install`
3. Copy `.env.example` to `.env` and replace `YOUR_API_KEY_HERE` with your OpenWeather key. Never commit `.env`.
4. Run locally: `npx vercel dev` (free Vercel account; answer the prompts, "link to existing project": No). Open http://localhost:3000. (`npm run dev` alone starts only the frontend, with no backend.)
5. Test the connection: open http://localhost:3000/api/weather?lat=28.61&lon=77.21 (JSON expected). Missing key gives `NO_KEY`; wrong key gives `BAD_KEY` (new keys can take a couple of hours to activate).
6. Check the build: `npm run build` and `npm run typecheck`.

## GitHub (no secrets)
`git init`, `git add .`, `git commit -m "India Weather"`, create an empty repo on github.com, then `git remote add origin <url>`, `git push -u origin main`. `.gitignore` already excludes `.env`.

## Deploy (frontend and backend together, free Hobby tier)
1. vercel.com → Add New Project → import the GitHub repo (framework: Vite).
2. Settings → Environment Variables → add `OPENWEATHER_API_KEY` → redeploy.
3. Open the site; check `/api/weather?lat=28.61&lon=77.21`, search, map, and geolocation (HTTPS works on Vercel).

GitHub Pages cannot run the `api/` functions. If you use Pages for the frontend, deploy this repo to Vercel for the backend and set `VITE_API_BASE=https://your-project.vercel.app` when building the frontend.

## Troubleshooting
- "No OPENWEATHER_API_KEY configured": `.env` missing or Vercel variable not set / not redeployed.
- Map overlay warning: layer not in your plan or key not yet active.
- Blank satellite: NASA GIBS temporarily unavailable or the layer URL changed; see https://nasa-gibs.github.io/gibs-api-docs/.
- Rate limit: free OpenWeather plans are limited per minute and per day; server caching reduces calls.

Credits: OpenWeather, OpenStreetMap contributors, NASA GIBS / EOSDIS.
