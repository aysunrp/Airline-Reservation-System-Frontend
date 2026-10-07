# -*- coding: utf-8 -*-
"""Patch major JS files to use window.t for user-visible strings."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "assets" / "js"

HELPER = """
    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return fallback;
    }
"""


def ensure_helper(text: str) -> str:
    if "function tr(key" in text:
        return text
    # insert after IIFE open
    return re.sub(r"(\(function\s*\(\)\s*\{)", r"\1" + HELPER, text, count=1)


def patch_file(name: str, replacements: list[tuple[str, str]], add_lang_listener: str | None = None) -> None:
    path = JS / name
    text = path.read_text(encoding="utf-8")
    orig = text
    text = ensure_helper(text)
    for a, b in replacements:
        if a in text:
            text = text.replace(a, b)
    if add_lang_listener and add_lang_listener not in text:
        # append before final init closing if possible
        text = text.replace(
            "document.addEventListener(\"DOMContentLoaded\", init);",
            "document.addEventListener(\"DOMContentLoaded\", init);\n"
            "    window.addEventListener(\"aerova:languagechange\", function () {\n"
            f"        {add_lang_listener}\n"
            "    });",
            1,
        )
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print("patched", name)
    else:
        print("no change", name)


# --- seat-selection.js ---
patch_file("seat-selection.js", [
    ('label: "Business Class"', 'label: "Business Class", labelKey: "seats.businessClass"'),
    ('label: "Comfort"', 'label: "Comfort", labelKey: "common.comfort"'),
    ('label: "Economy"', 'label: "Economy", labelKey: "common.economy"'),
    ('return "Date not selected";', 'return tr("seats.dateNotSelected", "Date not selected");'),
    ('var seatsLabel = selectedSeats.length === 1 ? "Selected Seat" : "Selected Seats";',
     'var seatsLabel = selectedSeats.length === 1 ? tr("seats.selectedSeat", "Selected Seat") : tr("seats.selectedSeats", "Selected Seats");'),
    ('selectedSeats.length ? selectedSeats.join(", ") : (typeof t === "function" ? t("seats.noSeat") : "No seat selected")',
     'selectedSeats.length ? selectedSeats.join(", ") : tr("seats.noSeat", "No seat selected")'),
    ('setText("selected-seat-price", "Included");', 'setText("selected-seat-price", tr("seats.priceIncluded", "Included"));'),
    ('button.setAttribute("aria-label", "Seat " + seatId + " occupied");',
     'button.setAttribute("aria-label", tr("seats.seatOccupiedAria", "Seat " + seatId + " occupied", { id: seatId }));'),
    ('button.setAttribute("aria-label", "Seat " + seatId);',
     'button.setAttribute("aria-label", tr("seats.seatAria", "Seat " + seatId, { id: seatId }));'),
    ('? (typeof t === "function" ? t("seats.validation") : "Please select a seat to continue.")\n'
     '                : (typeof t === "function" ? t("seats.validation") : ("Please select " + requiredSeats + " seats to continue."));',
     '? tr("seats.validation", "Please select a seat to continue.")\n'
     '                : tr("seats.selectN", "Please select " + requiredSeats + " seats to continue.", { count: requiredSeats });'),
    ('? "Please select 1 more seat."\n'
     '            : "Please select " + remaining + " more seats.";',
     '? tr("seats.selectOneMore", "Please select 1 more seat.")\n'
     '            : tr("seats.selectMore", "Please select " + remaining + " more seats.", { count: remaining });'),
], add_lang_listener="if (typeof refreshSummary === 'function') { /* noop */ } if (typeof renderSeatMap === 'function') { try { init(); } catch (e) {} }")

# --- payment.js ---
patch_file("payment.js", [
    ('return "Apple Pay";', 'return tr("payment.applePayLabel", "Apple Pay");'),
    ('return "Google Pay";', 'return tr("payment.googlePayLabel", "Google Pay");'),
    ('return "Credit / Debit Card";', 'return tr("payment.cardLabel", "Credit / Debit Card");'),
    ('showPromoError("Booking not found");', 'showPromoError(tr("payment.bookingNotFound", "Booking not found"));'),
    ('showPromoError("Enter a promo code");', 'showPromoError(tr("payment.enterPromo", "Enter a promo code"));'),
    ('showPromoError("Promo code already applied");', 'showPromoError(tr("payment.promoAlready", "Promo code already applied"));'),
    ('showPromoError("Remove the current code first");', 'showPromoError(tr("payment.removeCodeFirst", "Remove the current code first"));'),
    ('showPromoError("Unable to save promo code");', 'showPromoError(tr("payment.promoSaveFail", "Unable to save promo code"));'),
    ('input.setAttribute("placeholder", message || "This field is required");',
     'input.setAttribute("placeholder", message || tr("payment.fieldRequired", "This field is required"));'),
    ('markInvalid(cardholderInput, "Enter cardholder name");',
     'markInvalid(cardholderInput, tr("payment.cardholder", "Enter cardholder name"));'),
    ('markInvalid(cardNumberInput, "Enter card number");',
     'markInvalid(cardNumberInput, tr("payment.enterCard", "Enter card number"));'),
    ('markInvalid(cardNumberInput, "Enter a valid card number");',
     'markInvalid(cardNumberInput, tr("payment.validCard", "Enter a valid card number"));'),
    ('markInvalid(expiryInput, "Enter expiry date");',
     'markInvalid(expiryInput, tr("payment.enterExpiry", "Enter expiry date"));'),
    ('markInvalid(expiryInput, "Enter a valid expiry date");',
     'markInvalid(expiryInput, tr("payment.validExpiry", "Enter a valid expiry date"));'),
    ('markInvalid(cvvInput, "Enter CVV");',
     'markInvalid(cvvInput, tr("payment.enterCvv", "Enter CVV"));'),
    ('markInvalid(cvvInput, "Enter a valid CVV");',
     'markInvalid(cvvInput, tr("payment.validCvv", "Enter a valid CVV"));'),
], add_lang_listener="if (typeof updatePaymentSummary === 'function') { try { updatePaymentSummary(); } catch (e) {} } if (typeof updateWalletMethodMessage === 'function') { try { updateWalletMethodMessage(); } catch (e) {} } if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);")

# --- notifications.js ---
patch_file("notifications.js", [
    ('"Booking Cancelled"', 'tr("notifications.cancelledTitle", "Booking Cancelled")'),
    ('"Reservation " + pnr + " for " + route + " has been cancelled."',
     'tr("notifications.cancelledBody", "Reservation " + pnr + " for " + route + " has been cancelled.", { pnr: pnr, route: route })'),
    ('"Booking Confirmed"', 'tr("notifications.confirmedTitle", "Booking Confirmed")'),
    ('"Your AEROVA reservation " + pnr + " for " + route + " is confirmed."',
     'tr("notifications.confirmedBody", "Your AEROVA reservation " + pnr + " for " + route + " is confirmed.", { pnr: pnr, route: route })'),
    ('"Payment Successful"', 'tr("notifications.paymentTitle", "Payment Successful")'),
    ('"Payment of " + formatPrice(booking.totalPrice) + " was received successfully for booking " + pnr + "."',
     'tr("notifications.paymentBody", "Payment of " + formatPrice(booking.totalPrice) + " was received successfully for booking " + pnr + ".", { amount: formatPrice(booking.totalPrice), pnr: pnr })'),
    ('"Flight Update"', 'tr("notifications.flightUpdateTitle", "Flight Update")'),
    ('"Check-in Reminder"', 'tr("notifications.checkinTitle", "Check-in Reminder")'),
    ('(isUnread ? "Unread" : "Read")', '(isUnread ? tr("common.unread", "Unread") : tr("common.read", "Read"))'),
    ('showMessage("Notification marked as read.");', 'showMessage(tr("notifications.markedRead", "Notification marked as read."));'),
    ('showMessage("There are no notifications to update.");', 'showMessage(tr("notifications.noneToUpdate", "There are no notifications to update."));'),
    ('showMessage("All notifications are already read.");', 'showMessage(tr("notifications.allAlreadyRead", "All notifications are already read."));'),
    ('showMessage("All notifications marked as read.");', 'showMessage(tr("notifications.allMarkedRead", "All notifications marked as read."));'),
    ('showMessage("There are no notifications to clear.");', 'showMessage(tr("notifications.noneToClear", "There are no notifications to clear."));'),
    ('showMessage("All notifications have been cleared.");', 'showMessage(tr("notifications.allCleared", "All notifications have been cleared."));'),
    ('toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");',
     'toggle.setAttribute("aria-label", open ? tr("nav.closeMenu", "Close menu") : tr("nav.openMenu", "Open menu"));'),
], add_lang_listener="if (typeof renderNotifications === 'function') { try { renderNotifications(); } catch (e) {} } if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);")

# --- home.js ---
patch_file("home.js", [
    ('toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");',
     'toggle.setAttribute("aria-label", open ? (typeof t === "function" ? t("nav.closeMenu") : "Close menu") : (typeof t === "function" ? t("nav.openMenu") : "Open menu"));'),
    ('micButton.setAttribute("aria-label", isListening ? "Stop voice search" : "Start voice search");',
     'micButton.setAttribute("aria-label", isListening ? (typeof t === "function" ? t("home.voiceStop") : "Stop voice search") : (typeof t === "function" ? t("home.voiceStart") : "Start voice search"));'),
    ('showMessage("Voice search is not supported in this browser. Please type your request.");',
     'showMessage(typeof t === "function" ? t("home.voiceUnsupported") : "Voice search is not supported in this browser. Please type your request.");'),
    ('showMessage("Unable to capture voice input. Please try again or type your request.");',
     'showMessage(typeof t === "function" ? t("home.voiceCaptureFail") : "Unable to capture voice input. Please try again or type your request.");'),
    ('showMessage("Unable to start voice search. Please try again or type your request.");',
     'showMessage(typeof t === "function" ? t("home.voiceStartFail") : "Unable to start voice search. Please try again or type your request.");'),
    ('showMessage("Please say or type where you would like to fly.");',
     'showMessage(typeof t === "function" ? t("home.voiceEmpty") : "Please say or type where you would like to fly.");'),
    ('showMessage("Please provide your origin.");',
     'showMessage(typeof t === "function" ? t("home.voiceNeedFrom") : "Please provide your origin.");'),
    ('showMessage("Please provide your destination.");',
     'showMessage(typeof t === "function" ? t("home.voiceNeedTo") : "Please provide your destination.");'),
])

print("JS patch pass complete")
