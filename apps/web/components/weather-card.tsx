"use client";

import {
  AlertCircle,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  MapPin,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";

type CurrentWeather = {
  temperature: number;
  apparent_temperature: number;
  weather_code: number;
  is_day: boolean;
  humidity: number;
  wind_speed: number;
};

type HourlyForecast = {
  time: string;
  temperature: number;
  weather_code: number;
  precipitation_probability: number;
};

type DailyForecast = {
  date: string;
  temperature_max: number;
  temperature_min: number;
  weather_code: number;
  precipitation_probability: number;
};

type WeatherData = {
  latitude: number;
  longitude: number;
  timezone: string;
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  fetched_at: string;
};

function renderWeatherIcon(
  code: number,
  className: string,
  strokeWidth: number = 2,
) {
  if (code === 0 || code === 1)
    return <Sun className={className} strokeWidth={strokeWidth} />;
  if (code === 2 || code === 3)
    return <Cloud className={className} strokeWidth={strokeWidth} />;
  if (code === 45 || code === 48)
    return <CloudFog className={className} strokeWidth={strokeWidth} />;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
    return <CloudRain className={className} strokeWidth={strokeWidth} />;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return <CloudSnow className={className} strokeWidth={strokeWidth} />;
  if (code >= 95)
    return <CloudLightning className={className} strokeWidth={strokeWidth} />;
  return <Cloud className={className} strokeWidth={strokeWidth} />;
}

function getWeatherLabel(code: number): string {
  if (code === 0) return "Ciel dégagé";
  if (code === 1) return "Principalement dégagé";
  if (code === 2) return "Partiellement nuageux";
  if (code === 3) return "Couvert";
  if (code === 45 || code === 48) return "Brouillard";
  if (code >= 51 && code <= 57) return "Bruine";
  if (code >= 61 && code <= 67) return "Pluie";
  if (code >= 71 && code <= 77) return "Neige";
  if (code >= 80 && code <= 82) return "Averses";
  if (code === 85 || code === 86) return "Averses de neige";
  if (code >= 95) return "Orage";
  return "—";
}

function formatHour(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}h`;
}

function formatDayShort(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Auj.";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Demain";
  return d.toLocaleDateString("fr-FR", { weekday: "short" });
}

type GeoStatus = "loading" | "granted" | "denied" | "unsupported";

const PARIS_COORDS = { lat: 48.8566, lon: 2.3522 };

export function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather(lat: number, lon: number) {
      try {
        const res = await fetch(
          `http://localhost:8000/api/weather?lat=${lat}&lon=${lon}`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (!res.ok) {
          setError("Backend météo indisponible");
          return;
        }
        const data = (await res.json()) as WeatherData;
        if (!cancelled) setWeather(data);
      } catch {
        if (!cancelled) setError("Impossible de contacter le backend");
      }
    }

    (async () => {
      await Promise.resolve();
      if (cancelled) return;

      if (!navigator.geolocation) {
        setGeoStatus("unsupported");
        setUsingFallback(true);
        await fetchWeather(PARIS_COORDS.lat, PARIS_COORDS.lon);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          setGeoStatus("granted");
          fetchWeather(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          if (cancelled) return;
          setGeoStatus("denied");
          setUsingFallback(true);
          fetchWeather(PARIS_COORDS.lat, PARIS_COORDS.lon);
        },
        { timeout: 5000, maximumAge: 10 * 60 * 1000 },
      );
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (geoStatus === "loading" && !weather && !error) {
    return (
      <div className="py-8 text-center">
        <Cloud
          className="h-10 w-10 text-slate-600 mx-auto mb-3 animate-pulse"
          strokeWidth={1.5}
        />
        <p className="text-sm text-slate-500">Chargement de la météo…</p>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="py-8 text-center">
        <AlertCircle
          className="h-10 w-10 text-slate-600 mx-auto mb-3"
          strokeWidth={1.5}
        />
        <p className="text-sm text-slate-400 mb-1">Météo indisponible</p>
        <p className="text-xs text-slate-500">{error ?? "Erreur inconnue"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/15">
          {renderWeatherIcon(
            weather.current.weather_code,
            "h-6 w-6 text-blue-400",
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-3xl font-semibold text-slate-100 tabular-nums">
              {Math.round(weather.current.temperature)}
            </span>
            <span className="text-sm text-slate-500 font-mono">°C</span>
          </div>
          <p className="text-xs text-slate-400">
            {getWeatherLabel(weather.current.weather_code)}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            Ressenti {Math.round(weather.current.apparent_temperature)}°C
          </p>
        </div>
      </div>

      {weather.hourly.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
            Aujourd&apos;hui
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {weather.hourly.slice(0, 8).map((h) => (
              <div
                key={h.time}
                className="flex flex-col items-center gap-1 min-w-[2.5rem] shrink-0"
                title={`${getWeatherLabel(h.weather_code)} · Pluie ${h.precipitation_probability}%`}
              >
                <span className="text-xs text-slate-500 font-mono">
                  {formatHour(h.time)}
                </span>
                {renderWeatherIcon(h.weather_code, "h-4 w-4 text-slate-400")}
                <span className="text-xs font-mono text-slate-300">
                  {Math.round(h.temperature)}°
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
          Prochains jours
        </h3>
        <div className="space-y-1.5">
          {weather.daily.map((d) => (
            <div
              key={d.date}
              className="flex items-center justify-between text-sm"
              title={`${getWeatherLabel(d.weather_code)} · Pluie ${d.precipitation_probability}%`}
            >
              <span className="text-slate-400 w-14 shrink-0">
                {formatDayShort(d.date)}
              </span>
              {renderWeatherIcon(
                d.weather_code,
                "h-4 w-4 text-slate-400 shrink-0",
              )}
              <div className="flex-1 mx-3">
                {d.precipitation_probability > 0 && (
                  <span className="text-xs text-blue-400 font-mono">
                    {d.precipitation_probability}%
                  </span>
                )}
              </div>
              <div className="flex gap-2 font-mono text-xs shrink-0">
                <span className="text-slate-500">
                  {Math.round(d.temperature_min)}°
                </span>
                <span className="text-slate-200">
                  {Math.round(d.temperature_max)}°
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {usingFallback && (
        <div className="pt-2 border-t border-slate-800">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="h-3 w-3" strokeWidth={2} />
            Paris (géoloc refusée)
          </p>
        </div>
      )}
    </div>
  );
}
