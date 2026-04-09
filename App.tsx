import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudMoonRain,
  CloudRain,
  CloudSnow,
  CloudSun,
  CloudSunRain,
  Moon,
  Sun,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './App.css'

type GeoResult = {
  name: string
  state?: string
  country: string
  lat: number
  lon: number
}

type CurrentWeatherResponse = {
  weather: Array<{ main: string; description: string; icon: string }>
  main: { temp: number; feels_like: number; humidity: number }
  wind: { speed: number }
  dt: number
}

type ForecastResponse = {
  city: { timezone: number }
  list: Array<{
    dt: number
    main: { temp: number; feels_like: number; humidity: number }
    pop?: number
    wind: { speed: number }
    weather: Array<{ icon: string; description: string }>
  }>
}

const countryCode = 'US'
const weatherCacheKey = 'weather-pwa:last-success'
const weatherIconByCode: Record<string, LucideIcon> = {
  '01d': Sun,
  '01n': Moon,
  '02d': CloudSun,
  '02n': CloudMoon,
  '03d': Cloud,
  '03n': Cloud,
  '04d': Cloud,
  '04n': Cloud,
  '09d': CloudRain,
  '09n': CloudRain,
  '10d': CloudSunRain,
  '10n': CloudMoonRain,
  '11d': CloudLightning,
  '11n': CloudLightning,
  '13d': CloudSnow,
  '13n': CloudSnow,
  '50d': CloudFog,
  '50n': CloudFog,
}

type CachedWeatherSnapshot = {
  savedAt: number
  selected: GeoResult
  current: CurrentWeatherResponse
  forecast: ForecastResponse
}

const usStateNameToCode: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
}

function toStateAbbreviation(value: string): string {
  const cleaned = value
    .replace(/[^a-z\s]/gi, '')
    .trim()
    .replace(/\s+/g, ' ')

  if (!cleaned) {
    return ''
  }

  const stateFromName = usStateNameToCode[cleaned.toLowerCase()]
  if (stateFromName) {
    return stateFromName
  }

  return cleaned.replace(/\s/g, '').slice(0, 2).toUpperCase()
}

function WeatherIcon({
  iconCode,
  description,
  size,
}: {
  iconCode: string
  description: string
  size: number
}): ReactElement {
  const IconComponent = weatherIconByCode[iconCode] ?? CloudDrizzle
  return <IconComponent className="weather-icon" size={size} strokeWidth={1.8} aria-label={description} />
}

function formatForecastDateTime(timestamp: number, timezoneOffsetSeconds: number): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    hour12: true,
    timeZone: 'UTC',
  }).format(new Date((timestamp + timezoneOffsetSeconds) * 1000))
}

function formatCurrentObservationTime(timestamp: number, timezoneOffsetSeconds: number): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(new Date((timestamp + timezoneOffsetSeconds) * 1000))
}

