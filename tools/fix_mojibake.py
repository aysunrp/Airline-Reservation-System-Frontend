# -*- coding: utf-8 -*-
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
index = ROOT / "index.html"
t = index.read_text(encoding="utf-8")

# Fix Türkiye location
t = re.sub(
    r'(<p class="destination-location">)[^<]*rkiye(</p>)',
    r"\1Türkiye\2",
    t,
    count=1,
)

# Fix Listening… status
t = re.sub(
    r'(id="voice-search-status"[^>]*>)[^<]*(</p>)',
    r'\1Listening…\2',
    t,
    count=1,
)

# Fix arrows
for cls in ("hero-cta-arrow", "why-aerova-card-arrow", "premium-experience-link-arrow"):
    t = re.sub(rf'(class="{cls}"[^>]*>).(?=</span>)', r"\1→", t)
t = re.sub(r'(aria-hidden="true">)\?(</span>)', r"\1→\2", t)

index.write_text(t, encoding="utf-8")

# Scan other HTML for similar mojibake of Türkiye / Listening
for path in ROOT.glob("*.html"):
    text = path.read_text(encoding="utf-8")
    orig = text
    text = re.sub(
        r"(>[^<]*)Ã[^<]*rkiye",
        ">Türkiye",
        text,
    )
    text = re.sub(
        r'(data-i18n="ui.listening">)[^<]+',
        r"\1Listening…",
        text,
    )
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print("cleaned", path.name)

print("done")
