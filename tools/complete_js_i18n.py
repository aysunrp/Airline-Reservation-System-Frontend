# -*- coding: utf-8 -*-
"""Complete JS i18n wiring + fix AZ/RU English leftovers in locales."""
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
"""


def load_locale_obj(path: Path):
    text = path.read_text(encoding="utf-8")
    m = re.search(r"window\.AEROVA_LOCALES\.\w+\s*=\s*(\{[\s\S]*\});\s*$", text)
    if not m:
        raise RuntimeError("cannot parse " + str(path))
    ns = {}
    exec("d = " + m.group(1), ns)
    return ns["d"]


def dump_locale(lang: str, obj: dict) -> None:
    path = LOC / f"{lang}.js"
    body = json.dumps(obj, ensure_ascii=False, indent=2)
    path.write_text(
        f"window.AEROVA_LOCALES = window.AEROVA_LOCALES || {{}};\nwindow.AEROVA_LOCALES.{lang} = {body};\n",
        encoding="utf-8",
    )


def deep_merge(base: dict, extra: dict) -> dict:
    out = dict(base)
    for k, v in extra.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        p = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, p))
        else:
            out[p] = v
    return out


def unflatten(flat: dict) -> dict:
    root = {}
    for path, value in flat.items():
        parts = path.split(".")
        cur = root
        for p in parts[:-1]:
            cur = cur.setdefault(p, {})
        cur[parts[-1]] = value
    return root


# --- Fix AZ/RU leftovers that still match EN ---
AZ_FIX = {
    "payment.bookingNotFound": "Bron tapılmadı",
    "payment.enterPromo": "Promo kod daxil edin",
    "payment.promoAlready": "Promo kod artıq tətbiq olunub",
    "payment.removeCodeFirst": "Əvvəlcə cari kodu silin",
    "payment.promoSaveFail": "Promo kod yadda saxlanılmadı",
    "payment.fieldRequired": "Bu sahə mütləqdir",
    "payment.cardholder": "Kart sahibinin adını daxil edin",
    "payment.enterCard": "Kart nömrəsini daxil edin",
    "payment.validCard": "Düzgün kart nömrəsi daxil edin",
    "payment.enterExpiry": "Bitmə tarixini daxil edin",
    "payment.validExpiry": "Düzgün bitmə tarixi daxil edin",
    "payment.enterCvv": "CVV daxil edin",
    "payment.validCvv": "Düzgün CVV daxil edin",
    "payment.cardLabel": "Kredit / Debet kartı",
    "common.fastTrack": "Sürətli keçid",
    "home.voiceCaptureFail": "Səs tutula bilmədi. Yenidən cəhd edin və ya yazın.",
    "home.voiceStartFail": "Səsli axtarış başladıla bilmədi. Yenidən cəhd edin və ya yazın.",
    "home.voiceEmpty": "Haraya uçmaq istədiyinizi deyin və ya yazın.",
    "home.voiceNeedFrom": "Mənşə nöqtəsini göstərin.",
    "home.voiceNeedTo": "Təyinatı göstərin.",
    "home.voiceStop": "Səsli axtarışı dayandır",
    "home.voiceStart": "Səsli axtarışı başlat",
    "booking.voiceUnsupported": "Bu brauzerdə səsli axtarış dəstəklənmir. Şəhəri yazın.",
    "booking.voiceCaptureFail": "Səs tutula bilmədi. Yenidən cəhd edin.",
    "booking.voiceStartFail": "Səsli axtarış başladıla bilmədi. Yenidən cəhd edin.",
    "booking.needPassengers": "Sərnişin sayını seçin.",
    "booking.needCabin": "Salon sinfini seçin.",
    "booking.completeMulti": "Hər uçuş üçün Haradan, Haraya və Gediş tarixini doldurun.",
    "booking.needFrom": "Gediş şəhəri və ya hava limanını daxil edin.",
    "booking.needTo": "Təyinat şəhəri və ya hava limanını daxil edin.",
    "booking.needDeparture": "Gediş tarixini seçin.",
    "booking.needReturn": "Dönüş tarixini seçin.",
    "booking.returnAfter": "Dönüş tarixi gediş tarixindən əvvəl ola bilməz.",
    "booking.flightN": "Uçuş {n}",
    "booking.returnFares": "{route} üçün dönüş qiymətləri. Gedişdən sonra və ya eyni gündə dönüş seçin.",
    "booking.depFaresRound": "{route} üçün gediş qiymətləri. Gediş seçdikdən sonra dönüşü seçin.",
    "booking.oneWayFares": "{route} üçün birtərəfli başlanğıc qiymətlər. Gediş tarixi üçün tarixə klikləyin.",
    "booking.selectedReturn": "Seçilmiş dönüş {date}, {price}-dan.",
    "booking.selectDepFirst": "Əvvəlcə gediş tarixini, sonra dönüşü seçin.",
    "booking.selectedDep": "Seçilmiş gediş {date}, {price}-dan.",
    "passengers.incompleteBooking": "Bron məlumatı natamamdır. Oturacaq seçiminə qayıdın.",
    "passengers.saveFail": "Bron detalları yadda saxlanılmadı. Yenidən cəhd edin.",
    "passengers.noBooking": "Bron tapılmadı. Əvvəlcə uçuş və oturacaq seçin.",
    "passengers.missingCount": "Sərnişin sayı yoxdur. Bron səhifəsinə qayıdın.",
    "passengers.noSeats": "Oturacaq seçilməyib. Oturacaq seçiminə qayıdın.",
    "passengers.duplicateSeats": "Təkrarlanan oturacaqlar tapıldı. Unikal oturacaqlar seçin.",
    "baggage.optionsAria": "{name} üçün baqaj seçimləri",
    "meals.optionsAria": "{name} üçün yemək seçimləri",
    "extras.noneSelected": "Əlavə xidmət seçilməyib",
    "profile.fieldRequired": "Bu sahə mütləqdir",
    "profile.noSaved": "Hələ yadda saxlanılmış sərnişin yoxdur. Gələcək bronları sürətləndirmək üçün əlavə edin.",
    "profile.completeFields": "Vurğulanmış sahələri tamamlayın.",
    "profile.saveFail": "Profil indi yadda saxlanıla bilmir.",
    "profile.saved": "Profil dəyişiklikləriniz yadda saxlanıldı.",
    "profile.editPassenger": "Sərnişini redaktə et",
    "profile.addPassenger": "Sərnişin əlavə et",
    "profile.passengerUpdated": "Yadda saxlanılmış sərnişin yeniləndi.",
    "profile.passengerRemoved": "Sərnişin yadda saxlanılmış siyahıdan silindi.",
    "bookingDetails.noneSelected": "Seçilməyib",
    "bookingDetails.cancelledNoChange": "Ləğv edilmiş bron dəyişdirilə bilməz.",
    "bookingDetails.chooseDate": "Yeni uçuş tarixi seçin.",
    "bookingDetails.enterSeats": "Sərnişinləriniz üçün oturacaqları daxil edin.",
    "bookingDetails.exactSeats": "Dəqiq {count} oturacaq daxil edin.",
    "bookingDetails.saveFail": "Bron dəyişiklikləri yadda saxlanılmadı. Yenidən cəhd edin.",
    "bookingDetails.updated": "Bron uğurla yeniləndi. {note}",
    "bookingDetails.cancelFail": "Bu bron ləğv edilə bilmədi. Yenidən cəhd edin.",
    "bookingDetails.cancelled": "{pnr} bronu ləğv edildi.",
    "bookingDetails.alreadyCancelled": "Bu bron artıq ləğv edilib.",
    "admin.editPrefix": "Redaktə: ",
    "admin.addPrefix": "Əlavə et: ",
    "admin.noFlights": "Uçuş tapılmadı.",
    "admin.noRoutes": "Marşrut tapılmadı.",
    "admin.noSchedules": "Cədvəl tapılmadı.",
    "admin.noAircraft": "Təyyarə tapılmadı.",
    "admin.noBookings": "Bron tapılmadı.",
    "admin.noPassengers": "Sərnişin tapılmadı.",
    "admin.bookingCancelledMsg": "{pnr} bronu ləğv edildi.",
    "destinationDetails.noDepartures": "Hazırda planlaşdırılmış uçuş yoxdur.",
    "destinationDetails.discover": "{name} kəşf edin",
    "destinationDetails.flyTo": "{name} istiqamətinə uçun",
    "manage.resultAria": "Bron nəticəsi",
    "seats.ofSelected": "{selected} / {total} oturacaq seçildi",
}

RU_FIX = {
    "payment.bookingNotFound": "Бронирование не найдено",
    "payment.enterPromo": "Введите промокод",
    "payment.promoAlready": "Промокод уже применён",
    "payment.removeCodeFirst": "Сначала удалите текущий код",
    "payment.promoSaveFail": "Не удалось сохранить промокод",
    "payment.fieldRequired": "Обязательное поле",
    "payment.cardholder": "Введите имя владельца карты",
    "payment.enterCard": "Введите номер карты",
    "payment.validCard": "Введите корректный номер карты",
    "payment.enterExpiry": "Введите срок действия",
    "payment.validExpiry": "Введите корректный срок действия",
    "payment.enterCvv": "Введите CVV",
    "payment.validCvv": "Введите корректный CVV",
    "payment.cardLabel": "Кредитная / дебетовая карта",
    "common.fastTrack": "Fast Track",
    "home.voiceCaptureFail": "Не удалось распознать речь. Попробуйте снова или введите запрос.",
    "home.voiceStartFail": "Не удалось начать голосовой поиск. Попробуйте снова или введите запрос.",
    "home.voiceEmpty": "Скажите или введите, куда хотите лететь.",
    "home.voiceNeedFrom": "Укажите пункт вылета.",
    "home.voiceNeedTo": "Укажите пункт назначения.",
    "home.voiceStop": "Остановить голосовой поиск",
    "home.voiceStart": "Начать голосовой поиск",
    "booking.voiceUnsupported": "Голосовой поиск не поддерживается в этом браузере. Введите город.",
    "booking.voiceCaptureFail": "Не удалось распознать речь. Попробуйте снова.",
    "booking.voiceStartFail": "Не удалось начать голосовой поиск. Попробуйте снова.",
    "booking.needPassengers": "Выберите количество пассажиров.",
    "booking.needCabin": "Выберите класс обслуживания.",
    "booking.completeMulti": "Заполните Откуда, Куда и дату вылета для каждого рейса.",
    "booking.needFrom": "Введите город или аэропорт вылета.",
    "booking.needTo": "Введите город или аэропорт назначения.",
    "booking.needDeparture": "Выберите дату вылета.",
    "booking.needReturn": "Выберите дату возвращения.",
    "booking.returnAfter": "Дата возвращения не может быть раньше даты вылета.",
    "booking.flightN": "Рейс {n}",
    "booking.returnFares": "Тарифы обратно для {route}. Выберите дату возвращения не раньше вылета.",
    "booking.depFaresRound": "Тарифы туда для {route}. После выбора вылета выберите возвращение.",
    "booking.oneWayFares": "Тарифы в одну сторону для {route}. Нажмите дату, чтобы выбрать вылет.",
    "booking.selectedReturn": "Выбрано возвращение {date} от {price}.",
    "booking.selectDepFirst": "Сначала выберите дату вылета, затем возвращение.",
    "booking.selectedDep": "Выбран вылет {date} от {price}.",
    "passengers.incompleteBooking": "Данные бронирования неполны. Вернитесь к выбору мест.",
    "passengers.saveFail": "Не удалось сохранить данные. Попробуйте снова.",
    "passengers.noBooking": "Бронирование не найдено. Сначала выберите рейс и места.",
    "passengers.missingCount": "Не указано число пассажиров. Вернитесь к бронированию.",
    "passengers.noSeats": "Места не выбраны. Вернитесь к выбору мест.",
    "passengers.duplicateSeats": "Найдены повторяющиеся места. Выберите уникальные места.",
    "baggage.optionsAria": "Варианты багажа для {name}",
    "meals.optionsAria": "Варианты питания для {name}",
    "extras.noneSelected": "Дополнительные услуги не выбраны",
    "profile.fieldRequired": "Обязательное поле",
    "profile.noSaved": "Пока нет сохранённых пассажиров. Добавьте, чтобы ускорить будущие бронирования.",
    "profile.completeFields": "Заполните выделенные поля.",
    "profile.saveFail": "Не удалось сохранить профиль.",
    "profile.saved": "Изменения профиля сохранены.",
    "profile.editPassenger": "Редактировать пассажира",
    "profile.addPassenger": "Добавить пассажира",
    "profile.passengerUpdated": "Сохранённый пассажир обновлён.",
    "profile.passengerRemoved": "Пассажир удалён из сохранённых.",
    "bookingDetails.noneSelected": "Не выбрано",
    "bookingDetails.cancelledNoChange": "Отменённое бронирование нельзя изменить.",
    "bookingDetails.chooseDate": "Выберите новую дату рейса.",
    "bookingDetails.enterSeats": "Введите места для пассажиров.",
    "bookingDetails.exactSeats": "Введите ровно {count} мест(а).",
    "bookingDetails.saveFail": "Не удалось сохранить изменения. Попробуйте снова.",
    "bookingDetails.updated": "Бронирование успешно обновлено. {note}",
    "bookingDetails.cancelFail": "Не удалось отменить бронирование. Попробуйте снова.",
    "bookingDetails.cancelled": "Бронирование {pnr} отменено.",
    "bookingDetails.alreadyCancelled": "Это бронирование уже отменено.",
    "admin.editPrefix": "Изменить: ",
    "admin.addPrefix": "Добавить: ",
    "admin.noFlights": "Рейсы не найдены.",
    "admin.noRoutes": "Маршруты не найдены.",
    "admin.noSchedules": "Расписания не найдены.",
    "admin.noAircraft": "Воздушные суда не найдены.",
    "admin.noBookings": "Бронирования не найдены.",
    "admin.noPassengers": "Пассажиры не найдены.",
    "admin.bookingCancelledMsg": "Бронирование {pnr} отменено.",
    "destinationDetails.noDepartures": "На данный момент нет запланированных вылетов.",
    "destinationDetails.discover": "Откройте для себя {name}",
    "destinationDetails.flyTo": "Летите в {name}",
    "manage.resultAria": "Результат бронирования",
    "seats.ofSelected": "Выбрано {selected} из {total} мест",
}

EN_EXTRA = {
    "home": {
        "voiceCaptureFail": "Unable to capture voice input. Please try again or type your request.",
        "voiceStartFail": "Unable to start voice search. Please try again or type your request.",
        "voiceEmpty": "Please say or type where you would like to fly.",
        "voiceNeedFrom": "Please provide your origin.",
        "voiceNeedTo": "Please provide your destination.",
        "voiceStop": "Stop voice search",
        "voiceStart": "Start voice search",
    },
    "booking": {
        "voiceUnsupported": "Voice search is not supported in this browser. Please type your city.",
        "voiceCaptureFail": "Unable to capture voice input. Please try again.",
        "voiceStartFail": "Unable to start voice search. Please try again.",
        "needPassengers": "Please select the number of passengers.",
        "needCabin": "Please select a cabin class.",
        "completeMulti": "Please complete From, To and Departure Date for every flight.",
        "needFrom": "Please enter a departure city or airport.",
        "needTo": "Please enter a destination city or airport.",
        "needDeparture": "Please select a departure date.",
        "needReturn": "Please select a return date.",
        "returnAfter": "Return date must be on or after the departure date.",
        "flightN": "Flight {n}",
        "returnFares": "Return fares for {route}. Choose a return date on or after your departure.",
        "depFaresRound": "Departure fares for {route}. After you pick a departure date, select your return.",
        "oneWayFares": "One-way starting fares for {route}. Click a date to set your departure date.",
        "selectedReturn": "Selected return {date} from {price}.",
        "selectDepFirst": "Select a departure date first, then choose your return.",
        "selectedDep": "Selected departure {date} from {price}.",
    },
    "passengers": {
        "incompleteBooking": "Booking data is incomplete. Please return to seat selection.",
        "saveFail": "Unable to save booking details. Please try again.",
        "noBooking": "No booking data found. Please select a flight and seats first.",
        "missingCount": "Passenger count is missing. Please return to booking and try again.",
        "noSeats": "No seats selected. Please return to seat selection and choose seats.",
        "duplicateSeats": "Duplicate seats were found. Please return to seat selection and choose unique seats.",
    },
    "baggage": {"optionsAria": "Baggage options for {name}"},
    "meals": {"optionsAria": "Meal options for {name}"},
    "extras": {"noneSelected": "No extra services selected"},
    "profile": {
        "fieldRequired": "This field is required",
        "noSaved": "No saved passengers yet. Add one to speed up future bookings.",
        "completeFields": "Please complete the highlighted fields.",
        "saveFail": "Unable to save your profile right now.",
        "saved": "Your profile changes have been saved.",
        "editPassenger": "Edit Passenger",
        "addPassenger": "Add Passenger",
        "passengerUpdated": "Saved passenger profile updated.",
        "passengerRemoved": "Passenger removed from your saved profiles.",
    },
    "bookingDetails": {
        "noneSelected": "None selected",
        "cancelledNoChange": "Cancelled bookings cannot be changed.",
        "chooseDate": "Please choose a new flight date.",
        "enterSeats": "Please enter seat selections for your passengers.",
        "exactSeats": "Enter exactly {count} seats.",
        "saveFail": "Unable to save booking changes. Please try again.",
        "updated": "Booking updated successfully. {note}",
        "cancelFail": "Unable to cancel this booking. Please try again.",
        "cancelled": "Booking {pnr} has been cancelled.",
        "alreadyCancelled": "This booking is already cancelled.",
    },
    "admin": {
        "editPrefix": "Edit ",
        "addPrefix": "Add ",
        "noFlights": "No flights found.",
        "noRoutes": "No routes found.",
        "noSchedules": "No schedules found.",
        "noAircraft": "No aircraft found.",
        "noBookings": "No bookings found.",
        "noPassengers": "No passengers found.",
        "bookingCancelledMsg": "Booking {pnr} cancelled.",
    },
    "destinationDetails": {
        "noDepartures": "No scheduled departures at this time.",
        "discover": "Discover {name}",
        "flyTo": "Fly to {name}",
    },
    "manage": {"resultAria": "Booking result"},
}


def set_path(obj, path, value):
    parts = path.split(".")
    cur = obj
    for p in parts[:-1]:
        cur = cur.setdefault(p, {})
    cur[parts[-1]] = value


def ensure_helper(text: str) -> str:
    if "function tr(key" in text:
        return text
    m = re.search(r"\(function\s*\(\)\s*\{", text)
    if not m:
        return text
    return text[: m.end()] + HELPER + text[m.end() :]


def patch(name, pairs, lang_listener=None):
    path = JS / name
    text = path.read_text(encoding="utf-8")
    orig = text
    text = ensure_helper(text)
    for a, b in pairs:
        if a in text:
            text = text.replace(a, b)
        else:
            # try once more with normalized quotes
            pass
    if lang_listener and "aerova:languagechange" not in text:
        for marker in (
            'document.addEventListener("DOMContentLoaded", init);',
            "document.addEventListener('DOMContentLoaded', init);",
            'document.addEventListener("DOMContentLoaded", function () {',
        ):
            if marker in text:
                text = text.replace(
                    marker,
                    marker
                    + "\n    window.addEventListener(\"aerova:languagechange\", function () {\n"
                    + f"        {lang_listener}\n"
                    + "    });",
                    1,
                )
                break
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print("patched", name)
    else:
        print("unchanged", name)


def main():
    en = load_locale_obj(LOC / "en.js")
    az = load_locale_obj(LOC / "az.js")
    ru = load_locale_obj(LOC / "ru.js")

    en = deep_merge(en, EN_EXTRA)
    for path, val in flatten(EN_EXTRA).items():
        # ensure EN has it
        set_path(en, path, val)
    for path, val in AZ_FIX.items():
        set_path(az, path, val)
        # also ensure EN key exists via EN_EXTRA already
        if path not in flatten(en):
            # copy from EN_EXTRA structure
            pass
    for path, val in RU_FIX.items():
        set_path(ru, path, val)

    # For any EN key still equal in AZ (leftover English), leave if proper name; else already fixed above
    en_flat = flatten(en)
    az_flat = flatten(az)
    ru_flat = flatten(ru)

    # Ensure AZ/RU have every EN key (fill missing from EN then AZ_FIX/RU_FIX already applied)
    for k, v in en_flat.items():
        if k not in az_flat:
            set_path(az, k, AZ_FIX.get(k, v))
            print("az filled", k)
        if k not in ru_flat:
            set_path(ru, k, RU_FIX.get(k, v))
            print("ru filled", k)

    # Re-apply AZ/RU fixes after fill
    for path, val in AZ_FIX.items():
        set_path(az, path, val)
    for path, val in RU_FIX.items():
        set_path(ru, path, val)

    dump_locale("en", en)
    dump_locale("az", az)
    dump_locale("ru", ru)
    print("locales rewritten", len(flatten(en)), len(flatten(az)), len(flatten(ru)))

    # --- JS patches ---
    patch("booking.js", [
        ('segment.querySelector(".segment-name").textContent = "Flight " + number;',
         'segment.querySelector(".segment-name").textContent = tr("booking.flightN", "Flight " + number, { n: number });'),
        ('showMessage("Voice search is not supported in this browser. Please type your city.");',
         'showMessage(tr("booking.voiceUnsupported", "Voice search is not supported in this browser. Please type your city."));'),
        ('showMessage("Unable to capture voice input. Please try again.");',
         'showMessage(tr("booking.voiceCaptureFail", "Unable to capture voice input. Please try again."));'),
        ('showMessage("Unable to start voice search. Please try again.");',
         'showMessage(tr("booking.voiceStartFail", "Unable to start voice search. Please try again."));'),
        ('showMessage("Please select the number of passengers.");',
         'showMessage(tr("booking.needPassengers", "Please select the number of passengers."));'),
        ('showMessage("Please select a cabin class.");',
         'showMessage(tr("booking.needCabin", "Please select a cabin class."));'),
        ('showMessage("Please complete From, To and Departure Date for every flight.");',
         'showMessage(tr("booking.completeMulti", "Please complete From, To and Departure Date for every flight."));'),
        ('showMessage("Please enter a departure city or airport.");',
         'showMessage(tr("booking.needFrom", "Please enter a departure city or airport."));'),
        ('showMessage("Please enter a destination city or airport.");',
         'showMessage(tr("booking.needTo", "Please enter a destination city or airport."));'),
        ('showMessage("Please select a departure date.");',
         'showMessage(tr("booking.needDeparture", "Please select a departure date."));'),
        ('showMessage("Please select a return date.");',
         'showMessage(tr("booking.needReturn", "Please select a return date."));'),
        ('showMessage("Return date must be on or after the departure date.");',
         'showMessage(tr("booking.returnAfter", "Return date must be on or after the departure date."));'),
        ('calendarSubtitle.textContent = "Return fares for " + returnRouteLabel + ". Choose a return date on or after your departure.";',
         'calendarSubtitle.textContent = tr("booking.returnFares", "Return fares for " + returnRouteLabel + ". Choose a return date on or after your departure.", { route: returnRouteLabel });'),
        ('calendarSubtitle.textContent = "Departure fares for " + routeLabel + ". After you pick a departure date, select your return.";',
         'calendarSubtitle.textContent = tr("booking.depFaresRound", "Departure fares for " + routeLabel + ". After you pick a departure date, select your return.", { route: routeLabel });'),
        ('calendarSubtitle.textContent = "One-way starting fares for " + routeLabel + ". Click a date to set your departure date.";',
         'calendarSubtitle.textContent = tr("booking.oneWayFares", "One-way starting fares for " + routeLabel + ". Click a date to set your departure date.", { route: routeLabel });'),
        ('calendarNote.textContent = "Selected return " + returnDate + " from " + formatFare(returnPrice) + ".";',
         'calendarNote.textContent = tr("booking.selectedReturn", "Selected return " + returnDate + " from " + formatFare(returnPrice) + ".", { date: returnDate, price: formatFare(returnPrice) });'),
        ('calendarNote.textContent = "Select a departure date first, then choose your return.";',
         'calendarNote.textContent = tr("booking.selectDepFirst", "Select a departure date first, then choose your return.");'),
    ])

    # selected departure note may vary
    booking = (JS / "booking.js").read_text(encoding="utf-8")
    booking = ensure_helper(booking)
    booking2 = re.sub(
        r'calendarNote\.textContent = "Selected departure " \+ ([^;]+) \+ " from " \+ ([^;]+) \+ "\.";',
        r'calendarNote.textContent = tr("booking.selectedDep", "Selected departure " + \1 + " from " + \2 + ".", { date: \1, price: \2 });',
        booking,
        count=1,
    )
    if booking2 != booking:
        (JS / "booking.js").write_text(booking2, encoding="utf-8")
        print("patched booking selectedDep")

    patch("passenger-details.js", [
        ('option.textContent = message || "This field is required";',
         'option.textContent = message || tr("passengers.requiredField", "This field is required");'),
        ('showMessage("Booking data is incomplete. Please return to seat selection.");',
         'showMessage(tr("passengers.incompleteBooking", "Booking data is incomplete. Please return to seat selection."));'),
        ('showMessage("Unable to save booking details. Please try again.");',
         'showMessage(tr("passengers.saveFail", "Unable to save booking details. Please try again."));'),
        ('showMessage("No booking data found. Please select a flight and seats first.");',
         'showMessage(tr("passengers.noBooking", "No booking data found. Please select a flight and seats first."));'),
        ('showMessage("Passenger count is missing. Please return to booking and try again.");',
         'showMessage(tr("passengers.missingCount", "Passenger count is missing. Please return to booking and try again."));'),
        ('showMessage("No seats selected. Please return to seat selection and choose seats.");',
         'showMessage(tr("passengers.noSeats", "No seats selected. Please return to seat selection and choose seats."));'),
        ('showMessage("Duplicate seats were found. Please return to seat selection and choose unique seats.");',
         'showMessage(tr("passengers.duplicateSeats", "Duplicate seats were found. Please return to seat selection and choose unique seats."));'),
    ])

    patch("baggage-selection.js", [
        ("'Baggage options for ' + escapeHtml(passenger.name)",
         "tr('baggage.optionsAria', 'Baggage options for ' + passenger.name, { name: passenger.name })"),
        ('"Baggage options for " + escapeHtml(passenger.name)',
         'tr("baggage.optionsAria", "Baggage options for " + passenger.name, { name: passenger.name })'),
    ])

    patch("meal-selection.js", [
        ("'Meal options for ' + escapeHtml(passenger.name)",
         "tr('meals.optionsAria', 'Meal options for ' + passenger.name, { name: passenger.name })"),
        ('"Meal options for " + escapeHtml(passenger.name)',
         'tr("meals.optionsAria", "Meal options for " + passenger.name, { name: passenger.name })'),
    ])

    patch("extra-services.js", [
        ("'<li class=\"selected-services-empty\">No extra services selected</li>'",
         "'<li class=\"selected-services-empty\">' + tr(\"extras.noneSelected\", \"No extra services selected\") + '</li>'"),
    ], lang_listener="if (typeof renderSelectedServices === 'function') { try { renderSelectedServices(); } catch (e) {} } if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);")

    patch("profile.js", [
        ('option.textContent = message || "This field is required";',
         'option.textContent = message || tr("profile.fieldRequired", "This field is required");'),
        ("'<p class=\"saved-passengers-empty\">No saved passengers yet. Add one to speed up future bookings.</p>'",
         "'<p class=\"saved-passengers-empty\">' + tr(\"profile.noSaved\", \"No saved passengers yet. Add one to speed up future bookings.\") + '</p>'"),
        ('showMessage("Please complete the highlighted fields.");',
         'showMessage(tr("profile.completeFields", "Please complete the highlighted fields."));'),
        ('showMessage("Unable to save your profile right now.");',
         'showMessage(tr("profile.saveFail", "Unable to save your profile right now."));'),
        ('showMessage("Your profile changes have been saved.", true);',
         'showMessage(tr("profile.saved", "Your profile changes have been saved."), true);'),
        ('title.textContent = passenger ? "Edit Passenger" : "Add Passenger";',
         'title.textContent = passenger ? tr("profile.editPassenger", "Edit Passenger") : tr("profile.addPassenger", "Add Passenger");'),
        ('showMessage("Saved passenger profile updated.", true);',
         'showMessage(tr("profile.passengerUpdated", "Saved passenger profile updated."), true);'),
        ('showMessage("Passenger removed from your saved profiles.", true);',
         'showMessage(tr("profile.passengerRemoved", "Passenger removed from your saved profiles."), true);'),
    ], lang_listener="if (typeof renderSavedPassengers === 'function') { try { renderSavedPassengers(); } catch (e) {} } if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);")

    patch("booking-details.js", [
        ("'<li class=\"detail-list-empty\">None selected</li>'",
         "'<li class=\"detail-list-empty\">' + tr(\"bookingDetails.noneSelected\", \"None selected\") + '</li>'"),
        ('showMessage("Cancelled bookings cannot be changed.");',
         'showMessage(tr("bookingDetails.cancelledNoChange", "Cancelled bookings cannot be changed."));'),
        ('showMessage("Please choose a new flight date.");',
         'showMessage(tr("bookingDetails.chooseDate", "Please choose a new flight date."));'),
        ('showMessage("Please enter seat selections for your passengers.");',
         'showMessage(tr("bookingDetails.enterSeats", "Please enter seat selections for your passengers."));'),
        ('showMessage("Enter exactly " + passengerCount + " seat" + (passengerCount === 1 ? "" : "s") + ".");',
         'showMessage(tr("bookingDetails.exactSeats", "Enter exactly " + passengerCount + " seats.", { count: passengerCount }));'),
        ('showMessage("Unable to save booking changes. Please try again.");',
         'showMessage(tr("bookingDetails.saveFail", "Unable to save booking changes. Please try again."));'),
        ('showMessage("Booking updated successfully. " + differenceNote);',
         'showMessage(tr("bookingDetails.updated", "Booking updated successfully. " + differenceNote, { note: differenceNote }));'),
        ('showMessage("Unable to cancel this booking. Please try again.");',
         'showMessage(tr("bookingDetails.cancelFail", "Unable to cancel this booking. Please try again."));'),
        ('showMessage("Booking " + (activeBooking.pnr || "") + " has been cancelled.");',
         'showMessage(tr("bookingDetails.cancelled", "Booking " + (activeBooking.pnr || "") + " has been cancelled.", { pnr: activeBooking.pnr || "" }));'),
        ('showMessage("This booking is already cancelled.");',
         'showMessage(tr("bookingDetails.alreadyCancelled", "This booking is already cancelled."));'),
    ])

    patch("admin.js", [
        ('document.getElementById("entity-modal-title").textContent = (item ? "Edit " : "Add ") + config.title;',
         'document.getElementById("entity-modal-title").textContent = (item ? tr("admin.editPrefix", "Edit ") : tr("admin.addPrefix", "Add ")) + config.title;'),
        ("'<tr><td colspan=\"9\" class=\"admin-empty\">No flights found.</td></tr>'",
         "'<tr><td colspan=\"9\" class=\"admin-empty\">' + tr(\"admin.noFlights\", \"No flights found.\") + '</td></tr>'"),
        ("'<tr><td colspan=\"7\" class=\"admin-empty\">No routes found.</td></tr>'",
         "'<tr><td colspan=\"7\" class=\"admin-empty\">' + tr(\"admin.noRoutes\", \"No routes found.\") + '</td></tr>'"),
        ("'<tr><td colspan=\"8\" class=\"admin-empty\">No schedules found.</td></tr>'",
         "'<tr><td colspan=\"8\" class=\"admin-empty\">' + tr(\"admin.noSchedules\", \"No schedules found.\") + '</td></tr>'"),
        ("'<tr><td colspan=\"9\" class=\"admin-empty\">No aircraft found.</td></tr>'",
         "'<tr><td colspan=\"9\" class=\"admin-empty\">' + tr(\"admin.noAircraft\", \"No aircraft found.\") + '</td></tr>'"),
        ("'<tr><td colspan=\"10\" class=\"admin-empty\">No bookings found.</td></tr>'",
         "'<tr><td colspan=\"10\" class=\"admin-empty\">' + tr(\"admin.noBookings\", \"No bookings found.\") + '</td></tr>'"),
        ("'<tr><td colspan=\"9\" class=\"admin-empty\">No passengers found.</td></tr>'",
         "'<tr><td colspan=\"9\" class=\"admin-empty\">' + tr(\"admin.noPassengers\", \"No passengers found.\") + '</td></tr>'"),
        ('showMessage("Booking " + target.pnr + " cancelled.");',
         'showMessage(tr("admin.bookingCancelledMsg", "Booking " + target.pnr + " cancelled.", { pnr: target.pnr }));'),
    ], lang_listener="if (typeof renderActiveView === 'function') { try { renderActiveView(); } catch (e) {} } if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);")

    patch("destination-details.js", [
        ("'<p class=\"section-copy\">No scheduled departures at this time.</p>'",
         "'<p class=\"section-copy\">' + tr(\"destinationDetails.noDepartures\", \"No scheduled departures at this time.\") + '</p>'"),
        ('aboutTitle.textContent = "Discover " + destination.name;',
         'aboutTitle.textContent = tr("destinationDetails.discover", "Discover " + destination.name, { name: destination.name });'),
        ('asideTitle.textContent = "Fly to " + destination.name;',
         'asideTitle.textContent = tr("destinationDetails.flyTo", "Fly to " + destination.name, { name: destination.name });'),
    ])

    patch("manage-booking.js", [
        ("'Booking result'",
         "tr('manage.resultAria', 'Booking result')"),
        ('"Booking result"',
         'tr("manage.resultAria", "Booking result")'),
    ])

    # seat ofSelected if used
    seat = (JS / "seat-selection.js").read_text(encoding="utf-8")
    if "of {total}" in seat or "seats selected" in seat.lower():
        seat2 = seat
        seat2 = seat2.replace(
            'selectedSeats.length + " of " + requiredSeats + " seats selected"',
            'tr("seats.ofSelected", selectedSeats.length + " of " + requiredSeats + " seats selected", { selected: selectedSeats.length, total: requiredSeats })',
        )
        if seat2 != seat:
            (JS / "seat-selection.js").write_text(seat2, encoding="utf-8")
            print("patched seat ofSelected")

    print("done")


if __name__ == "__main__":
    main()
