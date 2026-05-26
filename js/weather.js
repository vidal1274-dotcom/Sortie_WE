/* =========================================================
   MÉTÉO AUTOMATIQUE — Open-Meteo (gratuit, sans API key)
   ========================================================= */
const WMO_EMOJI = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'❄️', 73:'🌨️', 75:'🌨️', 77:'🌨️',
  80:'🌦️', 81:'🌧️', 82:'🌧️',
  85:'🌨️', 86:'🌨️',
  95:'⛈️', 96:'⛈️', 99:'⛈️'
};

export async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto&forecast_days=1`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const resp = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = await resp.json();
    const c = data.current;
    return {
      temp: Math.round(c.temperature_2m),
      wind: Math.round(c.wind_speed_10m),
      emoji: WMO_EMOJI[c.weather_code] || '🌡️',
      code: c.weather_code
    };
  } catch(e) {
    return null;
  }
}
