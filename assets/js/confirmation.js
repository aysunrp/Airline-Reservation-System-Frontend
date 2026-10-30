(function () {
    "use strict";

    var MONTH_NAMES = [
        "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
        "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
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

        return (day < 10 ? "0" + day : day) + "." + (month < 10 ? "0" + month : month) + "." + year;
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
            // The other flights of the trip: the return flight of a round trip, or the next flights of a multi-city trip.
            multiCity: booking.tripType === "MultiCity",
            extraFlights: booking.legs.slice(1).map(function (item, index) {
                var other = flightOf(item);
                other.seats = seatsByLeg[index + 1].join(", ");
                return other;
            }),
            passengers: passengers,
            totalPrice: booking.price.total
        };
    }

    /* Every other flight of the trip gets a flight card of its own, filled like the first one. */
    function paintReturnFlight(bookingData) {
        var card = document.querySelector('article[aria-labelledby="flight-details-title"]');
        var extra = bookingData.extraFlights || [];
        var copies = window.AEROVA_JOURNEY ? window.AEROVA_JOURNEY.ensureLegCards(card, extra.length, function (number) {
            return bookingData.multiCity ? tr("api.journey.flightTitle", "Reys {n}", { n: number }) : tr("api.journey.returnFlightTitle", "Qayıdış reysi");
        }) : [];

        copies.forEach(function (copy, index) {
            var flight = extra[index];
            var suffix = copy.suffix;

            setText("confirmation-flight-number" + suffix, flight.flightNumber);
            setText("confirmation-route" + suffix, flight.route);
            setText("confirmation-departure-date" + suffix, formatDisplayDate(flight.departureDate));
            setText("confirmation-departure-time" + suffix, flight.departure);
            setText("confirmation-arrival-time" + suffix, flight.arrival);
            setText("confirmation-aircraft" + suffix, flight.aircraft);
            setText("confirmation-cabin" + suffix, flight.cabinClass);
            setText("confirmation-selected-seats" + suffix, flight.seats || "\u2014");

            // The number of passengers and the total belong to the whole booking, shown once on the first card.
            ["confirmation-passenger-count" + suffix, "confirmation-total-price" + suffix].forEach(function (id) {
                var element = document.getElementById(id);
                if (element && element.parentNode) {
                    element.parentNode.hidden = true;
                }
            });
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

    /*
     * Passengers typed in by hand are offered for the profile (payment.js keeps them in "aerovaSavable" for this booking only).
     * People who are already saved (same name and date of birth) are left out. Nothing is saved unless the traveller chooses to.
     */
    function readSavable(pnr) {
        try {
            var parsed = JSON.parse(sessionStorage.getItem("aerovaSavable") || "null");
            return parsed && parsed.pnr === pnr && Array.isArray(parsed.passengers) ? parsed.passengers : [];
        } catch (error) {
            return [];
        }
    }

    function clearSavable() {
        try {
            sessionStorage.removeItem("aerovaSavable");
        } catch (error) {
            // nothing to clear
        }
    }

    function sameSaved(a, b) {
        var same = function (x, y) { return String(x || "").trim().toLowerCase() === String(y || "").trim().toLowerCase(); };
        return same(a.firstName, b.firstName) && same(a.lastName, b.lastName) && (!a.dateOfBirth || !b.dateOfBirth || a.dateOfBirth === b.dateOfBirth);
    }

    function setSaveMessage(text) {
        var message = document.getElementById("save-passengers-message");
        message.textContent = text || "";
        message.hidden = !text;
    }

    function paintSaveCard(card, passengers, errorText) {
        var list = document.getElementById("save-passengers-list");
        var actions = document.getElementById("save-passengers-actions");
        var saveButton = document.getElementById("save-passengers-save");
        var skipButton = document.getElementById("save-passengers-skip");

        list.innerHTML = passengers.map(function (passenger, index) {
            var hint = [passenger.dateOfBirth ? formatDisplayDate(passenger.dateOfBirth) : "", passenger.documentNumber ? tr("api.profile.documentSaved", "sənəd saxlanıb") : ""].filter(Boolean).join(" \u00b7 ");
            return '<li><label class="save-passengers-item"><input type="checkbox" data-index="' + index + '" checked>' +
                "<span>" + escapeHtml(passenger.firstName + " " + passenger.lastName) + (hint ? "<small>" + escapeHtml(hint) + "</small>" : "") + "</span></label></li>";
        }).join("");

        setSaveMessage(errorText);
        list.hidden = false;
        actions.hidden = false;
        card.hidden = false;
        saveButton.disabled = false;

        saveButton.onclick = function () {
            var chosen = Array.prototype.map.call(list.querySelectorAll("input:checked"), function (box) { return passengers[Number(box.getAttribute("data-index"))]; });

            if (!chosen.length) {
                setSaveMessage(tr("api.confirmation.selectOne", "Ən azı bir sərnişin seçin."));
                return;
            }

            saveButton.disabled = true;
            setSaveMessage(tr("api.confirmation.saving", "Saxlanılır..."));

            var failed = [];
            var saved = 0;
            chosen.reduce(function (chain, passenger) {
                return chain.then(function () {
                    return window.AEROVA_API.post("api/profile/saved-passengers", passenger).then(function () { saved += 1; }, function () { failed.push(passenger); });
                });
            }, Promise.resolve()).then(function () {
                if (failed.length) {
                    paintSaveCard(card, failed, tr("api.confirmation.saveError", "Bəzi sərnişinləri saxlamaq mümkün olmadı. Yenidən cəhd edə və ya sonra profilinizdən əlavə edə bilərsiniz."));
                    return;
                }

                clearSavable();
                list.hidden = true;
                actions.hidden = true;
                setSaveMessage(tr("api.confirmation.savedDone", "{count} sərnişin profilinizə saxlanıldı.", { count: saved }));
            });
        };

        skipButton.onclick = function () {
            clearSavable();
            card.hidden = true;
        };
    }

    function offerSaving(pnr) {
        var card = document.getElementById("save-passengers-card");
        var candidates = readSavable(pnr);

        if (!card || !candidates.length || !window.AerovaAuth || !window.AerovaAuth.isLoggedIn()) {
            return;
        }

        window.AEROVA_API.get("api/profile/saved-passengers").then(function (saved) {
            var fresh = [];

            candidates.forEach(function (candidate) {
                if (!(saved || []).some(function (known) { return sameSaved(known, candidate); }) && !fresh.some(function (known) { return sameSaved(known, candidate); })) {
                    fresh.push(candidate);
                }
            });

            if (!fresh.length) {
                clearSavable();
                return;
            }

            paintSaveCard(card, fresh, "");
        }).catch(function () {
            // This is only an offer: without the saved list nothing is shown.
        });
    }

    function load() {
        var paid = readPaid();

        if (!paid) {
            showStatus(tr("api.confirmation.missingTitle", "Göstəriləcək rezervasiya yoxdur"), tr("api.confirmation.missingText", "Rezervasiyanız bu cihazda tapılmadı. Rezervasiya kodu və soyadınızla Rezervasiyanı idarə et bölməsindən istifadə edin."), [
                { label: tr("api.confirmation.manage", "Rezervasiyanı idarə et"), href: "manage-booking.html" }
            ]);
            return;
        }

        showStatus(tr("api.confirmation.loadingTitle", "Rezervasiyanız yüklənir"), tr("api.confirmation.loadingText", "Zəhmət olmasa bir az gözləyin."), []);

        Promise.all([
            window.AEROVA_AIRPORTS.load(),
            window.AEROVA_API.get("api/bookings/" + encodeURIComponent(paid.pnr) + "?lastName=" + encodeURIComponent(paid.lastName))
        ]).then(function (results) {
            var booking = results[1];

            if (booking.status !== "Confirmed" && booking.status !== "Completed") {
                showStatus(tr("api.confirmation.notPaidTitle", "Bu rezervasiya təsdiqlənməyib"), tr("api.confirmation.notPaidText", "Bu rezervasiya üçün ödəniş tamamlanmayıb."), [
                    { label: tr("api.confirmation.backHome", "Ana səhifəyə qayıt"), href: "index.html" }
                ]);
                return;
            }

            populateConfirmation(toPageData(booking, results[0]));
            linkBookingDetails(paid);
            showBooking();
            offerSaving(paid.pnr);
        }).catch(function (error) {
            var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;

            if (!isApiError && window.console) {
                window.console.error(error);
            }

            showStatus(tr("api.confirmation.errorTitle", "Rezervasiyanı yükləmək mümkün olmadı"), isApiError ? error.userMessage : tr("api.errors.generic", "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin."), [
                { label: tr("api.confirmation.retry", "Yenidən cəhd et"), onClick: load }
            ], true);
        });
    }

    /*
     * "Booking Details" opens this very booking. A signed-in traveller opens it from the account (its reference in the address); without a
     * sign-in the reference and a passenger's last name, kept only in this tab, find it as Manage Booking does.
     */
    function linkBookingDetails(paid) {
        var link = document.querySelector('a[href^="booking-details.html"]');
        if (!link) {
            return;
        }

        var signedIn = !!(window.AerovaAuth && window.AerovaAuth.isLoggedIn && window.AerovaAuth.isLoggedIn());
        if (signedIn) {
            link.setAttribute("href", "booking-details.html?pnr=" + encodeURIComponent(paid.pnr));
            return;
        }

        try {
            sessionStorage.setItem("aerovaManaged", JSON.stringify({ pnr: paid.pnr, lastName: paid.lastName }));
        } catch (error) {
            // Without storage the page explains how to find the booking.
        }
        link.setAttribute("href", "booking-details.html?source=manage");
    }

    function init() {
        load();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
