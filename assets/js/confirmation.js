(function () {
    "use strict";

    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
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
        if (!isFinite(value)) {
            return "$0.00";
        }
        return "$" + value.toFixed(2);
    }

    function formatDisplayDate(dateValue) {
        if (!dateValue) {
            return "—";
        }

        var parts = String(dateValue).split("-");
        if (parts.length !== 3) {
            return String(dateValue);
        }

        var year = Number(parts[0]);
        var month = Number(parts[1]);
        var day = Number(parts[2]);

        if (!year || !month || !day || month < 1 || month > 12) {
            return String(dateValue);
        }

        return day + " " + MONTH_NAMES[month - 1] + " " + year;
    }

    function getPassengerName(passenger) {
        return [passenger.title, passenger.firstName, passenger.middleName, passenger.lastName]
            .map(function (part) {
                return String(part || "").trim();
            })
            .filter(function (part) {
                return !!part;
            })
            .join(" ");
    }

    /* Only the reference and a passenger's last name are kept after paying; everything shown comes from the backend. */
    function readPaid() {
        try {
            var parsed = JSON.parse(sessionStorage.getItem("aerovaPaid") || "null");
            return parsed && parsed.pnr && parsed.lastName ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) {
                return value;
            }
        }
        return typeof vars === "object" && vars
            ? String(fallback).replace(/\{(\w+)\}/g, function (_, name) { return vars[name] != null ? String(vars[name]) : "{" + name + "}"; })
            : fallback;
    }

    function showStatus(title, text, actions, isError) {
        var panel = document.getElementById("confirmation-status");
        var body = document.getElementById("confirmation-body");
        var buttons = document.getElementById("confirmation-status-actions");

        setText("confirmation-status-title", title);
        setText("confirmation-status-text", text);
        buttons.innerHTML = "";

        (actions || []).forEach(function (action) {
            var element = document.createElement(action.href ? "a" : "button");
            element.className = "confirmation-button confirmation-button--primary";
            element.textContent = action.label;
            if (action.href) {
                element.setAttribute("href", action.href);
            } else {
                element.type = "button";
                element.addEventListener("click", action.onClick);
            }
            buttons.appendChild(element);
        });

        panel.setAttribute("role", isError ? "alert" : "status");
        panel.hidden = false;
        body.hidden = true;
    }

    function showBooking() {
        document.getElementById("confirmation-status").hidden = true;
        document.getElementById("confirmation-body").hidden = false;
    }

    function renderPassengers(passengers, selectedSeats) {
        var list = document.getElementById("confirmation-passenger-list");
        if (!list) {
            return;
        }

        var items = Array.isArray(passengers) ? passengers : [];
        var seats = Array.isArray(selectedSeats) ? selectedSeats : [];
        var markup = "";
        var i;
        var passenger;
        var name;
        var seat;

        if (!items.length) {
            list.innerHTML =
                '<li class="confirmation-passenger-item">' +
                    '<p class="passenger-label">Passenger 1</p>' +
                    '<p class="passenger-name">—</p>' +
                    '<p class="passenger-seat">Seat: <span>—</span></p>' +
                "</li>";
            return;
        }

        for (i = 0; i < items.length; i += 1) {
            passenger = items[i] || {};
            name = getPassengerName(passenger) || "—";
            seat = passenger.assignedSeat || seats[i] || "—";

            markup +=
                '<li class="confirmation-passenger-item">' +
                    '<p class="passenger-label">Passenger ' + (i + 1) + "</p>" +
                    '<p class="passenger-name">' + escapeHtml(name) + "</p>" +
                    '<p class="passenger-seat">Seat: <span>' + escapeHtml(seat) + "</span></p>" +
                "</li>";
        }

        list.innerHTML = markup;
    }

    function populatePriceSummary(passengerCount, cabinClass, seatsText, totalPrice) {
        var rows = document.querySelectorAll(".price-summary-list .price-summary-row");
        var totalRow = document.querySelector(".price-summary-row--total dd");

        if (rows[0] && rows[0].querySelector("dd")) {
            rows[0].querySelector("dd").textContent = String(passengerCount);
        }

        setText("confirmation-price-cabin", cabinClass);

        if (rows[2] && rows[2].querySelector("dd")) {
            rows[2].querySelector("dd").textContent = seatsText;
        }

        if (totalRow) {
            totalRow.textContent = formatPrice(totalPrice);
        }
    }

    /* The booking as the backend holds it, in the shape the page below fills in. */
    function toPageData(booking, airports) {
        var directory = window.AEROVA_AIRPORTS;
        var leg = booking.legs[0];
        var origin = directory.find(airports, leg.originCode);
        var destination = directory.find(airports, leg.destinationCode);
        var departure = directory.localTime(leg.departureAt, origin.timeZoneId);
        var arrival = directory.localTime(leg.arrivalAt, destination.timeZoneId);
        var seats = [];
        var seatsByLeg = booking.legs.map(function () { return []; });

        var passengers = booking.passengers.map(function (passenger) {
            var perLeg = booking.legs.map(function (item, index) {
                var ticket = passenger.tickets.filter(function (candidate) { return candidate.legOrder === item.legOrder; })[0];
                if (ticket && ticket.seat) {
                    seatsByLeg[index].push(ticket.seat);
                    if (index === 0) {
                        seats.push(ticket.seat);
                    }
                    return ticket.seat;
                }
                return null;
            });

            return {
                title: passenger.title,
                firstName: passenger.firstName,
                middleName: passenger.middleName,
                lastName: passenger.lastName,
                // The seat on every flight of the trip, e.g. "11A | 12C".
                assignedSeat: perLeg.filter(Boolean).join(" | ") || null
            };
        });

        function flightOf(item) {
            var from = directory.find(airports, item.originCode);
            var to = directory.find(airports, item.destinationCode);
            var out = directory.localTime(item.departureAt, from.timeZoneId);
            var back = directory.localTime(item.arrivalAt, to.timeZoneId);
            return {
                airline: "AEROVA",
                flightNumber: item.flightNumber,
                route: item.originCity + " \u2192 " + item.destinationCity,
                departureDate: out.date,
                departure: out.time,
                arrival: back.time,
                aircraft: "AEROVA " + item.aircraftModel,
                cabinClass: item.cabinClass
            };
        }

        return {
            pnr: booking.pnr,
            flight: {
                airline: "AEROVA",
                flightNumber: leg.flightNumber,
                route: leg.originCity + " \u2192 " + leg.destinationCity,
                departureDate: departure.date,
                departure: departure.time,
                arrival: arrival.time,
                aircraft: "AEROVA " + leg.aircraftModel
            },
            cabinClass: leg.cabinClass,
            passengerCount: passengers.length,
            selectedSeats: seats,
            seatsText: seatsByLeg.map(function (list) { return list.join(", "); }).filter(Boolean).join(" | "),
            returnFlight: booking.legs.length > 1 ? flightOf(booking.legs[1]) : null,
            returnSeats: booking.legs.length > 1 ? seatsByLeg[1].join(", ") : "",
            passengers: passengers,
            totalPrice: booking.price.total
        };
    }

    /* A round trip gets a second flight card, filled from the return flight. */
    function paintReturnFlight(bookingData) {
        var card = document.querySelector('article[aria-labelledby="flight-details-title"]');
        var returnFlight = bookingData.returnFlight;
        var copy = window.AEROVA_JOURNEY ? window.AEROVA_JOURNEY.ensureReturnCard(card, !!returnFlight, tr("api.journey.returnFlightTitle", "Return Flight")) : null;

        if (!copy || !returnFlight) {
            return;
        }

        setText("confirmation-flight-number-return", returnFlight.flightNumber);
        setText("confirmation-route-return", returnFlight.route);
        setText("confirmation-departure-date-return", formatDisplayDate(returnFlight.departureDate));
        setText("confirmation-departure-time-return", returnFlight.departure);
        setText("confirmation-arrival-time-return", returnFlight.arrival);
        setText("confirmation-aircraft-return", returnFlight.aircraft);
        setText("confirmation-cabin-return", returnFlight.cabinClass);
        setText("confirmation-selected-seats-return", bookingData.returnSeats || "\u2014");

        // The number of passengers and the total belong to the whole booking, shown once on the first card.
        ["confirmation-passenger-count-return", "confirmation-total-price-return"].forEach(function (id) {
            var element = document.getElementById(id);
            if (element && element.parentNode) {
                element.parentNode.hidden = true;
            }
        });
    }

    function populateConfirmation(bookingData) {
        var flight = bookingData.flight;
        var seatsText = bookingData.seatsText || (bookingData.selectedSeats.length ? bookingData.selectedSeats.join(", ") : "\u2014");
        var airlineEl = document.querySelector(".flight-airline");

        setText("confirmation-pnr", bookingData.pnr);
        setText("confirmation-flight-number", flight.flightNumber);
        setText("confirmation-route", flight.route);
        setText("confirmation-departure-date", formatDisplayDate(flight.departureDate));
        setText("confirmation-departure-time", flight.departure);
        setText("confirmation-arrival-time", flight.arrival);
        setText("confirmation-aircraft", flight.aircraft);
        setText("confirmation-cabin", bookingData.cabinClass);
        setText("confirmation-passenger-count", String(bookingData.passengerCount));
        setText("confirmation-selected-seats", seatsText);
        setText("confirmation-total-price", formatPrice(bookingData.totalPrice));

        if (airlineEl) {
            airlineEl.textContent = flight.airline;
        }

        paintReturnFlight(bookingData);
        renderPassengers(bookingData.passengers, bookingData.selectedSeats);
        populatePriceSummary(bookingData.passengerCount, bookingData.cabinClass, seatsText, bookingData.totalPrice);
    }

    function load() {
        var paid = readPaid();

        if (!paid) {
            showStatus(tr("api.confirmation.missingTitle", "No booking to show"), tr("api.confirmation.missingText", "Your booking could not be found on this device. Use Manage Booking with your reference and last name."), [
                { label: tr("api.confirmation.manage", "Manage booking"), href: "manage-booking.html" }
            ]);
            return;
        }

        showStatus(tr("api.confirmation.loadingTitle", "Loading your booking"), tr("api.confirmation.loadingText", "Please wait a moment."), []);

        Promise.all([
            window.AEROVA_AIRPORTS.load(),
            window.AEROVA_API.get("api/bookings/" + encodeURIComponent(paid.pnr) + "?lastName=" + encodeURIComponent(paid.lastName))
        ]).then(function (results) {
            var booking = results[1];

            if (booking.status !== "Confirmed" && booking.status !== "Completed") {
                showStatus(tr("api.confirmation.notPaidTitle", "This booking is not confirmed"), tr("api.confirmation.notPaidText", "The payment for this booking was not completed."), [
                    { label: tr("api.confirmation.backHome", "Back to Home"), href: "index.html" }
                ]);
                return;
            }

            populateConfirmation(toPageData(booking, results[0]));
            showBooking();
        }).catch(function (error) {
            var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;

            if (!isApiError && window.console) {
                window.console.error(error);
            }

            showStatus(tr("api.confirmation.errorTitle", "We could not load your booking"), isApiError ? error.userMessage : tr("api.errors.generic", "Something went wrong. Please try again."), [
                { label: tr("api.confirmation.retry", "Try again"), onClick: load }
            ], true);
        });
    }

    function init() {
        load();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
