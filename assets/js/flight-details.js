(function () {
    "use strict";

    var AIRPORT_CODES = {
        baku: "GYD",
        london: "LHR",
        paris: "CDG",
        dubai: "DXB",
        istanbul: "IST",
        maldives: "MLE",
        "new york": "JFK",
        tokyo: "HND",
        singapore: "SIN",
        berlin: "BER",
        barcelona: "BCN",
        rome: "FCO",
        milan: "MXP"
    };

    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    function getParams() {
        return new URLSearchParams(window.location.search);
    }

    function airportCode(city) {
        var key = String(city || "").trim().toLowerCase();
        return AIRPORT_CODES[key] || "—";
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

    function parsePrice(text) {
        var digits = String(text || "").replace(/[^0-9.]/g, "");
        var amount = Number(digits);
        return isFinite(amount) ? amount : 0;
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

    function populateFromQuery() {
        var params = getParams();
        var from = params.get("from") || "Baku";
        var to = params.get("to") || "London";
        var flightNumber = params.get("flightNumber") || "AV 101";
        var departureDate = params.get("departureDate") || "";
        var departureTime = params.get("departureTime") || "09:30";
        var arrivalTime = params.get("arrivalTime") || "13:10";
        var duration = params.get("duration") || "5h 40m";
        var stops = params.get("stops") || "Non-stop";
        var aircraft = params.get("aircraft") || "AEROVA 787-9";
        var fromCode = airportCode(from);
        var toCode = airportCode(to);
        var routeLabel = from + " (" + fromCode + ") → " + to + " (" + toCode + ")";
        var stopsLabel = stops === "0" || /^non/i.test(stops) ? "Non-stop" : stops;
        var stopsCount = /^non/i.test(stopsLabel) || stops === "0" ? "0" : "1";

        setText("#flight-summary-title", flightNumber);
        setText(".flight-summary-route", routeLabel);
        setText(".flight-summary-badge", stopsLabel);

        var metaItems = document.querySelectorAll(".flight-summary-meta-item dd");
        if (metaItems.length >= 8) {
            metaItems[0].textContent = formatDisplayDate(departureDate);
            metaItems[1].textContent = departureTime;
            metaItems[2].textContent = arrivalTime;
            metaItems[3].textContent = duration;
            metaItems[4].textContent = stopsCount;
            metaItems[5].textContent = aircraft;
            metaItems[6].textContent = from + " (" + fromCode + ")";
            metaItems[7].textContent = to + " (" + toCode + ")";
        }

        var points = document.querySelectorAll(".timeline-point");
        if (points[0]) {
            setText(".timeline-point .timeline-time", departureTime);
            setText(".timeline-point .timeline-city", from);
            setText(".timeline-point .timeline-code", fromCode);
        }
        if (points[1]) {
            var arrivalPoint = points[1];
            var time = arrivalPoint.querySelector(".timeline-time");
            var city = arrivalPoint.querySelector(".timeline-city");
            var code = arrivalPoint.querySelector(".timeline-code");
            if (time) {
                time.textContent = arrivalTime;
            }
            if (city) {
                city.textContent = to;
            }
            if (code) {
                code.textContent = toCode;
            }
        }

        var durationLabel = document.querySelector(".timeline-duration");
        if (durationLabel) {
            durationLabel.textContent = duration + " · " + stopsLabel;
        }

        return {
            flightNumber: flightNumber,
            from: from,
            to: to,
            departureDate: departureDate,
            departure: departureTime,
            arrival: arrivalTime,
            duration: duration,
            aircraft: aircraft,
            stops: stopsLabel
        };
    }

    function saveAndContinue(flight, cabinClass, price) {
        var search = readSearchCriteria();
        var selection = {
            id: flight.flightNumber,
            flightNumber: flight.flightNumber,
            from: flight.from,
            to: flight.to,
            departure: flight.departure,
            arrival: flight.arrival,
            duration: flight.duration,
            aircraft: flight.aircraft,
            cabinClass: cabinClass,
            price: price,
            passengers: search.passengers || 1,
            departureDate: flight.departureDate || search.departureDate || "",
            returnDate: search.returnDate || "",
            tripType: search.tripType || "oneway"
        };

        try {
            sessionStorage.setItem("aerovaSelectedFlight", JSON.stringify(selection));
        } catch (error) {
            // Continue even if storage is unavailable.
        }

        window.location.href = "seat-selection.html";
    }

    function bindSelectButtons(flight) {
        document.querySelectorAll(".fare-card").forEach(function (card) {
            var button = card.querySelector(".select-flight-button");
            var label = card.querySelector(".fare-card-label");
            var amount = card.querySelector(".fare-card-amount");

            if (!button || !label) {
                return;
            }

            button.addEventListener("click", function () {
                var cabin = label.textContent.trim();
                if (/business/i.test(cabin)) {
                    cabin = "Business";
                } else if (/comfort/i.test(cabin)) {
                    cabin = "Comfort";
                } else {
                    cabin = "Economy";
                }

                saveAndContinue(flight, cabin, parsePrice(amount ? amount.textContent : "0"));
            });
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

    function init() {
        var flight = populateFromQuery();
        bindSelectButtons(flight);
        ensureBackLink();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
