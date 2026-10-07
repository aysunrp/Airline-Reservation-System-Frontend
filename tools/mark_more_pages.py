# -*- coding: utf-8 -*-
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

PAGE_MARKS = {
    "destinations.html": [
        (r'(class="page-hero-title")(?![^>]*data-i18n)([^>]*>)Destinations(</h1>)',
         r'\1 data-i18n="destinations.heroTitle"\2Destinations\3'),
        (r'(class="page-cta"[^>]*href="booking\.html")(?![^>]*data-i18n)([^>]*>)Book a Flight(</a>)',
         r'\1 data-i18n="destinations.bookFlight"\2Book a Flight\3'),
        (r'(class="section-title")(?![^>]*data-i18n)([^>]*>)Explore the Collection(</h2>)',
         r'\1 data-i18n="destinations.catalogTitle"\2Explore the Collection\3'),
    ],
    "experience.html": [
        (r'(class="page-hero-title")(?![^>]*data-i18n)([^>]*>)The AEROVA Experience(</h1>)',
         r'\1 data-i18n="experience.heroTitle"\2The AEROVA Experience\3'),
        (r'(class="page-cta"[^>]*href="booking\.html")(?![^>]*data-i18n)([^>]*>)Book Your Journey(</a>)',
         r'\1 data-i18n="experience.bookJourney"\2Book Your Journey\3'),
        (r'(class="experience-feature-title")(?![^>]*data-i18n)([^>]*>)Economy Experience(</h3>)',
         r'\1 data-i18n="experience.economyTitle"\2Economy Experience\3'),
        (r'(class="experience-feature-title")(?![^>]*data-i18n)([^>]*>)Comfort Experience(</h3>)',
         r'\1 data-i18n="experience.comfortTitle"\2Comfort Experience\3'),
        (r'(class="experience-feature-title")(?![^>]*data-i18n)([^>]*>)Business Class Experience(</h3>)',
         r'\1 data-i18n="experience.businessTitle"\2Business Class Experience\3'),
    ],
    "about.html": [
        (r'(class="page-hero-title")(?![^>]*data-i18n)([^>]*>)About AEROVA(</h1>)',
         r'\1 data-i18n="about.heroTitle"\2About AEROVA\3'),
        (r'(class="section-title")(?![^>]*data-i18n)([^>]*>)Our Story(</h2>)',
         r'\1 data-i18n="about.storyTitle"\2Our Story\3'),
    ],
    "my-trips.html": [
        (r'(class="[^"]*title[^"]*")(?![^>]*data-i18n)([^>]*>)My Trips(</h1>)',
         r'\1 data-i18n="trips.title"\2My Trips\3'),
    ],
    "manage-booking.html": [
        (r'(>)Manage Booking(</h1>)', r' data-i18n="manage.title">Manage Booking</h1>'),
    ],
    "payment.html": [
        (r'(>)Payment(</h1>)', r' data-i18n="payment.title">Payment</h1>'),
    ],
    "confirmation.html": [
        (r'(>)Booking Confirmed(</h1>)', r' data-i18n="confirmation.title">Booking Confirmed</h1>'),
    ],
    "seat-selection.html": [
        (r'(>)Select Your Seats(</h1>)', r' data-i18n="seats.title">Select Your Seats</h1>'),
    ],
    "passenger-details.html": [
        (r'(>)Passenger Details(</h1>)', r' data-i18n="passengers.title">Passenger Details</h1>'),
    ],
    "baggage-selection.html": [
        (r'(>)Baggage Selection(</h1>)', r' data-i18n="baggage.title">Baggage Selection</h1>'),
    ],
    "meal-selection.html": [
        (r'(>)Meal Selection(</h1>)', r' data-i18n="meals.title">Meal Selection</h1>'),
    ],
    "extra-services.html": [
        (r'(>)Extra Services(</h1>)', r' data-i18n="extras.title">Extra Services</h1>'),
    ],
    "notifications.html": [
        (r'(>)Notifications(</h1>)', r' data-i18n="notifications.title">Notifications</h1>'),
    ],
    "profile.html": [
        (r'(>)My Profile(</h1>)', r' data-i18n="profile.title">My Profile</h1>'),
    ],
    "booking-details.html": [
        (r'(>)Booking Details(</h1>)', r' data-i18n="bookingDetails.title">Booking Details</h1>'),
    ],
}

for name, marks in PAGE_MARKS.items():
    path = ROOT / name
    if not path.exists():
        print("missing", name)
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    orig = text
    for pat, repl in marks:
        text = re.sub(pat, repl, text, count=1)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print("marked", name)
    else:
        print("no mark", name)
