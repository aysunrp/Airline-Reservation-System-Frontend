# -*- coding: utf-8 -*-
from pathlib import Path
import re
import json

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "assets" / "js"
LOC = JS / "locales"

HELPER = """
    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return typeof vars === "object" && vars
            ? String(fallback).replace(/\\{(\\w+)\\}/g, function (_, k) { return vars[k] != null ? String(vars[k]) : "{" + k + "}"; })
            : fallback;
    }

    function monthName(index) {
        var key = "common.months." + String(index + 1);
        var translated = tr(key, "");
        if (translated && translated !== key) return translated;
        return MONTH_NAMES[index];
    }
"""


def ensure_helpers(text: str) -> str:
    if "function tr(key" not in text:
        m = re.search(r"\(function\s*\(\)\s*\{", text)
        if m:
            text = text[: m.end()] + HELPER + text[m.end() :]
    elif "function monthName" not in text:
        # insert monthName after tr
        idx = text.find("function tr(key")
        # find end of tr function - naive: next \n    function
        end = text.find("\n    function ", idx + 1)
        if end == -1:
            end = text.find("\n    var ", idx + 1)
        month_fn = """
    function monthName(index) {
        var key = "common.months." + String(index + 1);
        var translated = tr(key, "");
        if (translated && translated !== key) return translated;
        return MONTH_NAMES[index];
    }
"""
        if end != -1:
            text = text[:end] + month_fn + text[end:]
    return text


def load_locale(lang):
    text = (LOC / f"{lang}.js").read_text(encoding="utf-8")
    m = re.search(r"window\.AEROVA_LOCALES\.\w+\s*=\s*(\{[\s\S]*\});\s*$", text)
    ns = {}
    exec("d = " + m.group(1), ns)
    return ns["d"]


def dump_locale(lang, obj):
    body = json.dumps(obj, ensure_ascii=False, indent=2)
    (LOC / f"{lang}.js").write_text(
        f"window.AEROVA_LOCALES = window.AEROVA_LOCALES || {{}};\nwindow.AEROVA_LOCALES.{lang} = {body};\n",
        encoding="utf-8",
    )


def set_path(obj, path, value):
    parts = path.split(".")
    cur = obj
    for p in parts[:-1]:
        cur = cur.setdefault(p, {})
    cur[parts[-1]] = value


EXTRA = {
    "en": {
        "trips.flightLabel": "Flight {number}",
        "trips.bookingReference": "Booking Reference",
        "trips.flightDate": "Flight Date",
        "trips.departure": "Departure",
        "trips.arrival": "Arrival",
        "trips.duration": "Duration",
        "trips.aircraft": "Aircraft",
        "trips.cabinClass": "Cabin Class",
        "trips.passengerCount": "Passenger Count",
        "trips.selectedSeats": "Selected Seats",
        "trips.total": "Total",
        "manage.viewBooking": "View Booking",
        "manage.changeBooking": "Change Booking",
        "manage.cancelBooking": "Cancel Booking",
        "admin.flightNumber": "Flight Number",
        "admin.addRoute": "Add Route",
        "admin.addSchedule": "Add Schedule",
        "admin.routeId": "Route ID",
        "admin.distance": "Distance",
        "admin.duration": "Duration",
        "admin.arrival": "Arrival",
        "admin.origin": "Origin",
        "admin.destination": "Destination",
        "admin.basePrice": "Base Price",
        "admin.capacity": "Capacity",
        "admin.model": "Model",
        "admin.documentType": "Document Type",
        "admin.documentNumber": "Document Number",
        "admin.email": "Email",
        "admin.phone": "Phone",
        "admin.nationality": "Nationality",
        "admin.tripsCol": "Trips",
        "admin.cabin": "Cabin",
        "admin.seatsCol": "Seats",
        "admin.date": "Date",
        "admin.addFlight": "Add Flight",
        "admin.addAircraft": "Add Aircraft",
        "admin.addPassenger": "Add Passenger",
        "admin.searchPlaceholder": "Search...",
    },
    "az": {
        "trips.flightLabel": "Uçuş {number}",
        "trips.bookingReference": "Bron istinadı",
        "trips.flightDate": "Uçuş tarixi",
        "trips.departure": "Gediş",
        "trips.arrival": "Gəliş",
        "trips.duration": "Müddət",
        "trips.aircraft": "Təyyarə",
        "trips.cabinClass": "Salon sinfi",
        "trips.passengerCount": "Sərnişin sayı",
        "trips.selectedSeats": "Seçilmiş oturacaqlar",
        "trips.total": "Cəmi",
        "manage.viewBooking": "Bronu göstər",
        "manage.changeBooking": "Bronu dəyiş",
        "manage.cancelBooking": "Bronu ləğv et",
        "admin.flightNumber": "Uçuş nömrəsi",
        "admin.addRoute": "Marşrut əlavə et",
        "admin.addSchedule": "Cədvəl əlavə et",
        "admin.routeId": "Marşrut ID",
        "admin.distance": "Məsafə",
        "admin.duration": "Müddət",
        "admin.arrival": "Gəliş",
        "admin.origin": "Mənşə",
        "admin.destination": "Təyinat",
        "admin.basePrice": "Baza qiymət",
        "admin.capacity": "Tutum",
        "admin.model": "Model",
        "admin.documentType": "Sənəd növü",
        "admin.documentNumber": "Sənəd nömrəsi",
        "admin.email": "E-poçt",
        "admin.phone": "Telefon",
        "admin.nationality": "Vətəndaşlıq",
        "admin.tripsCol": "Səyahətlər",
        "admin.cabin": "Salon",
        "admin.seatsCol": "Oturacaqlar",
        "admin.date": "Tarix",
        "admin.addFlight": "Uçuş əlavə et",
        "admin.addAircraft": "Təyyarə əlavə et",
        "admin.addPassenger": "Sərnişin əlavə et",
        "admin.searchPlaceholder": "Axtar...",
    },
    "ru": {
        "trips.flightLabel": "Рейс {number}",
        "trips.bookingReference": "Код бронирования",
        "trips.flightDate": "Дата рейса",
        "trips.departure": "Вылет",
        "trips.arrival": "Прилёт",
        "trips.duration": "Длительность",
        "trips.aircraft": "Самолёт",
        "trips.cabinClass": "Класс обслуживания",
        "trips.passengerCount": "Число пассажиров",
        "trips.selectedSeats": "Выбранные места",
        "trips.total": "Итого",
        "manage.viewBooking": "Открыть бронь",
        "manage.changeBooking": "Изменить бронь",
        "manage.cancelBooking": "Отменить бронь",
        "admin.flightNumber": "Номер рейса",
        "admin.addRoute": "Добавить маршрут",
        "admin.addSchedule": "Добавить расписание",
        "admin.routeId": "ID маршрута",
        "admin.distance": "Расстояние",
        "admin.duration": "Длительность",
        "admin.arrival": "Прилёт",
        "admin.origin": "Откуда",
        "admin.destination": "Куда",
        "admin.basePrice": "Базовая цена",
        "admin.capacity": "Вместимость",
        "admin.model": "Модель",
        "admin.documentType": "Тип документа",
        "admin.documentNumber": "Номер документа",
        "admin.email": "Эл. почта",
        "admin.phone": "Телефон",
        "admin.nationality": "Гражданство",
        "admin.tripsCol": "Поездки",
        "admin.cabin": "Класс",
        "admin.seatsCol": "Места",
        "admin.date": "Дата",
        "admin.addFlight": "Добавить рейс",
        "admin.addAircraft": "Добавить ВС",
        "admin.addPassenger": "Добавить пассажира",
        "admin.searchPlaceholder": "Поиск...",
    },
}

