/**
 * src/jarvis/tools/weatherTool.ts
 *
 * Live weather forecasts powered by the Open-Meteo API.
 * Free, open-access, zero API keys required.
 */

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  locationName: string;
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

export async function fetchWeather(cityQuery?: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    let lat = 28.6139; // Default: New Delhi
    let lon = 77.2090;
    let cityName = 'New Delhi';

    if (cityQuery && cityQuery.trim().length > 0) {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        cityQuery.trim()
      )}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl, { signal: controller.signal });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
          cityName = geoData.results[0].name;
        }
      }
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;
    const wRes = await fetch(weatherUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!wRes.ok) {
      return `I could not retrieve weather data at this moment.`;
    }

    const wData = await wRes.json();
    const current = wData.current;
    const temp = Math.round(current.temperature_2m);
    const code = current.weather_code;
    const condition = WEATHER_CODES[code] || 'Fair';
    const humidity = current.relative_humidity_2m;
    const wind = Math.round(current.wind_speed_10m);

    return `In ${cityName}, it is currently ${temp}°C with ${condition.toLowerCase()}, humidity at ${humidity}%, and wind at ${wind} km/h.`;
  } catch (err: any) {
    clearTimeout(timer);
    return `Unable to fetch live weather information right now.`;
  }
}
