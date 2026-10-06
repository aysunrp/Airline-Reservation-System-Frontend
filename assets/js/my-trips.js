(function () {
    "use strict";

    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

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

    function parseFlightDate(dateValue) {
        if (!dateValue) {
            return null;
        }

        var parts = String(dateValue).split("-");
        if (parts.length !== 3) {
            return null;
        }

        var year = Number(parts[0]);
        var month = Number(parts[1]);
        var day = Number(parts[2]);
        var date = new Date(year, month - 1, day);

        if (
            !year ||
            !month ||
            !day ||
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        date.setHours(0, 0, 0, 0);
        return date;
    }

    function isUpcomingFlight(dateValue) {
        var flightDate = parseFlightDate(dateValue);
        if (!flightDate) {
            return true;
        }

        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return flightDate >= today;
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

    function getBookingStatus(bookingData) {
        if (bookingData.paymentStatus === "Paid") {
            return "Confirmed";
        }

        if (bookingData.paymentStatus) {
            return String(bookingData.paymentStatus);
        }

        return "Confirmed";
    }

    function buildTripCard(bookingData) {
        var flight = bookingData.flight || {};
        var selectedSeats = Array.isArray(bookingData.selectedSeats)
            ? bookingData.selectedSeats
            : [];
        var passengerCount = bookingData.passengerCount ||
            (Array.isArray(bookingData.passengers) ? bookingData.passengers.length : 0) ||
            selectedSeats.length ||
            0;
        var route = flight.route ||
            ((flight.from || "—") + " → " + (flight.to || "—"));
        var seatsText = selectedSeats.length ? selectedSeats.join(", ") : "—";
        var pnr = bookingData.pnr || "—";
        var status = getBookingStatus(bookingData);

        return (
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
                    '<a class="trip-card-button" href="booking-details.html">View Details</a>' +
                "</div>" +
            "</article>"
        );
    }

    function ensurePastTripsList() {
        var pastPanel = document.querySelector(".trips-panel--past");
        var existing = document.getElementById("past-trips-list");

        if (existing) {
            return existing;
        }

        if (!pastPanel) {
            return null;
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

    function showEmptyState(emptyId, shouldShow) {
        var emptyState = document.getElementById(emptyId);
        if (!emptyState) {
            return;
        }
        emptyState.hidden = !shouldShow;
    }

    function renderTrips(bookingData) {
        var upcomingList = document.getElementById("upcoming-trips-list");
        var pastList = ensurePastTripsList();
        var flight = bookingData && bookingData.flight ? bookingData.flight : {};
        var upcoming = bookingData ? isUpcomingFlight(flight.departureDate) : false;
        var cardMarkup = bookingData ? buildTripCard(bookingData) : "";

        if (upcomingList) {
            upcomingList.innerHTML = upcoming ? cardMarkup : "";
        }

        if (pastList) {
            pastList.innerHTML = bookingData && !upcoming ? cardMarkup : "";
        }

        showEmptyState("upcoming-trips-empty", !bookingData || !upcoming);
        showEmptyState("past-trips-empty", !bookingData || upcoming);
    }

    function init() {
        var bookingData = readBookingData();
        renderTrips(bookingData);
    }

    document.addEventListener("DOMContentLoaded", init);
})();