for lang in ("en", "az", "ru"):
    obj = load_locale(lang)
    for path, val in EXTRA[lang].items():
        set_path(obj, path, val)
    dump_locale(lang, obj)
print("locales ok")

# my-trips.js
p = JS / "my-trips.js"
t = p.read_text(encoding="utf-8")
t = ensure_helpers(t)
t = t.replace(
    'return day + " " + MONTH_NAMES[month - 1] + " " + year;',
    'return day + " " + monthName(month - 1) + " " + year;',
)
t = t.replace('return "Cancelled";', 'return tr("common.statusCancelled", "Cancelled");')
t = t.replace('return "Confirmed";', 'return tr("common.statusConfirmed", "Confirmed");')

old_card = '''        return (
            '<article class="trip-card">' +
                '<div class="trip-card-top">' +
                    '<div class="trip-card-identity">' +
                        '<p class="trip-card-airline">' + escapeHtml(flight.airline || "AEROVA") + "</p>" +
                        '<h2 class="trip-card-route">' + escapeHtml(route) + "</h2>" +
                        '<p class="trip-card-flight">Flight ' + escapeHtml(flight.flightNumber || "—") + "</p>" +
                    "</div>" +
                    '<div class="trip-card-status trip-card-status--confirmed">' + escapeHtml(status) + "</div>" +
                "</div>" +
                '<dl class="trip-card-meta">' +
                    '<div class="trip-card-meta-item">' +
                        "<dt>Booking Reference</dt>" +
                        "<dd>" + escapeHtml(pnr) + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>Flight Date</dt>" +
                        "<dd>" + escapeHtml(formatDisplayDate(flight.departureDate)) + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>Departure</dt>" +
                        "<dd>" + escapeHtml(flight.departure || "—") + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>Arrival</dt>" +
                        "<dd>" + escapeHtml(flight.arrival || "—") + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>Duration</dt>" +
                        "<dd>" + escapeHtml(flight.duration || "—") + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>Aircraft</dt>" +
                        "<dd>" + escapeHtml(flight.aircraft || "—") + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>Cabin Class</dt>" +
                        "<dd>" + escapeHtml(bookingData.cabinClass || "—") + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>Passenger Count</dt>" +
                        "<dd>" + escapeHtml(String(passengerCount || "—")) + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>Selected Seats</dt>" +
                        "<dd>" + escapeHtml(seatsText) + "</dd>" +
                    "</div>" +
                "</dl>" +
                '<div class="trip-card-footer">' +
                    '<div class="trip-card-price">' +
                        '<p class="trip-card-price-label">Total</p>' +
                        '<p class="trip-card-price-value">' + escapeHtml(formatPrice(bookingData.totalPrice)) + "</p>" +
                    "</div>" +
                    '<a class="trip-card-button" href="booking-details.html?source=trips">View Details</a>' +
                "</div>" +
            "</article>"
        );'''

