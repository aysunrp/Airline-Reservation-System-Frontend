(function () {
    "use strict";

    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    var PNR_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

    function generatePNR() {
        var pnr = "";
        var i;

        for (i = 0; i < 6; i += 1) {
            pnr += PNR_CHARSET.charAt(Math.floor(Math.random() * PNR_CHARSET.length));
        }

        return pnr;
    }

    function readBookingData() {
        try {
            var raw = sessionStorage.getItem("bookingData");
            if (!raw) {
                return null;
            }

            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function saveBookingData(bookingData) {
        try {
            sessionStorage.setItem("bookingData", JSON.stringify(bookingData));
        } catch (error) {
            // Ignore storage errors and continue rendering
        }
    }

    function ensurePNR(bookingData) {
        if (bookingData.pnr) {
            return String(bookingData.pnr);
        }

        bookingData.pnr = generatePNR();
        saveBookingData(bookingData);
        return bookingData.pnr;
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

    function populateConfirmation(bookingData) {
        var flight = bookingData.flight || {};
        var selectedSeats = Array.isArray(bookingData.selectedSeats) ? bookingData.selectedSeats : [];
        var passengers = Array.isArray(bookingData.passengers) ? bookingData.passengers : [];
        var passengerCount = bookingData.passengerCount || passengers.length || selectedSeats.length || 0;
        var seatsText = selectedSeats.length ? selectedSeats.join(", ") : "—";
        var route = flight.route || ((flight.from || "—") + " → " + (flight.to || "—"));
        var cabinClass = bookingData.cabinClass || "—";
        var pnr = ensurePNR(bookingData);
        var airlineEl = document.querySelector(".flight-airline");

        setText("confirmation-pnr", pnr);
        setText("confirmation-flight-number", flight.flightNumber || "—");
        setText("confirmation-route", route);
        setText("confirmation-departure-date", formatDisplayDate(flight.departureDate));
        setText("confirmation-departure-time", flight.departure || "—");
        setText("confirmation-arrival-time", flight.arrival || "—");
        setText("confirmation-aircraft", flight.aircraft || "—");
        setText("confirmation-cabin", cabinClass);
        setText("confirmation-passenger-count", String(passengerCount || "—"));
        setText("confirmation-selected-seats", seatsText);
        setText("confirmation-total-price", formatPrice(bookingData.totalPrice));

        if (airlineEl) {
            airlineEl.textContent = flight.airline || "AEROVA";
        }

        renderPassengers(passengers, selectedSeats);
        populatePriceSummary(passengerCount || "—", cabinClass, seatsText, bookingData.totalPrice);
    }

    function init() {
        var bookingData = readBookingData();

        if (!bookingData) {
            window.location.href = "index.html";
            return;
        }

        populateConfirmation(bookingData);
    }

    document.addEventListener("DOMContentLoaded", init);
})();
