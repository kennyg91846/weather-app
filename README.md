# US Weather PWA (City/State -> Lat/Lon)

Progressive Web App that uses OpenWeather Geocoding + Weather APIs.

Users search by city and state code (US), the app resolves latitude/longitude,
and then fetches current weather plus 5-day forecast.

## Requirements

- Node.js 20+
- OpenWeather API key (free plan works)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root:

```env
VITE_OPENWEATHER_API_KEY=your_openweather_api_key
```

3. Start dev server:

```bash
npm run dev
```

## Build for hosting

```bash
npm run build
```

Build output is created in `dist/`.

## Manual GitHub-hosted workflow (no git CLI required)

1. Keep `.env.local` only on your machine (never upload it).
2. Run `npm run build`.
3. Upload only the `dist/` output files to your hosting target.
4. If another person wants their own deployment, they repeat setup with their own
   `.env.local` and OpenWeather key.

## Testing the PWA update banner

When a new version of the app is deployed, installed users will see an
**"Update available / Refresh"** banner on their next visit.

To test the full update flow locally:

1. Build and preview the current version:
   ```bash
   npm run build && npm run preview
   ```
2. Open the preview URL in Chrome/Edge, then install the PWA (or just let the
   service worker register in the background). Confirm the app loads with the
   `weather-pwa-v5` cache in DevTools → Application → Cache Storage.
3. Make any visible change to the app (e.g., edit `src/App.tsx`), rebuild
   (`npm run build`), and restart the preview server.
4. Return to the open tab. The browser will detect the new service worker as
   "waiting" and show the **"Update available"** banner.
5. Click **Refresh** — the banner posts `{ type: 'SKIP_WAITING' }` to the
   waiting worker, which calls `skipWaiting()`. The page reloads automatically
   and the new version is active.

On GitHub Pages the same flow applies: deploy a new build, then visit the site.
The banner appears automatically without any manual action from the user.

## Weather icons

The app uses free `lucide-react` weather icons mapped from OpenWeather icon codes.
No external icon CDN requests are required.

## Notes

- Free tier limits shown in your screenshot are compatible with this project.
- For production at larger scale, move API calls behind a backend proxy to avoid
  exposing keys in browser builds.