new_card = '''        return (
            '<article class="trip-card">' +
                '<div class="trip-card-top">' +
                    '<div class="trip-card-identity">' +
                        '<p class="trip-card-airline">' + escapeHtml(flight.airline || "AEROVA") + "</p>" +
                        '<h2 class="trip-card-route">' + escapeHtml(route) + "</h2>" +
                        '<p class="trip-card-flight">' + escapeHtml(tr("trips.flightLabel", "Flight " + (flight.flightNumber || "—"), { number: flight.flightNumber || "—" })) + "</p>" +
                    "</div>" +
                    '<div class="trip-card-status trip-card-status--confirmed">' + escapeHtml(status) + "</div>" +
                "</div>" +
                '<dl class="trip-card-meta">' +
                    '<div class="trip-card-meta-item">' +
                        "<dt>" + tr("trips.bookingReference", "Booking Reference") + "</dt>" +
                        "<dd>" + escapeHtml(pnr) + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>" + tr("trips.flightDate", "Flight Date") + "</dt>" +
                        "<dd>" + escapeHtml(formatDisplayDate(flight.departureDate)) + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>" + tr("trips.departure", "Departure") + "</dt>" +
                        "<dd>" + escapeHtml(flight.departure || "—") + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>" + tr("trips.arrival", "Arrival") + "</dt>" +
                        "<dd>" + escapeHtml(flight.arrival || "—") + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>" + tr("trips.duration", "Duration") + "</dt>" +
                        "<dd>" + escapeHtml(flight.duration || "—") + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>" + tr("trips.aircraft", "Aircraft") + "</dt>" +
                        "<dd>" + escapeHtml(flight.aircraft || "—") + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>" + tr("trips.cabinClass", "Cabin Class") + "</dt>" +
                        "<dd>" + escapeHtml(bookingData.cabinClass || "—") + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>" + tr("trips.passengerCount", "Passenger Count") + "</dt>" +
                        "<dd>" + escapeHtml(String(passengerCount || "—")) + "</dd>" +
                    "</div>" +
                    '<div class="trip-card-meta-item">' +
                        "<dt>" + tr("trips.selectedSeats", "Selected Seats") + "</dt>" +
                        "<dd>" + escapeHtml(seatsText) + "</dd>" +
                    "</div>" +
                "</dl>" +
                '<div class="trip-card-footer">' +
                    '<div class="trip-card-price">' +
                        '<p class="trip-card-price-label">' + tr("trips.total", "Total") + "</p>" +
                        '<p class="trip-card-price-value">' + escapeHtml(formatPrice(bookingData.totalPrice)) + "</p>" +
                    "</div>" +
                    '<a class="trip-card-button" href="booking-details.html?source=trips">' + tr("trips.viewDetails", "View Details") + "</a>" +
                "</div>" +
            "</article>"
        );'''

if old_card in t:
    t = t.replace(old_card, new_card)
    print("my-trips card replaced")
else:
    print("my-trips card MISS")

# language change
if "aerova:languagechange" not in t:
    t = t.replace(
        'document.addEventListener("DOMContentLoaded", init);',
        'document.addEventListener("DOMContentLoaded", init);\n'
        '    window.addEventListener("aerova:languagechange", function () {\n'
        '        if (typeof init === "function") { try { init(); } catch (e) {} }\n'
        '        if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);\n'
        '    });',
    )
p.write_text(t, encoding="utf-8")

# manage buttons
p = JS / "manage-booking.js"
t = p.read_text(encoding="utf-8")
t = t.replace(
    '\'<button class="booking-action-button booking-action-button--primary" type="button" data-action="view">View Booking</button>\' +',
    '\'<button class="booking-action-button booking-action-button--primary" type="button" data-action="view">\' + tr("manage.viewBooking", "View Booking") + \'</button>\' +',
)
t = t.replace(
    '\'<button class="booking-action-button booking-action-button--secondary" type="button" data-action="change">Change Booking</button>\' +',
    '\'<button class="booking-action-button booking-action-button--secondary" type="button" data-action="change">\' + tr("manage.changeBooking", "Change Booking") + \'</button>\' +',
)
t = t.replace(
    '\'<button class="booking-action-button booking-action-button--secondary" type="button" data-action="cancel">Cancel Booking</button>\' +',
    '\'<button class="booking-action-button booking-action-button--secondary" type="button" data-action="cancel">\' + tr("manage.cancelBooking", "Cancel Booking") + \'</button>\' +',
)
p.write_text(t, encoding="utf-8")
print("manage buttons")

# retag with new keys
import subprocess
subprocess.check_call(["python", str(ROOT / "tools" / "retag_html_i18n.py")])
print("done")
