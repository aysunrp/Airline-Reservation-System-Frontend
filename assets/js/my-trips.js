/*
 * My Trips: the signed-in user's bookings from GET api/bookings/my. Needs api-client.js, airports.js and auth.js.
 * Only trips that were paid are listed: a booking still waiting for payment, an expired hold, or a hold that was
 * cancelled before any payment (refund status null) is checkout, not a trip.
 */
(function () {
    "use strict";

    var loadToken = 0;
    var state = { trips: [], airports: [] };

    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return typeof vars === "object" && vars
            ? String(fallback).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? String(vars[k]) : "{" + k + "}"; })
            : fallback;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatPrice(amount) {
        var value = Number(amount);
        return "$" + (isFinite(value) ? value : 0).toFixed(2);
    }

    function formatDisplayDate(dateValue) {
        var parts = String(dateValue || "").split("-");
        if (parts.length !== 3) {
            return "—";
        }
        return parts[2].padStart(2, "0") + "." + parts[1].padStart(2, "0") + "." + parts[0];
    }

    function durationLabel(minutes) {
        return Math.floor(minutes / 60) + "h " + (minutes % 60 < 10 ? "0" : "") + (minutes % 60) + "m";
    }

    function isTrip(booking) {
        if (booking.status === "Confirmed" || booking.status === "Completed") {
            return true;
        }
        return booking.status === "Cancelled" && booking.refundStatus != null;
    }

    function refundKey(status) {
        var value = String(status || "").toLowerCase().replace(/[^a-z]/g, "");
        var keys = { processing: "processing", completed: "completed", noteligible: "notEligible", failed: "failed", cancelled: "cancelled", canceled: "cancelled" };
        return keys[value] || "pending";
    }

    /* The demo tag is only for the pretend provider; a refund at Stripe is real, and one that went wrong points to support. */
    function buildRefundMarkup(status, demo, amount, currency) {
        var key = refundKey(status);
        var value = Number(amount);
        var shown = key !== "notEligible" && isFinite(value) && value > 0;
        var fallback = { pending: "Pending", processing: "Processing", completed: "Completed", notEligible: "Uyğun deyil", failed: "Failed", cancelled: "Cancelled" }[key];
        var problem = key === "failed" || key === "cancelled";

        return (
            '<p class="trip-card-refund">' +
                '<span class="trip-card-refund-label">' + escapeHtml(tr("cancellation.refundStatus", "Geri ödəniş statusu")) + "</span>" +
                '<span class="trip-card-refund-status trip-card-refund-status--' + key + '">' + escapeHtml(tr("cancellation.status." + key, fallback)) + "</span>" +
                (shown ? '<span class="trip-card-refund-amount">' + escapeHtml(value.toFixed(2) + " " + String(currency || "USD").toUpperCase()) + "</span>" : "") +
                (demo ? '<span class="trip-card-refund-demo">' + escapeHtml(tr("cancellation.demoTag", "Demo")) + "</span>" : "") +
                (problem ? '<span class="trip-card-refund-note">' + escapeHtml(tr("cancellation.tripNoteFailed", "AEROVA dəstəyinə müraciət edin")) + "</span>" : "") +
            "</p>"
        );
    }

    function statusLabel(status) {
        if (status === "Cancelled") return tr("common.statusCancelled", "Ləğv edilib");
        if (status === "Completed") return tr("api.trips.statusCompleted", "Tamamlandı");
        return tr("common.statusConfirmed", "Təsdiqlənib");
    }

    /* A booking summary from the API, with times shown at each airport. */
    function toCard(booking) {
        var directory = window.AEROVA_AIRPORTS;
        var leg = booking.legs[0];
        var origin = directory.find(state.airports, leg.originCode);
        var destination = directory.find(state.airports, leg.destinationCode);
        var departure = directory.localTime(leg.departureAt, origin.timeZoneId);
        var arrival = directory.localTime(leg.arrivalAt, destination.timeZoneId);

        return {
            booking: booking,
            departsAt: window.AEROVA_BOOKING.parseUtc(leg.departureAt).getTime(),
            route: leg.originCity + " → " + leg.destinationCity,
            flightNumber: leg.flightNumber,
            date: departure.date,
            departure: departure.time,
            arrival: arrival.time,
            duration: durationLabel(arrival.utcMinutes - departure.utcMinutes),
            aircraft: "AEROVA " + leg.aircraftModel,
            seats: booking.legs.map(function (item) { return item.seats.join(", "); }).filter(Boolean).join(" | ") || "—",
            multiCity: booking.tripType === "MultiCity",
            extraFlights: booking.legs.slice(1).map(function (item) {
                return { flight: item.flightNumber, route: item.originCity + " \u2192 " + item.destinationCity };
            })
        };
    }

    function buildTripCard(card) {
        var booking = card.booking;
        var cancelled = booking.status === "Cancelled";

        function meta(label, value) {
            return '<div class="trip-card-meta-item"><dt>' + label + "</dt><dd>" + escapeHtml(value) + "</dd></div>";
        }

        return (
            '<article class="trip-card">' +
                '<div class="trip-card-top">' +
                    '<div class="trip-card-identity">' +
                        '<p class="trip-card-airline">AEROVA</p>' +
                        '<h2 class="trip-card-route">' + escapeHtml(card.route) + "</h2>" +
                        '<p class="trip-card-flight">' + escapeHtml(tr("trips.flightLabel", "Uçuş {number}", { number: card.flightNumber })) + "</p>" +
                        card.extraFlights.map(function (other, index) {
                            return '<p class="trip-card-flight">' + escapeHtml(card.multiCity
                                ? tr("api.journey.tripLegLine", "Reys {n}: {flight}, {route}", { n: index + 2, flight: other.flight, route: other.route })
                                : tr("api.journey.returnTripLine", "Qayıdış {flight}, {route}", { flight: other.flight, route: other.route })) + "</p>";
                        }).join("") +
                    "</div>" +
                    '<div class="trip-card-status ' + (cancelled ? "trip-card-status--cancelled" : "trip-card-status--confirmed") + '">' + escapeHtml(statusLabel(booking.status)) + "</div>" +
                "</div>" +
                '<dl class="trip-card-meta">' +
                    meta(tr("trips.bookingReference", "Bron istinadı"), booking.pnr) +
                    meta(tr("trips.flightDate", "Uçuş tarixi"), formatDisplayDate(card.date)) +
                    meta(tr("trips.departure", "Gediş"), card.departure) +
                    meta(tr("trips.arrival", "Gəliş"), card.arrival) +
                    meta(tr("trips.duration", "Müddət"), card.duration) +
                    meta(tr("trips.aircraft", "Təyyarə"), card.aircraft) +
                    meta(tr("trips.cabinClass", "Salon sinfi"), booking.legs[0].cabinClass) +
                    meta(tr("trips.passengerCount", "Sərnişin sayı"), String(booking.passengerCount)) +
                    meta(tr("trips.selectedSeats", "Seçilmiş oturacaqlar"), card.seats) +
                "</dl>" +
                (cancelled ? buildRefundMarkup(booking.refundStatus, booking.refundIsDemo, booking.refundAmount, booking.refundCurrency) : "") +
                '<div class="trip-card-footer">' +
                    '<div class="trip-card-price">' +
                        '<p class="trip-card-price-label">' + tr("trips.total", "Cəmi") + "</p>" +
                        '<p class="trip-card-price-value">' + escapeHtml(formatPrice(booking.totalAmount)) + "</p>" +
                    "</div>" +
                    '<a class="trip-card-button" href="booking-details.html?pnr=' + encodeURIComponent(booking.pnr) + '">' + tr("trips.viewDetails", "Ətraflı bax") + "</a>" +
                "</div>" +
            "</article>"
        );
    }

    function ensurePastTripsList() {
        var pastPanel = document.querySelector(".trips-panel--past");
        var existing = document.getElementById("past-trips-list");

        if (existing || !pastPanel) {
            return existing;
        }

        var list = document.createElement("div");
        list.className = "trips-list";
        list.id = "past-trips-list";

        var emptyState = document.getElementById("past-trips-empty");
        if (emptyState) {
            pastPanel.insertBefore(list, emptyState);
        } else {
            pastPanel.appendChild(list);
        }

        return list;
    }

    function setHidden(id, hidden) {
        var element = document.getElementById(id);
        if (element) {
            element.hidden = hidden;
        }
    }

    function showStatus(kind, title, text, actions) {
        var panel = document.getElementById("trips-status");
        var tabs = document.querySelector(".trips-tabs");
        var buttons = document.getElementById("trips-status-actions");

        document.getElementById("trips-status-title").textContent = title;
        document.getElementById("trips-status-text").textContent = text;
        panel.setAttribute("role", kind === "error" ? "alert" : "status");
        buttons.innerHTML = "";

        (actions || []).forEach(function (action) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "trip-card-button";
            button.textContent = action.label;
            button.addEventListener("click", action.onClick);
            buttons.appendChild(button);
        });

        panel.hidden = false;
        if (tabs) {
            tabs.hidden = true;
        }
    }

    function render() {
        var now = Date.now();
        var cards = state.trips.filter(isTrip).map(toCard);
        var upcoming = cards.filter(function (card) { return card.departsAt >= now && card.booking.status !== "Completed"; })
            .sort(function (a, b) { return a.departsAt - b.departsAt; });
        var past = cards.filter(function (card) { return upcoming.indexOf(card) === -1; })
            .sort(function (a, b) { return b.departsAt - a.departsAt; });

        var upcomingList = document.getElementById("upcoming-trips-list");
        var pastList = ensurePastTripsList();

        if (upcomingList) {
            upcomingList.innerHTML = upcoming.map(buildTripCard).join("");
        }
        if (pastList) {
            pastList.innerHTML = past.map(buildTripCard).join("");
        }

        setHidden("upcoming-trips-empty", upcoming.length > 0);
        setHidden("past-trips-empty", past.length > 0);
        setHidden("trips-status", true);

        var tabs = document.querySelector(".trips-tabs");
        if (tabs) {
            tabs.hidden = false;
        }
    }

    function load() {
        var token = ++loadToken;

        showStatus("loading", tr("api.trips.loadingTitle", "Səyahətləriniz yüklənir"), tr("api.trips.loadingText", "Zəhmət olmasa bir az gözləyin."), []);

        Promise.all([window.AEROVA_AIRPORTS.load(), window.AEROVA_API.get("api/bookings/my")]).then(function (results) {
            if (token !== loadToken) {
                return;
            }
            state.airports = results[0];
            state.trips = results[1] || [];
            render();
        }).catch(function (error) {
            if (token !== loadToken) {
                return;
            }

            var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;
            if (!isApiError && window.console) {
                window.console.error(error);
            }

            // A rejected token already sent the visitor to the sign-in page (auth.js).
            showStatus("error", tr("api.trips.errorTitle", "Səyahətlərinizi yükləmək mümkün olmadı"), isApiError ? error.userMessage : tr("api.errors.generic", "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin."), [
                { label: tr("api.options.retry", "Yenidən cəhd et"), onClick: load }
            ]);
        });
    }

    document.addEventListener("DOMContentLoaded", load);
})();
