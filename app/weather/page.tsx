'use client';
import { useEffect, useState } from 'react';
import { Cloud, Droplets, Wind, Thermometer, AlertTriangle, MapPin } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';

interface WeatherDay { dt: number; main: { temp: number; temp_min: number; temp_max: number; humidity: number }; weather: { icon: string; description: string }[]; wind: { speed: number }; pop?: number; }
interface CurrentWeather { main: { temp: number; humidity: number; feels_like: number }; weather: { icon: string; description: string; main: string }[]; wind: { speed: number }; name: string; rain?: { '1h': number }; }

const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;

function WeatherIcon({ code, size = 40 }: { code: string; size?: number }) {
  return <img src={`https://openweathermap.org/img/wn/${code}@2x.png`} alt="" width={size} height={size} />;
}

export default function WeatherPage() {
  const { t } = useLanguage();
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState({ lat: 26.8467, lon: 80.9462 }); // Default: Lucknow, UP

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {} // use default
      );
    }
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const [curRes, foreRes] = await Promise.all([
          fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${API_KEY}&units=metric`),
          fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${API_KEY}&units=metric&cnt=40`),
        ]);
        const curData = await curRes.json();
        const foreData = await foreRes.json();
        if (curData.cod !== 200 && curData.cod !== '200') throw new Error(curData.message || 'Error');
        setCurrent(curData);
        // Get daily: pick one entry per day (midday)
        const daily: Record<string, WeatherDay> = {};
        (foreData.list || []).forEach((item: WeatherDay) => {
          const day = new Date(item.dt * 1000).toLocaleDateString();
          if (!daily[day]) daily[day] = item;
        });
        setForecast(Object.values(daily).slice(0, 7));
        setLoading(false);
      } catch (e: unknown) {
        setError(t.weather.error);
        setLoading(false);
      }
    };
    fetchWeather();
  }, [location]);

  const isRainy = (desc: string) => desc.toLowerCase().includes('rain') || desc.toLowerCase().includes('drizzle');
  const isHot = current && current.main.temp > 38;
  const isCold = current && current.main.temp < 10;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.weather.title}</h1>
          {current && (
            <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <MapPin size={11} /> {current.name}
            </p>
          )}
        </div>
        <LanguageToggle />
      </div>

      <div className="page-content">
        {loading ? (
          <div className="space-y-4">
            <div className="h-48 rounded-2xl shimmer" />
            <div className="h-24 rounded-2xl shimmer" />
          </div>
        ) : error ? (
          <div className="card text-center py-12">
            <Cloud size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{error}</p>
          </div>
        ) : current && (
          <>
            {/* Alerts */}
            {isRainy(current.weather[0].description) && (
              <div className="card mb-4 flex items-center gap-3 animate-fade-in" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                <AlertTriangle size={20} style={{ color: '#2563eb' }} />
                <p className="text-sm font-semibold" style={{ color: '#1d4ed8' }}>Rain expected — avoid spray today!</p>
              </div>
            )}
            {isHot && (
              <div className="card mb-4 flex items-center gap-3" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                <AlertTriangle size={20} style={{ color: '#d97706' }} />
                <p className="text-sm font-semibold" style={{ color: '#92400e' }}>High temperature — irrigate fields today!</p>
              </div>
            )}

            {/* Current weather */}
            <div className="card-highlight text-white mb-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-200 mb-1">{t.weather.current}</p>
                  <p className="text-6xl font-bold">{Math.round(current.main.temp)}°</p>
                  <p className="text-green-100 capitalize text-sm mt-1">{current.weather[0].description}</p>
                  <p className="text-green-200 text-xs mt-1">Feels like {Math.round(current.main.feels_like)}°</p>
                </div>
                <WeatherIcon code={current.weather[0].icon} size={80} />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                <div className="flex flex-col items-center gap-1">
                  <Droplets size={16} className="text-blue-200" />
                  <p className="text-xs text-green-200">{t.weather.humidity}</p>
                  <p className="font-bold">{current.main.humidity}%</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Wind size={16} className="text-blue-200" />
                  <p className="text-xs text-green-200">{t.weather.wind}</p>
                  <p className="font-bold">{current.wind.speed} m/s</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Thermometer size={16} className="text-red-200" />
                  <p className="text-xs text-green-200">{t.weather.temperature}</p>
                  <p className="font-bold">{Math.round(current.main.temp)}°C</p>
                </div>
              </div>
            </div>

            {/* 7-day forecast */}
            <div className="card animate-fade-in">
              <p className="section-title text-sm">{t.weather.forecast}</p>
              <div className="space-y-2">
                {forecast.map((day, i) => {
                  const date = new Date(day.dt * 1000);
                  const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                  return (
                    <div key={day.dt} className="flex items-center justify-between py-2" style={{ borderBottom: i < forecast.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                      <p className="text-sm font-medium w-24" style={{ color: 'var(--text-secondary)' }}>{dayName}</p>
                      <div className="flex items-center gap-1">
                        <WeatherIcon code={day.weather[0].icon} size={32} />
                        <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{day.weather[0].description}</p>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span className="font-bold" style={{ color: '#dc2626' }}>{Math.round(day.main.temp_max)}°</span>
                        <span style={{ color: 'var(--text-muted)' }}>{Math.round(day.main.temp_min)}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
