
const WMO = {
  0:["Ясно","☀️","day"], 1:["Малооблачно","🌤","day"], 2:["Переменная облачность","⛅","cloud"],
  3:["Пасмурно","☁️","cloud"], 45:["Туман","🌫","cloud"], 48:["Изморозь","🌫","cloud"],
  51:["Лёгкая морось","🌦","rain"], 53:["Морось","🌦","rain"], 55:["Сильная морось","🌧","rain"],
  61:["Небольшой дождь","🌦","rain"], 63:["Дождь","🌧","rain"], 65:["Сильный дождь","🌧","rain"],
  66:["Ледяной дождь","🌧","rain"], 67:["Ледяной дождь","🌧","rain"],
  71:["Небольшой снег","🌨","snow"], 73:["Снег","🌨","snow"], 75:["Сильный снег","❄️","snow"],
  77:["Снежная крупа","🌨","snow"],
  80:["Ливень","🌦","rain"], 81:["Ливень","🌧","rain"], 82:["Силный ливень","⛈","rain"],
  85:["Снегопад","🌨","snow"], 86:["Сильный снегопад","❄️","snow"],
  95:["Гроза","⛈","rain"], 96:["Гроза с градом","⛈","rain"], 99:["Гроза с градом","⛈","rain"]
};
const DAYS = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];

const $ = id => document.getElementById(id);
let controller = null;

function mood(code, isDay) {
  const w = WMO[code] || ["—","🌡","cloud"];
  return { text: w[0], icon: w[1], theme: isDay ? (w[2] === "day" ? "day" : w[2]) : "night" };
}

async function geocode(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=ru&format=json`;
  const r = await fetch(url);
  const d = await r.json();
  if (!d.results || !d.results.length) throw new Error("Город не найден");
  const g = d.results[0];
  return { lat: g.latitude, lon: g.longitude, name: g.name, country: g.country };
}

async function load(place) {
  $("status").textContent = "обновляю…";
  $("status").classList.remove("err");
  if (controller) controller.abort();
  controller = new AbortController();

  try {
    const g = place || await geocode($("city").value.trim() || "Казань");
    $("cityName").textContent = g.country ? `${g.name}, ${g.country}` : g.name;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}`
      + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,pressure_msl`
      + `&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min`
      + `&timezone=auto&forecast_days=5`;
    const r = await fetch(url, { signal: controller.signal });
    const d = await r.json();

    const c = d.current;
    const m = mood(c.weather_code, c.is_day === 1);
    document.body.className = m.theme;

    $("icon").textContent = m.icon;
    $("temp").textContent = Math.round(c.temperature_2m) + "°";
    $("desc").textContent = m.text;
    $("wind").textContent = Math.round(c.wind_speed_10m) + " м/с";
    $("hum").textContent = c.relative_humidity_2m + "%";
    $("feels").textContent = `Ощущается как ${Math.round(c.apparent_temperature)}°`;
    $("press").textContent = Math.round(c.pressure_msl * 0.75006) + " мм";

    // ближайшие 8 часов
    const nowIdx = d.hourly.time.findIndex(t => t.slice(0,13) === d.current.time.slice(0,13));
    const start = nowIdx < 0 ? 0 : nowIdx;
    $("hours").innerHTML = d.hourly.time.slice(start, start + 8).map((t, i) => {
      const code = d.hourly.weather_code[start + i];
      const mm = mood(code, d.current.is_day === 1);
      return `<div class="hour">
        <div class="h">${new Date(t).getHours()}:00</div>
        <div class="i">${mm.icon}</div>
        <div class="t">${Math.round(d.hourly.temperature_2m[start + i])}°</div>
      </div>`;
    }).join("");

    $("days").innerHTML = d.daily.time.map((t, i) => {
      const mm = mood(d.daily.weather_code[i], true);
      const label = i === 0 ? "Сегодня" : DAYS[new Date(t).getDay()];
      return `<div class="day-row">
        <div class="name">${label}</div>
        <div class="i">${mm.icon}</div>
        <div class="r">${Math.round(d.daily.temperature_2m_min[i])}° / ${Math.round(d.daily.temperature_2m_max[i])}°</div>
      </div>`;
    }).join("");

    $("status").textContent = "обновлено " + new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    localStorage.setItem("lastCity", g.name);
  } catch (e) {
    if (e.name === "AbortError") return;
    $("status").textContent = e.message || "Не удалось загрузить погоду";
    $("status").classList.add("err");
  }
}

$("go").addEventListener("click", () => load());
$("city").addEventListener("keydown", e => { if (e.key === "Enter") load(); });

const saved = localStorage.getItem("lastCity");
if (saved) $("city").value = saved;
load();