function App() {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined
  const hasApiKey = Boolean(apiKey?.trim())
  const [city, setCity] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [matches, setMatches] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<GeoResult | null>(null)
  const [current, setCurrent] = useState<CurrentWeatherResponse | null>(null)
  const [forecast, setForecast] = useState<ForecastResponse | null>(null)

  useEffect(() => {
    restoreCachedWeather()
  }, [])

  function persistSnapshot(snapshot: CachedWeatherSnapshot): void {
    try {
      localStorage.setItem(weatherCacheKey, JSON.stringify(snapshot))
    } catch {
      // Ignore storage failures; live weather still renders in memory.
    }
  }

  function restoreCachedWeather(): boolean {
    try {
      const raw = localStorage.getItem(weatherCacheKey)
      if (!raw) {
        return false
      }

      const parsed = JSON.parse(raw) as CachedWeatherSnapshot
      if (!parsed?.selected || !parsed?.current || !parsed?.forecast) {
        return false
      }

      setSelected(parsed.selected)
      setCurrent(parsed.current)
      setForecast(parsed.forecast)
      return true
    } catch {
      return false
    }
  }

  const dailyForecast = useMemo(() => {
    if (!forecast) {
      return []
    }

    const timezoneOffsetSeconds = forecast.city?.timezone ?? 0
    const byDay = new Map<
      string,
      {
        item: ForecastResponse['list'][number]
        hourDistanceFromNoon: number
      }
    >()

    for (const item of forecast.list) {
      const localDate = new Date((item.dt + timezoneOffsetSeconds) * 1000)
      const dayKey = `${localDate.getUTCFullYear()}-${localDate.getUTCMonth()}-${localDate.getUTCDate()}`
      const localHour = localDate.getUTCHours()
      const hourDistanceFromNoon = Math.abs(localHour - 12)
      const existing = byDay.get(dayKey)

      if (!existing || hourDistanceFromNoon < existing.hourDistanceFromNoon) {
        byDay.set(dayKey, { item, hourDistanceFromNoon })
      }
    }

    return Array.from(byDay.values())
      .map((entry) => entry.item)
      .sort((a, b) => a.dt - b.dt)
      .slice(0, 5)
  }, [forecast])

  const next36HoursForecast = useMemo(() => {
    if (!forecast) {
      return []
    }

    return forecast.list.slice(0, 12)
  }, [forecast])

  async function fetchWeatherForLocation(location: GeoResult): Promise<void> {
    if (!hasApiKey) {
      setError('Missing API key. Add VITE_OPENWEATHER_API_KEY in .env.local.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=imperial`
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=imperial`

      const [currentRes, forecastRes] = await Promise.all([
        fetch(currentUrl),
        fetch(forecastUrl),
      ])

      if (!currentRes.ok || !forecastRes.ok) {
        throw new Error('Weather request failed. Check your API key and plan limits.')
      }

      const currentData = (await currentRes.json()) as CurrentWeatherResponse
      const forecastData = (await forecastRes.json()) as ForecastResponse

      setSelected(location)
      setCurrent(currentData)
      setForecast(forecastData)

      persistSnapshot({
        savedAt: Date.now(),
        selected: location,
        current: currentData,
        forecast: forecastData,
      })
    } catch {
      if (restoreCachedWeather()) {
        setError('Network unavailable. Showing your last saved weather data.')
      } else {
        setError('Could not load weather data right now.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!hasApiKey) {
      setError('Missing API key. Add VITE_OPENWEATHER_API_KEY in .env.local.')
      return
    }

    if (!city.trim()) {
      setError('Enter a city name.')
      return
    }

    setLoading(true)
    setError('')
    setMatches([])

    try {
      const q = [city.trim(), stateCode.trim().toUpperCase(), countryCode]
        .filter(Boolean)
        .join(',')
      const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${apiKey}`
      const response = await fetch(geocodeUrl)

      if (!response.ok) {
        throw new Error('Geocoding request failed.')
      }

      const data = (await response.json()) as GeoResult[]
      if (!data.length) {
        setError('No US location found. Try city + 2-letter state code.')
        return
      }

      setMatches(data)
      if (data.length === 1) {
        await fetchWeatherForLocation(data[0])
      }
    } catch {
      setError('Could not find that location.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <header>
        <p className="eyebrow">Weather PWA</p>
        <h1>US Forecast by City + State</h1>
        <p className="subtitle">
          Search any US city, resolve it to latitude/longitude, and fetch current
          weather plus a 5-day forecast.
        </p>
      </header>

      {!hasApiKey ? (
        <section className="key-warning" role="status" aria-live="polite">
          <h2>API key required</h2>
          <p>
            Create a project-root <strong>.env.local</strong> file with this line,
            then restart the dev server:
          </p>
          <pre>VITE_OPENWEATHER_API_KEY=your_openweather_api_key</pre>
        </section>
      ) : null}

      <form className="search" onSubmit={handleSearch}>
        <label>
          City
          <input
            value={city}
            onChange={(event) => setCity(toTitleCase(event.target.value))}
            placeholder="Austin"
            autoComplete="address-level2"
            disabled={!hasApiKey}
          />
        </label>

        <label>
          State code
          <input
            value={stateCode}
            onChange={(event) => setStateCode(toStateAbbreviation(event.target.value))}
            placeholder="TX"
            maxLength={2}
            autoComplete="address-level1"
            disabled={!hasApiKey}
          />
          <span className="field-hint">Type TX or full name like Texas.</span>
        </label>

        <button type="submit" disabled={!hasApiKey || loading}>
          {loading ? 'Searching...' : 'Get weather'}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {matches.length > 1 ? (
        <section className="match-list">
          <h2>Choose a location</h2>
          <div>
            {matches.map((item) => {
              const key = `${item.name}-${item.state}-${item.lat}-${item.lon}`
              return (
                <button
                  className="match"
                  key={key}
                  onClick={() => fetchWeatherForLocation(item)}
                  type="button"
                >
                  {item.name}, {item.state ?? 'N/A'} ({item.country})
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {selected && current ? (
        <section className="current-card">
          <h2>
            {selected.name}, {selected.state ?? 'N/A'}
          </h2>
          <p className="meta">
            Lat {selected.lat.toFixed(3)} | Lon {selected.lon.toFixed(3)}
          </p>
          <p className="meta">
            Observed {formatCurrentObservationTime(current.dt, forecast?.city.timezone ?? 0)}
          </p>
          <div className="current-grid">
            <div>
              <WeatherIcon
                iconCode={current.weather[0].icon}
                description={current.weather[0].description}
                size={80}
              />
            </div>
            <div>
              <p className="temp">{Math.round(current.main.temp)}°F</p>
              <p className="desc">{current.weather[0].description}</p>
              <p>
                Feels like {Math.round(current.main.feels_like)}°F | Humidity{' '}
                {current.main.humidity}% | Wind {Math.round(current.wind.speed)} mph
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {next36HoursForecast.length ? (
        <section>
          <h2>Next 36 Hours</h2>
          <div className="hourly-strip" aria-label="36 hour forecast">
            {next36HoursForecast.map((item) => (
              <article className="hourly-card" key={item.dt}>
                <p className="hourly-time">
                  {formatForecastDateTime(item.dt, forecast?.city.timezone ?? 0)}
                </p>
                <WeatherIcon
                  iconCode={item.weather[0].icon}
                  description={item.weather[0].description}
                  size={42}
                />
                <p className="hourly-temp">{Math.round(item.main.temp)}°F</p>
                <p className="desc">{item.weather[0].description}</p>
                <div className="hourly-details">
                  <p>Feels like {Math.round(item.main.feels_like)}°F</p>
                  <p>Humidity {item.main.humidity}%</p>
                  <p>Wind {Math.round(item.wind.speed)} mph</p>
                  <p>Precip {Math.round((item.pop ?? 0) * 100)}%</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {dailyForecast.length ? (
        <section>
          <h2>5-Day Forecast</h2>
          <div className="forecast-grid">
            {dailyForecast.map((item) => (
              <article className="forecast-card" key={item.dt}>
                <p>{new Date(item.dt * 1000).toLocaleDateString()}</p>
                <WeatherIcon
                  iconCode={item.weather[0].icon}
                  description={item.weather[0].description}
                  size={64}
                />
                <p>{Math.round(item.main.temp)}°F</p>
                <p className="desc">{item.weather[0].description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <footer>
        {!hasApiKey ? (
          <p>Add VITE_OPENWEATHER_API_KEY in .env.local to start using the app.</p>
        ) : (
          <p>Powered by OpenWeather geocoding + weather APIs.</p>
        )}
      </footer>
    </main>
  )
}

export default App
