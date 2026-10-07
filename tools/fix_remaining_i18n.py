# -*- coding: utf-8 -*-
"""Fix remaining hard-coded UI strings and broken manage-booking aria-label."""
from pathlib import Path
import re
import json

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "assets" / "js"
LOC = JS / "locales"


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
        "booking.showReturnFares": "Showing return fares for {route}. Click a date to set your return date.",
        "booking.clickDeparture": "Click a date to set your departure date.",
        "booking.selectADate": "Select a date",
        "seats.maxSeats": "You can select up to {count} seats.",
        "seats.maxSeatOne": "You can select up to 1 seat.",
        "manage.fieldRequired": "This field is required",
        "manage.enterPnr": "Enter your booking reference",
        "manage.enterLastName": "Enter the passenger last name",
        "manage.notFoundTitle": "Booking Not Found",
        "manage.notFoundText": "We could not find a reservation matching that reference and last name. Please check your details and try again.",
        "manage.bookingReference": "Booking Reference",
        "manage.passenger": "Passenger",
        "manage.flight": "Flight",
        "manage.route": "Route",
        "manage.date": "Date",
        "manage.viewDetails": "View Details",
        "manage.closeMenu": "Close menu",
        "manage.openMenu": "Open menu",
        "common.statusOnTime": "On Time",
        "common.statusDelayed": "Delayed",
        "common.statusScheduled": "Scheduled",
        "common.statusCancelled": "Cancelled",
        "common.statusConfirmed": "Confirmed",
        "common.statusPending": "Pending",
        "common.statusActive": "Active",
        "common.statusInactive": "Inactive",
        "common.statusCompleted": "Completed",
        "admin.status": "Status",
    },
    "az": {
        "booking.showReturnFares": "{route} üçün dönüş qiymətləri göstərilir. Dönüş tarixi üçün tarixə klikləyin.",
        "booking.clickDeparture": "Gediş tarixi üçün tarixə klikləyin.",
        "booking.selectADate": "Tarix seçin",
        "seats.maxSeats": "Ən çox {count} oturacaq seçə bilərsiniz.",
        "seats.maxSeatOne": "Ən çox 1 oturacaq seçə bilərsiniz.",
        "manage.fieldRequired": "Bu sahə mütləqdir",
        "manage.enterPnr": "Bron istinadını daxil edin",
        "manage.enterLastName": "Sərnişinin soyadını daxil edin",
        "manage.notFoundTitle": "Bron tapılmadı",
        "manage.notFoundText": "Bu istinad və soyada uyğun rezervasiya tapılmadı. Məlumatları yoxlayıb yenidən cəhd edin.",
        "manage.bookingReference": "Bron istinadı",
        "manage.passenger": "Sərnişin",
        "manage.flight": "Uçuş",
        "manage.route": "Marşrut",
        "manage.date": "Tarix",
        "manage.viewDetails": "Ətraflı bax",
        "manage.closeMenu": "Menyunu bağla",
        "manage.openMenu": "Menyunu aç",
        "common.statusOnTime": "Vaxtında",
        "common.statusDelayed": "Gecikir",
        "common.statusScheduled": "Planlaşdırılıb",
        "common.statusCancelled": "Ləğv edilib",
        "common.statusConfirmed": "Təsdiqlənib",
        "common.statusPending": "Gözləmədə",
        "common.statusActive": "Aktiv",
        "common.statusInactive": "Qeyri-aktiv",
        "common.statusCompleted": "Tamamlanıb",
        "admin.status": "Status",
    },
    "ru": {
        "booking.showReturnFares": "Показаны тарифы обратно для {route}. Нажмите дату, чтобы выбрать возвращение.",
        "booking.clickDeparture": "Нажмите дату, чтобы выбрать вылет.",
        "booking.selectADate": "Выберите дату",
        "seats.maxSeats": "Можно выбрать до {count} мест.",
        "seats.maxSeatOne": "Можно выбрать до 1 места.",
        "manage.fieldRequired": "Обязательное поле",
        "manage.enterPnr": "Введите код бронирования",
        "manage.enterLastName": "Введите фамилию пассажира",
        "manage.notFoundTitle": "Бронирование не найдено",
        "manage.notFoundText": "Не удалось найти бронь с таким кодом и фамилией. Проверьте данные и попробуйте снова.",
        "manage.bookingReference": "Код бронирования",
        "manage.passenger": "Пассажир",
        "manage.flight": "Рейс",
        "manage.route": "Маршрут",
        "manage.date": "Дата",
        "manage.viewDetails": "Подробнее",
        "manage.closeMenu": "Закрыть меню",
        "manage.openMenu": "Открыть меню",
        "common.statusOnTime": "Вовремя",
        "common.statusDelayed": "Задержка",
        "common.statusScheduled": "По расписанию",
        "common.statusCancelled": "Отменено",
        "common.statusConfirmed": "Подтверждено",
        "common.statusPending": "Ожидание",
        "common.statusActive": "Активен",
        "common.statusInactive": "Неактивен",
        "common.statusCompleted": "Завершено",
        "admin.status": "Статус",
    },
}

