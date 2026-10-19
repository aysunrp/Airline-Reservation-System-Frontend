(function () {
    "use strict";

    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    function getParams() {
        return new URLSearchParams(window.location.search);
    }

    function formatDisplayDate(value) {
        if (!value) {
            return "—";
        }

        var parts = String(value).split("-");
        if (parts.length !== 3) {
            return String(value);
        }

        var year = Number(parts[0]);
        var month = Number(parts[1]);
        var day = Number(parts[2]);

        if (!year || !month || !day || month < 1 || month > 12) {
            return String(value);
        }

        return day + " " + MONTH_NAMES[month - 1] + " " + year;
    }

    function readSearchCriteria() {
        try {
            var raw = sessionStorage.getItem("aerovaBookingSearch");
            if (!raw) {
                return {};
            }
            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function setText(selector, value) {
        var el = document.querySelector(selector);
        if (el && value) {
            el.textContent = value;
        }
    }

    function tr(key, vars, fallback) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) {
                return value;
            }
        }
        return fallback || key;
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function currentLocale() {
        var lang = window.AEROVA_I18N && typeof window.AEROVA_I18N.getLanguage === "function"
            ? window.AEROVA_I18N.getLanguage()
            : "en";
        return { az: "az-Latn-AZ", ru: "ru-RU" }[lang] || "en-GB";
    }

    function formatDuration(totalMinutes) {
        var hours = Math.floor(totalMinutes / 60);
        var minutes = totalMinutes % 60;
        if (!hours) {
            return tr("journey.m", { m: minutes }, minutes + "m");
        }
        if (!minutes) {
            return tr("journey.h", { h: hours }, hours + "h");
        }
        return tr("journey.hm", { h: hours, m: minutes }, hours + "h " + minutes + "m");
    }

    function parseISO(value) {
        var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
        if (!match) {
            return null;
        }
        return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
    }

    function parseClock(value) {
        var match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
        if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
            return null;
        }
        return Number(match[1]) * 60 + Number(match[2]);
    }

    /* Absolute minutes (UTC) of a local date + time at an airport with the given offset. */
    function toUtcMinutes(dateValue, timeValue, utcOffset) {
        var date = parseISO(dateValue);
        var clock = parseClock(timeValue);
        if (!date || clock === null || typeof utcOffset !== "number") {
            return null;
        }
        return Date.UTC(date.y, date.m - 1, date.d) / 60000 + clock - utcOffset;
    }

    function formatShortDate(value) {
        var date = parseISO(value);
        if (!date) {
            return "";
        }
        try {
            return new Intl.DateTimeFormat(currentLocale(), {
                weekday: "short",
                day: "numeric",
                month: "short",
                timeZone: "UTC"
            }).format(new Date(Date.UTC(date.y, date.m - 1, date.d)));
        } catch (error) {
            return formatDisplayDate(value);
        }
    }

    function dayDifference(fromDate, toDate) {
        var a = parseISO(fromDate);
        var b = parseISO(toDate);
        if (!a || !b) {
            return 0;
        }
        return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
    }

    function sameText(a, b) {
        return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
    }

    /*
     * Only accept an itinerary whose times all agree: each segment duration
     * matches its departure/arrival, connections happen at the same airport
     * with a positive layover, and the ends match the flight's own data.
     */
    function validateSegments(segments, flight) {
        if (!segments || !segments.length) {
            return false;
        }

        var total = 0;

        for (var i = 0; i < segments.length; i += 1) {
            var segment = segments[i];
            if (!segment || !segment.from || !segment.to || !segment.from.code || !segment.to.code) {
                return false;
            }

            var dep = toUtcMinutes(segment.departureDate, segment.departureTime, segment.departureUtcOffset);
            var arr = toUtcMinutes(segment.arrivalDate, segment.arrivalTime, segment.arrivalUtcOffset);
            if (dep === null || arr === null || arr - dep !== segment.durationMinutes || segment.durationMinutes <= 0) {
                return false;
            }

            total += segment.durationMinutes;

            if (i > 0) {
                var previous = segments[i - 1];
                var previousArrival = toUtcMinutes(previous.arrivalDate, previous.arrivalTime, previous.arrivalUtcOffset);
                if (previous.to.code !== segment.from.code || dep - previousArrival <= 0) {
                    return false;
                }
                total += dep - previousArrival;
            }
        }

        var first = segments[0];
        var last = segments[segments.length - 1];

        if (first.departureTime !== flight.departure || last.arrivalTime !== flight.arrival) {
            return false;
        }
        if (!sameText(first.from.city, flight.from) || !sameText(last.to.city, flight.to)) {
            return false;
        }
        if (flight.departureDate && first.departureDate !== flight.departureDate) {
            return false;
        }
        if (typeof flight.stopsCount === "number" && flight.stopsCount !== segments.length - 1) {
            return false;
        }
        if (typeof flight.durationMinutes === "number" && flight.durationMinutes !== total) {
            return false;
        }

        return true;
    }

    /* Query params from View Details first; otherwise the stored selected flight. */
    /* The backend id of the flight to show: View Details puts it in the link. */
    function readFlightId() {
        var id = Number(getParams().get("flightId"));
        return id > 0 && Math.floor(id) === id ? id : 0;
    }

    /* Search context: the link from the results page first, the stored search otherwise. */
    function readContext() {
        var params = getParams();
        var stored = readSearchCriteria();

        function pick(name) {
            return params.get(name) || stored[name] || "";
        }

        return {
            passengers: pick("passengers") || "1",
            tripType: pick("tripType") || "oneway",
            returnDate: pick("returnDate"),
            departureDate: pick("departureDate")
        };
    }

    /* The page flight from flights-api.js, with the names this page uses. */
    function toDetailsFlight(page) {
        var flight = {
            id: page.id,
            flightNumber: page.flightNumber,
            from: page.from,
            to: page.to,
            fromCode: page.fromCode,
            toCode: page.toCode,
            departureDate: page.date,
            arrivalDate: page.arrivalDate,
            departure: page.departure,
            arrival: page.arrival,
            duration: page.duration,
            durationMinutes: page.durationMinutes,
            stopsLabel: page.stops,
            stopsCount: page.stopsCount,
            aircraft: page.aircraft,
            segments: page.segments,
            cabinPrices: page.cabinPrices
        };

        if (!validateSegments(flight.segments, flight)) {
            flight.segments = null;
        }

        return flight;
    }

    function stopsText(count) {
        if (count === 0) {
            return tr("results.nonstop", null, "Non-stop");
        }
        if (count === 1) {
            return tr("results.oneStop", null, "1 Stop");
        }
        if (typeof count === "number") {
            return tr("results.stopsCount", { count: count }, count + " Stops");
        }
        return "—";
    }

    function nextDayMarker(baseDate, date) {
        var days = dayDifference(baseDate, date);
        return days > 0
            ? ' <span class="journey-next-day">' + escapeHtml(tr("journey.nextDay", { days: days }, "+" + days)) + "</span>"
            : "";
    }

    function pointMarkup(kind, label, time, dateText, airport, extraHtml) {
        return '<li class="journey-stop journey-stop--' + kind + '">' +
            '<span class="journey-marker" aria-hidden="true"></span>' +
            '<div class="journey-stop-body">' +
                '<p class="journey-label">' + escapeHtml(label) + "</p>" +
                (time ? '<p class="journey-time">' + time + "</p>" : "") +
                (dateText ? '<p class="journey-date">' + escapeHtml(dateText) + "</p>" : "") +
                '<p class="journey-place"><span class="journey-code">' + escapeHtml(airport.code || "—") + "</span> " + escapeHtml(airport.city || "") + "</p>" +
                (airport.name ? '<p class="journey-airport">' + escapeHtml(airport.name) + "</p>" : "") +
                (extraHtml || "") +
            "</div>" +
        "</li>";
    }

    function legMarkup(text, modifier) {
        return '<li class="journey-leg' + (modifier ? " journey-leg--" + modifier : "") + '">' +
            '<span class="journey-leg-line" aria-hidden="true"></span>' +
            '<span class="journey-leg-label">' + escapeHtml(text) + "</span>" +
        "</li>";
    }

    function buildJourneyMarkup(flight) {
        var segments = flight.segments;
        var items = [];
        var footer = "";

        if (segments) {
            var first = segments[0];
            var last = segments[segments.length - 1];
            var baseDate = first.departureDate;
            var total = toUtcMinutes(last.arrivalDate, last.arrivalTime, last.arrivalUtcOffset) -
                toUtcMinutes(first.departureDate, first.departureTime, first.departureUtcOffset);

            items.push(pointMarkup("departure", tr("journey.departure", null, "Departure"),
                escapeHtml(first.departureTime), formatShortDate(first.departureDate), first.from));

            segments.forEach(function (segment, index) {
                if (index > 0) {
                    var previous = segments[index - 1];
                    var layover = toUtcMinutes(segment.departureDate, segment.departureTime, segment.departureUtcOffset) -
                        toUtcMinutes(previous.arrivalDate, previous.arrivalTime, previous.arrivalUtcOffset);
                    var stopDetails =
                        '<dl class="journey-connection">' +
                            '<div><dt>' + escapeHtml(tr("journey.arrives", null, "Arrives")) + "</dt><dd>" + escapeHtml(previous.arrivalTime) + nextDayMarker(baseDate, previous.arrivalDate) + "</dd></div>" +
                            '<div class="journey-layover"><dt class="visually-hidden">' + escapeHtml(tr("journey.stopover", null, "Stopover")) + "</dt><dd>" + escapeHtml(tr("journey.layover", { duration: formatDuration(layover) }, formatDuration(layover) + " layover")) + "</dd></div>" +
                            '<div><dt>' + escapeHtml(tr("journey.departs", null, "Departs")) + "</dt><dd>" + escapeHtml(segment.departureTime) + nextDayMarker(baseDate, segment.departureDate) + "</dd></div>" +
                        "</dl>";
                    items.push(pointMarkup("stopover", tr("journey.stopover", null, "Stopover"), "", "", segment.from, stopDetails));
                }
                items.push(legMarkup(tr("journey.flight", { duration: formatDuration(segment.durationMinutes) }, formatDuration(segment.durationMinutes))));
            });

            items.push(pointMarkup("arrival", tr("journey.arrival", null, "Arrival"),
                escapeHtml(last.arrivalTime) + nextDayMarker(baseDate, last.arrivalDate), formatShortDate(last.arrivalDate), last.to));

            footer =
                '<div class="journey-footer">' +
                    '<p class="journey-total"><span>' + escapeHtml(tr("journey.total", null, "Total journey time")) + "</span> " + escapeHtml(formatDuration(total)) + "</p>" +
                    (segments.length === 1 ? '<p class="journey-direct">' + escapeHtml(tr("journey.direct", null, "Direct flight")) + "</p>" : "") +
                    '<p class="journey-note">' + escapeHtml(tr("journey.localNote", null, "All times are local.")) + "</p>" +
                "</div>";
        } else {
            var origin = { code: flight.fromCode, city: flight.from };
            var destination = { code: flight.toCode, city: flight.to };
            var arrivalDate = flight.arrivalDate || "";

            items.push(pointMarkup("departure", tr("journey.departure", null, "Departure"),
                escapeHtml(flight.departure), formatShortDate(flight.departureDate), origin));

            if (flight.stopsCount === 0) {
                items.push(legMarkup(flight.durationMinutes ? tr("journey.flight", { duration: formatDuration(flight.durationMinutes) }, flight.duration) : tr("journey.direct", null, "Direct flight")));
            } else {
                items.push(
                    '<li class="journey-unavailable" role="note">' +
                        '<p class="journey-unavailable-title">' + escapeHtml(tr("journey.unavailable", null, "Stopover details unavailable")) + "</p>" +
                        '<p class="journey-unavailable-text">' + escapeHtml(tr("journey.unavailableText", null, "")) + "</p>" +
                    "</li>"
                );
            }

            items.push(pointMarkup("arrival", tr("journey.arrival", null, "Arrival"),
                escapeHtml(flight.arrival) + (arrivalDate ? nextDayMarker(flight.departureDate, arrivalDate) : ""),
                formatShortDate(arrivalDate), destination));

            footer =
                '<div class="journey-footer">' +
                    (flight.stopsCount === 0 ? '<p class="journey-direct">' + escapeHtml(tr("journey.direct", null, "Direct flight")) + "</p>" : "") +
                    '<p class="journey-note">' + escapeHtml(tr("journey.localNote", null, "All times are local.")) + "</p>" +
                "</div>";
        }

        var modifier = segments ? " journey-timeline--stops-" + Math.min(segments.length - 1, 3) : " journey-timeline--summary";
        return '<ol class="journey-timeline' + modifier + '">' + items.join("") + "</ol>" + footer;
    }

    function renderFlight(flight) {
        var fromCode = flight.fromCode;
        var toCode = flight.toCode;
        var routeLabel = flight.from + " (" + fromCode + ") → " + flight.to + " (" + toCode + ")";

        setText("#flight-summary-title", flight.flightNumber);
        setText(".flight-summary-route", routeLabel);
        setText(".flight-summary-badge", stopsText(flight.stopsCount));

        var arrivalDate = flight.segments ? flight.segments[flight.segments.length - 1].arrivalDate : flight.arrivalDate;
        var metaItems = document.querySelectorAll(".flight-summary-meta-item dd");
        if (metaItems.length >= 8) {
            metaItems[0].textContent = formatDisplayDate(flight.departureDate);
            metaItems[1].textContent = flight.departure;
            metaItems[2].innerHTML = escapeHtml(flight.arrival) + (arrivalDate ? nextDayMarker(flight.departureDate, arrivalDate) : "");
            metaItems[3].textContent = typeof flight.durationMinutes === "number" ? formatDuration(flight.durationMinutes) : flight.duration;
            metaItems[4].textContent = typeof flight.stopsCount === "number" ? String(flight.stopsCount) : "—";
            metaItems[5].textContent = flight.aircraft;
            metaItems[6].textContent = flight.from + " (" + fromCode + ")";
            metaItems[7].textContent = flight.to + " (" + toCode + ")";
        }

        var container = document.getElementById("journey-timeline");
        if (container) {
            container.innerHTML = buildJourneyMarkup(flight);
        }
    }

    function saveAndContinue(flight, cabinClass, price) {
        var context = readContext();
        var selection = {
            id: flight.id,
            flightNumber: flight.flightNumber,
            from: flight.from,
            to: flight.to,
            departure: flight.departure,
            arrival: flight.arrival,
            duration: flight.duration,
            durationMinutes: flight.durationMinutes,
            stops: flight.stopsLabel,
            stopsCount: flight.stopsCount,
            arrivalDate: flight.arrivalDate,
            segments: flight.segments,
            aircraft: flight.aircraft,
            cabinClass: cabinClass,
            price: price,
            passengers: context.passengers,
            departureDate: flight.departureDate || context.departureDate,
            returnDate: context.returnDate,
            tripType: context.tripType
        };

        try {
            sessionStorage.setItem("aerovaSelectedFlight", JSON.stringify(selection));
        } catch (error) {
            // Continue even if storage is unavailable.
        }

        window.location.href = "seat-selection.html";
    }

    function formatMoney(amount) {
        var whole = amount % 1 === 0;
        return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
    }

    /* Every price on the cards comes from the flight's fares; a cabin the flight does not sell cannot be chosen. */
    function renderFares(flight) {
        document.querySelectorAll(".fare-card[data-cabin]").forEach(function (card) {
            var cabin = card.getAttribute("data-cabin");
            var price = flight.cabinPrices ? flight.cabinPrices[cabin] : undefined;
            var available = typeof price === "number" && isFinite(price);
            var amount = card.querySelector(".fare-card-amount");
            var button = card.querySelector(".select-flight-button");

            if (amount) {
                amount.textContent = available ? formatMoney(price) : "—";
            }

            card.classList.toggle("is-unavailable", !available);

            if (button) {
                button.disabled = !available;
                var key = available ? "results.selectFlight" : "api.details.cabinUnavailable";
                button.setAttribute("data-i18n", key);
                button.textContent = tr(key, null, available ? "Select Flight" : "Not available");
            }
        });
    }

    /* One listener for the three cards; it always reads the flight that is currently shown. */
    function bindFareButtons() {
        var grid = document.querySelector(".fare-options-grid");
        if (!grid) {
            return;
        }

        grid.addEventListener("click", function (event) {
            var button = event.target.closest ? event.target.closest(".select-flight-button") : null;
            var card = button ? button.closest(".fare-card") : null;
            var cabin = card ? card.getAttribute("data-cabin") : "";
            var price = currentFlight && currentFlight.cabinPrices ? currentFlight.cabinPrices[cabin] : undefined;

            if (button && !button.disabled && typeof price === "number" && isFinite(price)) {
                saveAndContinue(currentFlight, cabin, price);
            }
        });
    }

    function ensureBackLink() {
        var intro = document.querySelector(".flight-details-intro");
        if (!intro || intro.querySelector(".flight-details-back")) {
            return;
        }

        var back = document.createElement("a");
        back.className = "flight-details-back";
        back.href = "flight-results.html";

        try {
            var savedUrl = sessionStorage.getItem("aerovaBookingResultsUrl");
            if (savedUrl) {
                back.href = savedUrl;
            }
        } catch (error) {
            // Keep default.
        }

        back.textContent = "← Back to flight results";
        intro.appendChild(back);
    }

    var currentFlight = null;
    var statusSpec = null;

    function paintStatus() {
        var panel = document.getElementById("details-status");
        if (!panel) {
            return;
        }

        if (!statusSpec) {
            panel.hidden = true;
            panel.innerHTML = "";
            return;
        }

        var spec = statusSpec;
        panel.hidden = false;
        panel.setAttribute("role", spec.kind === "error" ? "alert" : "status");
        panel.innerHTML =
            '<h2 class="details-status-title">' + escapeHtml(tr(spec.titleKey, null, spec.titleFallback)) + "</h2>" +
            '<p class="details-status-text">' + escapeHtml(spec.text || tr(spec.textKey, null, spec.textFallback)) + "</p>" +
            (spec.retry ? '<button type="button" class="select-flight-button details-retry">' + escapeHtml(tr("api.search.retry", null, "Try again")) + "</button>" : "");

        var retryButton = panel.querySelector(".details-retry");
        if (retryButton) {
            retryButton.addEventListener("click", loadFlight);
        }
    }

    /* A status replaces the flight content; no status shows the flight. */
    function setStatus(spec) {
        statusSpec = spec;
        document.querySelectorAll("[data-details-content]").forEach(function (section) {
            section.hidden = !!spec;
        });
        paintStatus();
    }

    function showFlight(flight) {
        currentFlight = flight;
        setStatus(null);
        renderFlight(flight);
        renderFares(flight);
    }

    function loadFlight() {
        var flightId = readFlightId();
        currentFlight = null;

        if (!flightId) {
            setStatus({ kind: "notice", titleKey: "api.details.noFlightTitle", titleFallback: "No flight selected", textKey: "api.details.noFlightText", textFallback: "Choose a flight from the search results to see its details." });
            return;
        }

        setStatus({ kind: "loading", titleKey: "api.details.loadingTitle", titleFallback: "Loading flight details", textKey: "api.details.loadingText", textFallback: "Please wait while we load this flight." });

        window.AEROVA_FLIGHTS.get(flightId).then(function (page) {
            showFlight(toDetailsFlight(page));
        }).catch(function (error) {
            var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;

            if (isApiError && error.status === 404) {
                setStatus({ kind: "notice", titleKey: "api.details.notFoundTitle", titleFallback: "This flight is not available", textKey: "api.details.notFoundText", textFallback: "It may have been removed or changed. Please search again." });
                return;
            }

            if (!isApiError && window.console) {
                window.console.error(error);
            }

            setStatus({ kind: "error", titleKey: "api.details.errorTitle", titleFallback: "We could not load this flight", text: isApiError ? error.userMessage : tr("api.errors.generic", null, "Something went wrong. Please try again."), retry: true });
        });
    }

    function init() {
        ensureBackLink();
        bindFareButtons();

        window.addEventListener("aerova:languagechange", function () {
            if (currentFlight) {
                renderFlight(currentFlight);
                renderFares(currentFlight);
            } else {
                paintStatus();
            }
        });

        loadFlight();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
