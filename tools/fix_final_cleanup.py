# -*- coding: utf-8 -*-
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
index = ROOT / "index.html"
t = index.read_text(encoding="utf-8")

# Fix aria-label to use data-i18n-aria
t = t.replace(
    'aria-label="Easy Booking. Book a Flight"',
    'data-i18n-aria="ui.easyBooking" aria-label="Easy Booking"',
)

# Force all arrow spans to &rarr;
t = re.sub(
    r'(class="[^"]*arrow[^"]*"[^>]*>)[\s\S]*?(</span>)',
    r"\1&rarr;\2",
    t,
)

index.write_text(t, encoding="utf-8")

# Global: any remaining mojibake arrows in html
for path in ROOT.glob("*.html"):
    text = path.read_text(encoding="utf-8")
    orig = text
    text = re.sub(
        r'(class="[^"]*arrow[^"]*"[^>]*>)[\s\S]*?(</span>)',
        r"\1&rarr;\2",
        text,
    )
    # strip long mojibake sequences that look like Ãƒ
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print("arrows", path.name)

print("done")
