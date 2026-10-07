# -*- coding: utf-8 -*-
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "assets" / "js"

FILES = [
    "seat-selection.js",
    "profile.js",
    "extra-services.js",
    "notifications.js",
]

pat = re.compile(
    r'(if \(document\.readyState === "loading"\) \{\s*'
    r'document\.addEventListener\("DOMContentLoaded", (\w+)\);\s*)'
    r'window\.addEventListener\("aerova:languagechange", function \(\) \{\s*(.*?)\s*\}\);\s*'
    r'(\} else \{\s*\2\(\);\s*\})',
    re.S,
)

for name in FILES:
    path = JS / name
    text = path.read_text(encoding="utf-8")
    m = pat.search(text)
    if not m:
        print("no match", name)
        continue
    init_name = m.group(2)
    body = m.group(3).strip()
    replacement = (
        f'if (document.readyState === "loading") {{\n'
        f'        document.addEventListener("DOMContentLoaded", {init_name});\n'
        f'    }} else {{\n'
        f'        {init_name}();\n'
        f'    }}\n'
        f'    window.addEventListener("aerova:languagechange", function () {{\n'
        f'        {body}\n'
        f'    }});'
    )
    text2 = pat.sub(replacement, text, count=1)
    path.write_text(text2, encoding="utf-8")
    print("fixed", name)

# Fix index.html corrupted CTA text
index = ROOT / "index.html"
t = index.read_text(encoding="utf-8")
t = t.replace(
    '<label class="visually-hidden" for="voice-search-input">Flight search sentence</label>',
    '<label class="visually-hidden" for="voice-search-input" data-i18n="home.searchTitle">Where would you like to fly?</label>',
)
t = t.replace(
    '>Search Flights ?</button>',
    ' data-i18n="home.searchFlights">Search Flights</button>',
)
t = t.replace(
    '>Explore ?</a>',
    ' data-i18n="destinations.explore">Explore</a>',
)
t = t.replace(
    '>Subscribe ?</button>',
    ' data-i18n="home.newsletterButton">Subscribe</button>',
)
index.write_text(t, encoding="utf-8")
print("index fixed")

# Ensure home.searchFlights exists
import json

LOC = ROOT / "assets" / "js" / "locales"


def load(lang):
    text = (LOC / f"{lang}.js").read_text(encoding="utf-8")
    m = re.search(r"window\.AEROVA_LOCALES\.\w+\s*=\s*(\{[\s\S]*\});\s*$", text)
    ns = {}
    exec("d = " + m.group(1), ns)
    return ns["d"]


def dump(lang, obj):
    body = json.dumps(obj, ensure_ascii=False, indent=2)
    (LOC / f"{lang}.js").write_text(
        f"window.AEROVA_LOCALES = window.AEROVA_LOCALES || {{}};\nwindow.AEROVA_LOCALES.{lang} = {body};\n",
        encoding="utf-8",
    )


en, az, ru = load("en"), load("az"), load("ru")
en.setdefault("home", {})["searchFlights"] = "Search Flights"
az.setdefault("home", {})["searchFlights"] = "Uçuş axtar"
ru.setdefault("home", {})["searchFlights"] = "Найти рейсы"
# Non-stop suffix for flight details static sample
en.setdefault("common", {})["nonstop"] = en.get("common", {}).get("nonstop") or "Non-stop"
dump("en", en)
dump("az", az)
dump("ru", ru)
print("locale keys ok")
