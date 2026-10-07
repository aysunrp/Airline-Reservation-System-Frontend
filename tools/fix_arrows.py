# -*- coding: utf-8 -*-
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

for path in ROOT.glob("*.html"):
    text = path.read_text(encoding="utf-8")
    orig = text
    text = text.replace('aria-hidden="true">?</span>', 'aria-hidden="true">→</span>')
    # Book Now button may have literal ?
    text = text.replace("Book Now ?", "Book Now →")
    text = text.replace(">Book Now ?<", ">Book Now →<")
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print("fixed", path.name)

# index why-card links
index = ROOT / "index.html"
t = index.read_text(encoding="utf-8")
pairs = [
    (
        "Book a Flight <span class=\"why-aerova-card-arrow\" aria-hidden=\"true\">→</span>",
        "<span data-i18n=\"destinations.bookFlight\">Book a Flight</span> <span class=\"why-aerova-card-arrow\" aria-hidden=\"true\">→</span>",
    ),
    (
        "Choose Your Seat <span class=\"why-aerova-card-arrow\" aria-hidden=\"true\">→</span>",
        "<span data-i18n=\"ui.chooseYourPreferredSeatBeforeYouTravel\">Choose Your Seat</span> <span class=\"why-aerova-card-arrow\" aria-hidden=\"true\">→</span>",
    ),
    (
        "My Trips <span class=\"why-aerova-card-arrow\" aria-hidden=\"true\">→</span>",
        "<span data-i18n=\"nav.myTrips\">My Trips</span> <span class=\"why-aerova-card-arrow\" aria-hidden=\"true\">→</span>",
    ),
    (
        "Check Status <span class=\"why-aerova-card-arrow\" aria-hidden=\"true\">→</span>",
        "<span data-i18n=\"ui.flightStatus\">Check Status</span> <span class=\"why-aerova-card-arrow\" aria-hidden=\"true\">→</span>",
    ),
]
for a, b in pairs:
    if a in t and "data-i18n" not in a:
        t = t.replace(a, b)
index.write_text(t, encoding="utf-8")
print("index links ok")
