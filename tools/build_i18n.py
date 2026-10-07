# -*- coding: utf-8 -*-
"""Generate AEROVA i18n locale files and engine."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "assets" / "js"
LOC = JS / "locales"
LOC.mkdir(parents=True, exist_ok=True)

en = {
  "nav": {
    "booking": "Booking", "destinations": "Destinations", "experience": "Experience",
    "about": "About", "myTrips": "My Trips", "login": "Login", "logout": "Logout",
    "notifications": "Notifications", "profile": "Profile", "openMenu": "Open menu",
    "closeMenu": "Close menu", "search": "Search", "primary": "Primary", "homeAria": "AEROVA Home"
  },
  "footer": {
    "description": "Fly beyond expectations.", "quickLinks": "Quick Links", "home": "Home",
    "flights": "Flights", "destinations": "Destinations", "about": "About", "myTrips": "My Trips",
    "support": "Support", "help": "Help Center", "contact": "Contact Us",
    "travelInfo": "Travel Information", "faqs": "FAQs", "followUs": "Follow Us",
    "copyright": "© 2026 AEROVA. All rights reserved.", "privacy": "Privacy Policy",
    "terms": "Terms & Conditions", "manageBooking": "Manage Booking"
  },
  "common": {
    "continue": "Continue", "back": "Back", "next": "Next", "cancel": "Cancel", "save": "Save",
    "clear": "Clear", "close": "Close", "from": "From", "to": "To", "departure": "Departure",
    "return": "Return", "passengers": "Passengers", "passenger": "Passenger", "cabin": "Cabin Class",
    "economy": "Economy", "comfort": "Comfort", "business": "Business", "nonstop": "Non-stop",
    "oneStop": "1 Stop", "price": "Price", "duration": "Duration", "stops": "Stops", "date": "Date",
    "flight": "Flight", "status": "Status", "total": "Total", "details": "Details", "select": "Select",
    "selected": "Selected", "available": "Available", "unavailable": "Unavailable", "required": "Required",
    "optional": "Optional", "adult": "Adult", "child": "Child", "infant": "Infant", "yes": "Yes", "no": "No",
    "loading": "Loading…", "edit": "Edit", "remove": "Remove", "add": "Add", "apply": "Apply",
    "search": "Search", "confirm": "Confirm", "download": "Download", "view": "View", "none": "None",
    "noneSelected": "None selected", "perPassenger": "per passenger", "included": "Included",
    "free": "Free", "language": "Language"
  },
  "home": {
    "heroEyebrow": "Luxury Travel Experience", "heroTitle1": "Your Journey", "heroTitle2": "Starts Here",
    "heroDescription": "Discover new destinations, create unforgettable memories and fly beyond expectations.",
    "bookNow": "Book Now", "searchTitle": "Where Would You Like To Fly?",
    "searchPlaceholder": "Try: Baku to Dubai next Friday, 2 passengers, business",
    "searchButton": "Search Flights", "voiceHint": "Speak or type your trip in one sentence.",
    "destinationsEyebrow": "Featured Destinations", "destinationsTitle": "Where Will You Go Next?",
    "destinationsDesc": "Explore unforgettable destinations with AEROVA.", "explore": "Explore",
    "whyEyebrow": "Why AEROVA", "whyTitle": "Travel, Elevated",
    "whyDesc": "Every detail designed for calm, clarity, and comfort.",
    "whyComfortTitle": "Refined Comfort", "whyComfortText": "Thoughtfully designed cabins for every journey.",
    "whyDestTitle": "Signature Destinations",
    "whyDestText": "Curated routes connecting the world's most compelling cities.",
    "whyPremiumTitle": "Premium Experience",
    "whyPremiumText": "Discover a refined travel experience designed around you.",
    "premiumEyebrow": "The Aerova Experience", "premiumTitle": "Travel in a Class of Your Own",
    "premiumDesc": "From refined comfort to elevated service, discover the way you want to travel with AEROVA.",
    "economyTitle": "Economy Class",
    "economyDesc": "Thoughtful comfort, entertainment and everything you need for a smooth journey.",
    "exploreEconomy": "Explore Economy", "comfortTitle": "Comfort",
    "comfortDesc": "Extra space, thoughtful amenities and a more relaxed way to travel.",
    "discoverComfort": "Discover Comfort", "businessTitle": "Business Class",
    "businessDesc": "Enjoy spacious seating, refined dining and a more comfortable journey.",
    "exploreBusiness": "Explore Business", "newsletterEyebrow": "Stay Connected",
    "newsletterTitle": "Travel Inspiration, Delivered",
    "newsletterDesc": "Subscribe to receive AEROVA travel updates, destination inspiration and exclusive offers.",
    "newsletterLabel": "Email address", "newsletterPlaceholder": "Enter your email address",
    "newsletterButton": "Subscribe", "newsletterSuccess": "Thank you for subscribing.",
    "newsletterError": "Please enter a valid email address.",
    "heroAria": "Aircraft in flight above the clouds"
  },
  "booking": {
    "eyebrow": "Book Your Flight", "title": "Find Your AEROVA Flight",
    "subtitle": "Search, compare and book your perfect journey.",
    "roundTrip": "Round Trip", "oneWay": "One Way", "multiCity": "Multi City",
    "from": "From", "to": "To", "cityPlaceholder": "City or airport",
    "departureDate": "Departure Date", "returnDate": "Return Date", "passengers": "Passengers",
    "cabinClass": "Cabin Class", "searchFlights": "Search Flights", "tripType": "Trip type",
    "flightN": "Flight {n}", "remove": "Remove", "addFlight": "Add Flight",
    "adults": "Adults", "children": "Children", "infants": "Infants",
    "summaryTitle": "Your Search", "calendarTitle": "Select Dates",
    "selectDeparture": "Select departure date", "selectReturn": "Select return date",
    "modifySearch": "Modify search", "voiceFrom": "Voice input for departure",
    "voiceTo": "Voice input for destination", "swap": "Swap departure and destination",
    "pageAria": "Flight booking", "validationFrom": "Please enter a departure city.",
    "validationTo": "Please enter a destination.",
    "validationSame": "Departure and destination must be different.",
    "validationDepart": "Please select a departure date.",
    "validationReturn": "Please select a return date.",
    "validationReturnAfter": "Return date must be after departure.",
    "validationPassengers": "Please select at least one passenger."
  },
  "results": {
    "eyebrow": "Available Flights", "availableNext30": "Available flights in the next 30 days",
    "modifySearch": "← Modify search", "filtersSort": "Filters & Sort", "clearFilters": "Clear Filters",
    "sortBy": "Sort By", "recommended": "Recommended", "cheapest": "Cheapest", "fastest": "Fastest",
    "earliest": "Earliest Departure", "price": "Price", "lowestHighest": "Lowest to Highest",
    "highestLowest": "Highest to Lowest", "duration": "Duration", "shortest": "Shortest",
    "longest": "Longest", "stops": "Stops", "nonstop": "Non-stop", "oneStop": "1 Stop",
    "cabinClass": "Cabin Class", "economy": "Economy", "comfort": "Comfort", "business": "Business",
    "foundOne": "1 flight found", "foundMany": "{count} flights found",
    "foundNone": "0 flights match your filters", "selectFlight": "Select Flight",
    "viewDetails": "View Details", "departs": "Departs", "arrives": "Arrives",
    "pageAria": "Available flights", "filtersAria": "Flight filters and sorting",
    "optionsAria": "Flight options", "noResultsTitle": "No flights found",
    "noResultsText": "Try adjusting your filters or modifying your search."
  },
  "flightDetails": {
    "title": "Flight Details", "overview": "Flight Overview", "schedule": "Schedule",
    "aircraft": "Aircraft", "cabinOptions": "Cabin Options",
    "continueSeats": "Continue to Seat Selection", "backResults": "Back to Results",
    "amenities": "Amenities", "baggage": "Baggage", "fromPrice": "From {price}"
  },
  "seats": {
    "title": "Select Your Seats", "subtitle": "Choose seats for each passenger.",
    "legendAvailable": "Available", "legendSelected": "Selected", "legendOccupied": "Occupied",
    "legendExtra": "Extra legroom", "continue": "Continue", "summaryTitle": "Selection Summary",
    "selectedSeats": "Selected seats", "noSeat": "No seat selected",
    "selectFor": "Select a seat for {name}", "passengerN": "Passenger {n}",
    "validation": "Please select a seat for every passenger.",
    "occupied": "This seat is unavailable.", "mapAria": "Seat map"
  },
  "passengers": {
    "title": "Passenger Details",
    "subtitle": "Enter traveler information exactly as it appears on travel documents.",
    "contactTitle": "Booking Contact", "email": "Email", "phone": "Phone",
    "firstName": "First Name", "lastName": "Last Name", "titleLabel": "Title",
    "dob": "Date of Birth", "nationality": "Nationality", "passport": "Passport Number",
    "passportExpiry": "Passport Expiry", "summaryTitle": "Booking Summary",
    "continue": "Continue to Payment", "savePassenger": "Save passenger",
    "requiredField": "This field is required", "invalidEmail": "Enter a valid email address",
    "invalidPhone": "Enter a valid phone number", "passengerN": "Passenger {n}"
  },
  "baggage": {
    "title": "Baggage Selection", "subtitle": "Add checked baggage for your journey.",
    "included": "Cabin bag included", "continue": "Continue",
    "skip": "Continue without extra baggage", "total": "Baggage total",
    "perPassenger": "Baggage for {name}", "none": "No extra baggage",
    "option23": "23 kg checked bag", "option32": "32 kg checked bag",
    "option2x23": "2 × 23 kg checked bags"
  },
  "meals": {
    "title": "Meal Selection", "subtitle": "Choose meals for your flight.",
    "continue": "Continue", "skip": "Continue without meals", "total": "Meals total",
    "standard": "Standard meal", "vegetarian": "Vegetarian", "vegan": "Vegan",
    "halal": "Halal", "kids": "Children's meal", "none": "No meal selected",
    "forPassenger": "Meal for {name}"
  },
  "extras": {
    "title": "Extra Services", "subtitle": "Enhance your journey with optional extras.",
    "continue": "Continue to Payment", "skip": "Continue without extras", "total": "Extras total",
    "lounge": "Airport Lounge Access", "loungeDesc": "Relax before departure in a premium lounge.",
    "priority": "Priority Boarding", "priorityDesc": "Board early and settle in with ease.",
    "wifi": "Inflight Wi‑Fi", "wifiDesc": "Stay connected throughout your flight.",
    "transfer": "Airport Transfer", "transferDesc": "Private transfer at your destination.",
    "insurance": "Travel Insurance", "insuranceDesc": "Protection for unexpected changes."
  },
  "payment": {
    "title": "Payment", "subtitle": "Complete your booking securely.",
    "cardDetails": "Card Details", "cardName": "Name on Card", "cardNumber": "Card Number",
    "expiry": "Expiry", "cvv": "CVV", "promo": "Promo Code",
    "promoPlaceholder": "Enter promo code", "applyPromo": "Apply",
    "summaryTitle": "Payment Summary", "baseFare": "Base fare", "seats": "Seats",
    "baggage": "Baggage", "meals": "Meals", "extras": "Extras", "discount": "Discount",
    "taxes": "Taxes & fees", "grandTotal": "Total", "pay": "Pay {amount}",
    "applePay": "Continue with Apple Pay to complete your payment securely.",
    "googlePay": "Continue with Google Pay to complete your payment securely.",
    "invalidPromo": "Invalid promo code", "promoApplied": "{code} applied − {percent}% off",
    "bookingMissing": "Booking information could not be found. Please complete passenger details first.",
    "saveError": "Unable to save payment status. Please try again.",
    "cardRequired": "Please complete all card fields.",
    "cardInvalid": "Please enter a valid card number."
  },
  "confirmation": {
    "title": "Booking Confirmed",
    "subtitle": "Your journey is reserved. A confirmation has been prepared for your records.",
    "reference": "Booking Reference", "flightSummary": "Flight Summary",
    "passengers": "Passengers", "seats": "Seats", "extras": "Extras", "totalPaid": "Total Paid",
    "download": "Download Confirmation", "viewDetails": "Booking Details",
    "myTrips": "My Trips", "manage": "Manage Booking"
  },
  "trips": {
    "title": "My Trips", "subtitle": "View and manage your upcoming and past journeys.",
    "upcoming": "Upcoming", "past": "Past", "cancelled": "Cancelled",
    "emptyTitle": "No trips yet",
    "emptyText": "When you complete a booking, it will appear here.",
    "bookFlight": "Book a Flight", "reference": "Booking Reference",
    "viewDetails": "View Details", "manage": "Manage",
    "statusConfirmed": "Confirmed", "statusCancelled": "Cancelled", "statusCompleted": "Completed"
  },
  "manage": {
    "title": "Manage Booking",
    "subtitle": "Find your reservation with your booking reference and last name.",
    "pnr": "Booking Reference (PNR)", "lastName": "Last Name", "search": "Find Booking",
    "notFound": "No booking found. Check your reference and last name.",
    "resultTitle": "Booking Found"
  },
  "bookingDetails": {
    "title": "Booking Details", "changeTitle": "Change Booking",
    "changeIntro": "Update your flight date, cabin, or seats.",
    "newDate": "New flight date", "newCabin": "Cabin class", "newSeats": "Seat numbers",
    "seatsHint": "Enter seats separated by commas", "estimate": "Change estimate",
    "confirmChange": "Confirm Changes", "cancelBooking": "Cancel Booking",
    "changeBooking": "Change Booking", "keepBooking": "Keep Booking",
    "cancelTitle": "Cancel Booking",
    "cancelText": "Are you sure you want to cancel this booking?",
    "reference": "Booking Reference", "flightInfo": "Flight Information",
    "passengers": "Passengers", "extras": "Selected Extras", "payment": "Payment Summary",
    "download": "Download Confirmation", "noBookingTitle": "No Booking Found",
    "noBookingText": "There is no confirmed booking to display. Complete a booking or search by PNR in Manage Booking.",
    "noneSelected": "None selected", "updated": "Booking updated successfully.",
    "cancelledMsg": "Booking {pnr} has been cancelled.",
    "alreadyCancelled": "This booking is already cancelled.",
    "cannotChange": "Cancelled bookings cannot be changed.",
    "chooseDate": "Please choose a new flight date.",
    "enterSeats": "Please enter seat selections for your passengers.",
    "seatCount": "Enter exactly {count} seat(s).",
    "saveError": "Unable to save booking changes. Please try again.",
    "cancelError": "Unable to cancel this booking. Please try again."
  },
  "auth": {
    "loginEyebrow": "Welcome Back", "loginTitle": "Sign in to AEROVA",
    "loginSubtitle": "Access your trips, profile, and travel preferences.",
    "registerEyebrow": "Join AEROVA", "registerTitle": "Create your account",
    "registerSubtitle": "Save trips, manage bookings, and personalize your journey.",
    "email": "Email", "password": "Password", "firstName": "First Name", "lastName": "Last Name",
    "confirmPassword": "Confirm Password", "loginButton": "Login",
    "registerButton": "Create Account", "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?", "registerLink": "Register", "loginLink": "Login",
    "backHome": "Back to Home", "emailPlaceholder": "you@email.com",
    "passwordPlaceholder": "Your password", "emailRequired": "Email is required",
    "emailInvalid": "Enter a valid email address", "passwordRequired": "Password is required",
    "passwordShort": "Password must be at least 6 characters",
    "firstRequired": "First name is required", "lastRequired": "Last name is required",
    "confirmRequired": "Please confirm your password", "passwordMismatch": "Passwords do not match",
    "loginFailed": "Incorrect email or password",
    "emailExists": "An account with this email already exists",
    "registerSuccess": "Account created. You can now sign in."
  },
  "profile": {
    "title": "My Profile", "subtitle": "Manage your personal details and saved passengers.",
    "personal": "Personal Information", "saveChanges": "Save Changes",
    "savedPassengers": "Saved Passengers", "addPassenger": "Add Passenger",
    "editPassenger": "Edit Passenger",
    "emptyPassengers": "No saved passengers yet. Add one to speed up future bookings.",
    "saved": "Your profile changes have been saved.",
    "saveError": "Unable to save your profile right now.",
    "incomplete": "Please complete the highlighted fields.",
    "passengerSaved": "Saved passenger profile updated.",
    "passengerRemoved": "Passenger removed from your saved profiles.",
    "fieldRequired": "This field is required"
  },
  "notifications": {
    "title": "Notifications",
    "subtitle": "Stay updated on bookings, schedule changes, and offers.",
    "emptyTitle": "You're all caught up",
    "emptyText": "You are all caught up. Booking and flight updates will appear here when available.",
    "markRead": "Mark as read", "markAll": "Mark all as read",
    "bookingConfirmed": "Booking Confirmed", "bookingCancelled": "Booking Cancelled",
    "flightReminder": "Upcoming Flight Reminder", "promo": "Exclusive Offer"
  },
  "destinations": {
    "heroTitle": "Destinations",
    "heroText": "Cities and shores chosen for atmosphere, culture, and the journey between them.",
    "bookFlight": "Book a Flight", "catalogTitle": "Explore the Collection",
    "catalogDesc": "Six signature destinations, each with its own atmosphere and an AEROVA fare to begin the journey.",
    "from": "From {price}", "explore": "Explore", "ctaTitle": "Ready to fly?",
    "ctaText": "Search AEROVA flights to your next destination."
  },
  "destinationDetails": {
    "bookJourney": "Book Your Journey", "bookFlight": "Book a Flight",
    "highlights": "Highlights", "bestTime": "Best Time to Visit", "experience": "The Experience",
    "fareNote": "Fares shown are starting prices and may vary by date and cabin."
  },
  "experience": {
    "heroTitle": "The AEROVA Experience",
    "heroText": "Cabins, cuisine, and care designed to make every hour onboard feel intentional.",
    "bookJourney": "Book Your Journey", "cabinsTitle": "Cabin Experiences",
    "cabinsDesc": "Choose the rhythm of your journey.",
    "economyTitle": "Economy Experience",
    "economyText": "Ergonomic seating, thoughtful lighting, and essentials arranged so every journey feels composed from the first moment onboard.",
    "comfortTitle": "Comfort Experience",
    "comfortText": "Extra room to settle in, preferred seating options, and a calmer cabin rhythm for travelers who value space and ease.",
    "businessTitle": "Business Class Experience",
    "businessText": "Private repose, lie-flat comfort, and attentive service that turns long-haul hours into a quiet continuation of your day.",
    "lifestyleTitle": "Onboard Lifestyle", "lifestyleDesc": "Details that shape how you spend the journey.",
    "dining": "Dining",
    "diningText": "Seasonal menus and cabin-specific service, from light plates in Economy to multi-course dining in Business Class.",
    "entertainment": "Entertainment",
    "entertainmentText": "A curated library of films, music, and quiet reading modes — available when you want them, invisible when you do not.",
    "lounge": "Airport Lounge",
    "loungeText": "Calm seating, refined refreshments, and a seamless prelude to boarding for eligible Comfort and Business travelers.",
    "premium": "Premium Services",
    "premiumText": "Priority boarding, Fast Track, and tailored extras that keep your journey moving with quiet efficiency.",
    "ctaTitle": "Fly the AEROVA way",
    "ctaText": "Reserve your seat and experience travel composed around you."
  },
  "about": {
    "heroTitle": "About AEROVA",
    "heroText": "An airline built on composure, clarity, and the belief that every journey should feel considered.",
    "storyTitle": "Our Story",
    "storyText": "Today, travelers choose AEROVA for journeys that are as thoughtfully prepared as the destinations they seek.",
    "mission": "Mission",
    "missionText": "To elevate every journey with calm service, refined comfort, and effortless clarity.",
    "vision": "Vision",
    "visionText": "To become the airline travelers trust when comfort, clarity, and connection matter most.",
    "values": "Values", "whyTitle": "Why Travelers Choose AEROVA",
    "effortless": "Effortless Booking", "effortlessText": "A clear path from search to seat, without noise.",
    "considered": "Considered Comfort",
    "consideredText": "Cabins and service designed around how people actually travel.",
    "connected": "Connected Destinations",
    "connectedText": "Routes chosen for meaning, not volume alone.",
    "premiumTitle": "A Premium Standard",
    "premiumText": "From lounge to landing, every detail is composed to feel intentional."
  },
  "admin": {
    "brandSub": "Admin", "topbarMeta": "AEROVA Operations Control", "openMenu": "Open menu",
    "logout": "Logout", "dashboard": "Dashboard", "dashboardSub": "Airline operations overview",
    "flights": "Flights", "flightsSub": "Manage flight operations and status",
    "routes": "Routes", "routesSub": "Network route management",
    "schedules": "Schedules", "schedulesSub": "Departure planning and timetable control",
    "aircraft": "Aircraft", "aircraftSub": "Fleet configuration and seat capacity",
    "seats": "Seat Inventory", "seatsSub": "Cabin availability by flight",
    "bookings": "Bookings", "bookingsSub": "Reservation management and cancellations",
    "passengers": "Passengers", "passengersSub": "Traveler records and contact details",
    "totalFlights": "Total Flights", "activeRoutes": "Active Routes", "aircraftStat": "Aircraft",
    "totalBookings": "Total Bookings", "availableSeats": "Available Seats",
    "passengersStat": "Passengers", "recentBookings": "Recent Bookings",
    "upcomingFlights": "Upcoming Flights", "pnr": "PNR", "passenger": "Passenger",
    "flight": "Flight", "total": "Total", "status": "Status", "route": "Route",
    "departure": "Departure", "allStatuses": "All statuses",
    "searchFlights": "Search flight, origin, destination", "cancelBooking": "Cancel Booking",
    "bookingCancelled": "Booking {pnr} cancelled.", "actions": "Actions"
  }
}

import copy

def deep_merge(base, overlay):
    out = copy.deepcopy(base)
    for key, value in (overlay or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = value
    return out

def load_overlay(name):
    path = Path(__file__).with_name(name)
    if not path.exists():
        print("Missing overlay", name, "- using English fallback")
        return {}
    return json.loads(path.read_text(encoding="utf-8"))

az = deep_merge(en, load_overlay("az.json"))
ru = deep_merge(en, load_overlay("ru.json"))

def write_locale(code, data):
    content = (
        "window.AEROVA_LOCALES = window.AEROVA_LOCALES || {};\n"
        f"window.AEROVA_LOCALES.{code} = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    )
    (LOC / f"{code}.js").write_text(content, encoding="utf-8")
    print("Wrote", code)

write_locale("en", en)
write_locale("az", az)
write_locale("ru", ru)

engine = r'''(function () {
  var STORAGE_KEY = "aerovaLanguage";
  var SUPPORTED = { en: true, az: true, ru: true };

  function getDict(lang) {
    var all = window.AEROVA_LOCALES || {};
    return all[lang] || all.en || {};
  }

  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    var parts = String(path).split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interpolate(str, vars) {
    if (!vars) return String(str);
    return String(str).replace(/\{(\w+)\}/g, function (_, key) {
      return vars[key] != null ? String(vars[key]) : "{" + key + "}";
    });
  }

  function normalizeLang(lang) {
    lang = String(lang || "").toLowerCase();
    return SUPPORTED[lang] ? lang : "en";
  }

  function readStoredLanguage() {
    try { return normalizeLang(localStorage.getItem(STORAGE_KEY)); }
    catch (e) { return "en"; }
  }

  function writeStoredLanguage(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  var currentLang = readStoredLanguage();

  function t(key, vars) {
    var value = getByPath(getDict(currentLang), key);
    if (value == null) value = getByPath(getDict("en"), key);
    if (value == null) return key;
    return interpolate(value, vars);
  }

  function applyToElement(el) {
    if (!el || el.nodeType !== 1) return;
    var key = el.getAttribute("data-i18n");
    if (key) {
      var translated = t(key);
      if (!el.children.length) el.textContent = translated;
      else {
        var replaced = false;
        for (var i = 0; i < el.childNodes.length; i++) {
          var node = el.childNodes[i];
          if (node.nodeType === 3 && node.textContent.trim()) {
            node.textContent = (node.textContent.match(/^\s*/) || [""])[0] + translated + (node.textContent.match(/\s*$/) || [""])[0];
            replaced = true;
            break;
          }
        }
        if (!replaced) el.setAttribute("aria-label", translated);
      }
    }
    var htmlKey = el.getAttribute("data-i18n-html");
    if (htmlKey) el.innerHTML = t(htmlKey);
    var ph = el.getAttribute("data-i18n-placeholder");
    if (ph) el.setAttribute("placeholder", t(ph));
    var aria = el.getAttribute("data-i18n-aria");
    if (aria) el.setAttribute("aria-label", t(aria));
    var title = el.getAttribute("data-i18n-title");
    if (title) el.setAttribute("title", t(title));
    var valueKey = el.getAttribute("data-i18n-value");
    if (valueKey) el.value = t(valueKey);
  }

  function applyTranslations(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll("[data-i18n],[data-i18n-html],[data-i18n-placeholder],[data-i18n-aria],[data-i18n-title],[data-i18n-value]");
    for (var i = 0; i < nodes.length; i++) applyToElement(nodes[i]);
    document.querySelectorAll("[data-lang-switcher] .lang-switcher-btn").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === currentLang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    var groups = document.querySelectorAll("[data-lang-switcher]");
    groups.forEach(function (g) { g.setAttribute("aria-label", t("common.language")); });
  }

  function buildSwitcher() {
    var wrap = document.createElement("div");
    wrap.className = "lang-switcher";
    wrap.setAttribute("data-lang-switcher", "");
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", t("common.language"));
    ["az", "en", "ru"].forEach(function (code, index) {
      if (index > 0) {
        var divider = document.createElement("span");
        divider.className = "lang-switcher-divider";
        divider.setAttribute("aria-hidden", "true");
        wrap.appendChild(divider);
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lang-switcher-btn" + (code === currentLang ? " is-active" : "");
      btn.setAttribute("data-lang", code);
      btn.setAttribute("aria-pressed", code === currentLang ? "true" : "false");
      btn.textContent = code.toUpperCase();
      btn.addEventListener("click", function () { setLanguage(code); });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function injectSwitcher() {
    if (document.querySelector("[data-lang-switcher]")) {
      applyTranslations(document.querySelector("[data-lang-switcher]").parentNode || document);
      return;
    }
    var headerActions = document.querySelector(".header-actions");
    if (headerActions) {
      var switcher = buildSwitcher();
      var insertBefore = headerActions.querySelector(".trips-link, .search-button, .login-button, .menu-toggle");
      if (insertBefore) headerActions.insertBefore(switcher, insertBefore);
      else headerActions.appendChild(switcher);
      return;
    }
    var authHeader = document.querySelector(".auth-header");
    if (authHeader) {
      var authLink = authHeader.querySelector(".auth-header-link");
      var sw = buildSwitcher();
      if (authLink) authHeader.insertBefore(sw, authLink);
      else authHeader.appendChild(sw);
      return;
    }
    var adminTopbar = document.querySelector(".admin-topbar");
    if (adminTopbar) {
      var meta = adminTopbar.querySelector(".admin-topbar-meta");
      var sw2 = buildSwitcher();
      if (meta && meta.parentNode) {
        var wrap = document.createElement("div");
        wrap.className = "admin-topbar-meta-wrap";
        meta.parentNode.insertBefore(wrap, meta);
        wrap.appendChild(sw2);
        wrap.appendChild(meta);
      } else adminTopbar.appendChild(sw2);
    }
  }

  function setLanguage(lang) {
    currentLang = normalizeLang(lang);
    writeStoredLanguage(currentLang);
    document.documentElement.lang = currentLang === "az" ? "az" : currentLang;
    injectSwitcher();
    applyTranslations(document);
    try {
      window.dispatchEvent(new CustomEvent("aerova:languagechange", { detail: { language: currentLang } }));
    } catch (e) {}
  }

  function getLanguage() { return currentLang; }

  function init() {
    document.documentElement.lang = currentLang === "az" ? "az" : currentLang;
    injectSwitcher();
    applyTranslations(document);
  }

  window.AEROVA_I18N = {
    t: t,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    applyTranslations: applyTranslations,
    init: init
  };
  window.t = t;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
'''
(JS / "i18n.js").write_text(engine, encoding="utf-8")
print("Wrote i18n.js")