for lang in ("en", "az", "ru"):
    obj = load_locale(lang)
    for path, val in EXTRA[lang].items():
        set_path(obj, path, val)
    dump_locale(lang, obj)
print("locales updated")

# booking.js
p = JS / "booking.js"
t = p.read_text(encoding="utf-8")
t = t.replace(
    'calendarNote.textContent = "Showing return fares for " + returnRouteLabel + ". Click a date to set your return date.";',
    'calendarNote.textContent = tr("booking.showReturnFares", "Showing return fares for " + returnRouteLabel + ". Click a date to set your return date.", { route: returnRouteLabel });',
)
t = t.replace(
    'calendarNote.textContent = "Click a date to set your departure date.";',
    'calendarNote.textContent = tr("booking.clickDeparture", "Click a date to set your departure date.");',
)
t = t.replace(
    'summaryDepartureDate.textContent = departureDate ? formatDisplayDate(departureDate) : "Select a date";',
    'summaryDepartureDate.textContent = departureDate ? formatDisplayDate(departureDate) : tr("booking.selectADate", "Select a date");',
)
# return date select a date if any
t = t.replace(
    ': "Select a date";',
    ': tr("booking.selectADate", "Select a date");',
)
p.write_text(t, encoding="utf-8")
print("booking.js")

# seat-selection
p = JS / "seat-selection.js"
t = p.read_text(encoding="utf-8")
old = '''                showMessage(
                    "You can select up to " +
                        requiredSeats +
                        (requiredSeats === 1 ? " seat." : " seats.")
                );'''
new = '''                showMessage(
                    requiredSeats === 1
                        ? tr("seats.maxSeatOne", "You can select up to 1 seat.")
                        : tr("seats.maxSeats", "You can select up to " + requiredSeats + " seats.", { count: requiredSeats })
                );'''
if old in t:
    t = t.replace(old, new)
    p.write_text(t, encoding="utf-8")
    print("seat-selection max")
else:
    print("seat-selection pattern miss")

# manage-booking - fix renderNotFound, renderBookingResult, validation, menu
p = JS / "manage-booking.js"
t = p.read_text(encoding="utf-8")
t = t.replace(
    'input.setAttribute("placeholder", message || "This field is required");',
    'input.setAttribute("placeholder", message || tr("manage.fieldRequired", "This field is required"));',
)
t = t.replace(
    'markInvalid(pnrInput, "Enter your booking reference");',
    'markInvalid(pnrInput, tr("manage.enterPnr", "Enter your booking reference"));',
)
t = t.replace(
    'markInvalid(lastNameInput, "Enter the passenger last name");',
    'markInvalid(lastNameInput, tr("manage.enterLastName", "Enter the passenger last name"));',
)
t = t.replace(
    'toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");',
    'toggle.setAttribute("aria-label", open ? tr("manage.closeMenu", "Close menu") : tr("manage.openMenu", "Open menu"));',
)

old_nf = '''        results.innerHTML =
            '<div class="booking-not-found">' +
                '<h2 class="booking-not-found-title">Booking Not Found</h2>' +
                '<p class="booking-not-found-text">We could not find a reservation matching that reference and last name. Please check your details and try again.</p>' +
            "</div>";'''
