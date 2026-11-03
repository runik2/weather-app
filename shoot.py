"""Скриншоты приложения погоды через Playwright (Chromium)."""
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(r"C:/Users/xamma/AppData/Local/hermes/cache/scratch/weather-app/shots")
OUT.mkdir(parents=True, exist_ok=True)

URL = "https://runik2.github.io/weather-app/"

CITIES = [("Казань", "kazan"), ("Москва", "moscow")]

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--disable-gpu"])
    page = browser.new_page(viewport={"width": 430, "height": 900}, device_scale_factor=2)
    errors = []
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    time.sleep(1)

    for city, slug in CITIES:
        page.fill("#city", city)
        page.click("#go")
        try:
            page.wait_for_function(
                "document.getElementById('temp').textContent.includes('°') "
                "&& !document.getElementById('temp').textContent.startsWith('—')",
                timeout=25000,
            )
        except Exception as exc:
            print(f"[{city}] не дождались данных: {exc}")
            print("status:", page.inner_text("#status"))
        time.sleep(0.8)
        path = OUT / f"{slug}.png"
        page.screenshot(path=str(path))
        print(f"[{city}] temp={page.inner_text('#temp')} desc={page.inner_text('#desc')} "
              f"theme={page.eval_on_selector('body', 'e => e.className')} -> {path}")

    browser.close()

if errors:
    print("ОШИБКИ КОНСОЛИ:")
    for e in errors[:10]:
        print("  ", e)
else:
    print("ошибок консоли нет")
