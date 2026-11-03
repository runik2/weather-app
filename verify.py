"""Проверка приложения погоды без браузера: геокодинг + прогноз через тот же API."""
import json
import urllib.request
import urllib.parse

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "weather-check/1.0"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.load(r)

# 1. как в приложении: поиск города по названию
city = "Казань"
g = get("https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode(
    {"name": city, "count": 1, "language": "ru", "format": "json"}))
if not g.get("results"):
    raise SystemExit("город не найден")
place = g["results"][0]
print(f"геокодинг: {place['name']}, {place.get('country')} -> {place['latitude']}, {place['longitude']}")

# 2. тот же запрос, что строит app.js
url = (
    "https://api.open-meteo.com/v1/forecast?"
    + urllib.parse.urlencode({
        "latitude": place["latitude"],
        "longitude": place["longitude"],
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
        "hourly": "temperature_2m,weather_code",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min",
        "timezone": "auto",
        "forecast_days": 5,
    })
)
d = get(url)
c = d["current"]
print(f"сейчас: {c['temperature_2m']}°C, код {c['weather_code']}, день={c['is_day']}, "
      f"ветер {c['wind_speed_10m']} м/с, влажность {c['relative_humidity_2m']}%, "
      f"ощущается {c['apparent_temperature']}°")
print(f"часов в прогнозе: {len(d['hourly']['time'])}, дней: {len(d['daily']['time'])}")
print("прогноз по дням:")
for i, t in enumerate(d["daily"]["time"]):
    print(f"  {t}: {round(d['daily']['temperature_2m_min'][i])}° / {round(d['daily']['temperature_2m_max'][i])}°, код {d['daily']['weather_code'][i]}")
print("OK — данные, на которых работает приложение, получены")