new_nf = '''        results.innerHTML =
            '<div class="booking-not-found">' +
                '<h2 class="booking-not-found-title">' + tr("manage.notFoundTitle", "Booking Not Found") + '</h2>' +
                '<p class="booking-not-found-text">' + tr("manage.notFoundText", "We could not find a reservation matching that reference and last name. Please check your details and try again.") + '</p>' +
            "</div>";'''
if old_nf in t:
    t = t.replace(old_nf, new_nf)
else:
    print("notfound miss")

# Fix broken aria-label and translate card chrome
t = t.replace(
    '\'<article class="booking-result-card" aria-label=tr("manage.resultAria", "Booking result")>\' +',
    '\'<article class="booking-result-card" aria-label="\' + tr("manage.resultAria", "Booking result") + \'">\' +',
)
t = t.replace(
    '\'<p class="booking-result-pnr-label">Booking Reference</p>\' +',
    '\'<p class="booking-result-pnr-label">\' + tr("manage.bookingReference", "Booking Reference") + \'</p>\' +',
)
t = t.replace(
    '\'<div class="booking-result-meta-item"><dt>Passenger</dt><dd>\'',
    '\'<div class="booking-result-meta-item"><dt>\' + tr("manage.passenger", "Passenger") + \'</dt><dd>\'',
)
t = t.replace(
    '\'<div class="booking-result-meta-item"><dt>Flight</dt><dd>\'',
    '\'<div class="booking-result-meta-item"><dt>\' + tr("manage.flight", "Flight") + \'</dt><dd>\'',
)
t = t.replace(
    '\'<div class="booking-result-meta-item"><dt>Route</dt><dd>\'',
    '\'<div class="booking-result-meta-item"><dt>\' + tr("manage.route", "Route") + \'</dt><dd>\'',
)
t = t.replace(
    '\'<div class="booking-result-meta-item"><dt>Date</dt><dd>\'',
    '\'<div class="booking-result-meta-item"><dt>\' + tr("manage.date", "Date") + \'</dt><dd>\'',
)
# view details button text if hard-coded
t = re.sub(
    r'(class="[^"]*booking-result[^"]*"[^>]*>)View Details',
    lambda m: m.group(0),  # noop placeholder
    t,
)
if ">View Details<" in t:
    t = t.replace(">View Details<", ">' + tr(\"manage.viewDetails\", \"View Details\") + '<")
    # that might break strings - check
p.write_text(t, encoding="utf-8")
print("manage-booking")

# Add status translator helper to admin.js if missing
admin = JS / "admin.js"
at = admin.read_text(encoding="utf-8")
if "function translateStatus" not in at:
    helper_fn = '''
    function translateStatus(status) {
        var map = {
            "On Time": "common.statusOnTime",
            "Delayed": "common.statusDelayed",
            "Scheduled": "common.statusScheduled",
            "Cancelled": "common.statusCancelled",
            "Confirmed": "common.statusConfirmed",
            "Pending": "common.statusPending",
            "Active": "common.statusActive",
            "Inactive": "common.statusInactive",
            "Completed": "common.statusCompleted",
            "Available": "common.available",
            "Occupied": "common.occupied",
            "Reserved": "common.reserved",
            "Blocked": "common.blocked"
        };
        var key = map[status];
        return key ? tr(key, status) : status;
    }
'''
    m = re.search(r"function tr\(key", at)
    if m:
        # insert after tr function end - find next function
        idx = at.find("function ", m.end())
        if idx != -1:
            at = at[:idx] + helper_fn + at[idx:]
    # replace display of status in table cells - common pattern escapeHtml(item.status)
    at = at.replace("escapeHtml(item.status)", "escapeHtml(translateStatus(item.status))")
    at = at.replace("escapeHtml(flight.status)", "escapeHtml(translateStatus(flight.status))")
    at = at.replace("escapeHtml(row.status)", "escapeHtml(translateStatus(row.status))")
    at = at.replace("escapeHtml(booking.status)", "escapeHtml(translateStatus(booking.status))")
    at = at.replace('label: "Status"', 'label: tr("admin.status", "Status")')
    admin.write_text(at, encoding="utf-8")
    print("admin status")
else:
    print("admin already has translateStatus")

print("done")
