(function () {
    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return typeof vars === "object" && vars
            ? String(fallback).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? String(vars[k]) : "{" + k + "}"; })
            : fallback;
    }

    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var MOCK_BOOKING = {
        pnr: "AV7K92M",
        paymentStatus: "Confirmed",
        cabinClass: "Comfort",
        passengerCount: 2,
        selectedSeats: ["12A", "12B"],
        totalPrice: 1485,
        baggageTotal: 55,
        mealTotal: 38,
        extraServicesTotal: 55,
        taxesFees: 86,
        passengers: [
            {
                title: "Ms",
                firstName: "Leyla",
                lastName: "Mammadova"
            },
            {
                title: "Mr",
                firstName: "Orkhan",
                lastName: "Aliyev"
            }
        ],
        flight: {
            airline: "AEROVA",
            flightNumber: "AV 101",
            from: "Baku",
            to: "London",
            departureDate: "2026-10-10",
            departure: "09:30",
            arrival: "13:10",
            duration: "5h 40m",
            aircraft: "AEROVA 787-9"
        },
        baggage: [
            { name: "Leyla Mammadova", label: "+20 kg", price: 55 },
            { name: "Orkhan Aliyev", label: "No Extra Baggage", price: 0 }
        ],
        meals: [
            { name: "Leyla Mammadova", mealName: "Standard Meal", price: 18 },
            { name: "Orkhan Aliyev", mealName: "Halal Meal", price: 20 }
        ],
        extraServices: [
            {
                id: "lounge-access",
                name: "Lounge Access",
                price: 55
            }
        ]
    };

    var activeBooking = null;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function normalizeValue(value) {
        return String(value || "").trim().toLowerCase();
    }

    function normalizePnr(value) {
        return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
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

    function readJSON(key) {
        try {
            var raw = sessionStorage.getItem(key);
            if (!raw) {
                return null;
            }

            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function writeJSON(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function getPassengerName(passenger) {
        if (!passenger || typeof passenger !== "object") {
            return "";
        }

        if (passenger.fullName || passenger.name) {
            return String(passenger.fullName || passenger.name);
        }

        return [passenger.title, passenger.firstName, passenger.middleName, passenger.lastName]
            .map(function (part) {
                return String(part || "").trim();
            })
            .filter(Boolean)
            .join(" ");
    }

    function getPassengerLastName(passenger) {
        if (!passenger || typeof passenger !== "object") {
            return "";
        }

        if (passenger.lastName) {
            return String(passenger.lastName);
        }

        var fullName = getPassengerName(passenger);
        var parts = fullName.split(/\s+/);
        return parts.length ? parts[parts.length - 1] : "";
    }

    function getBookingStatus(booking) {
        if (!booking) {
            return "Confirmed";
        }

        if (booking.paymentStatus === "Paid" || booking.paymentStatus === "Confirmed") {
            return "Confirmed";
        }

        if (booking.paymentStatus) {
            return String(booking.paymentStatus);
        }

        return "Confirmed";
    }

    function enrichBooking(booking) {
        var baggageData = readJSON("baggageData");
        var mealData = readJSON("mealData");
        var extraServicesData = readJSON("extraServicesData");
        var copy = JSON.parse(JSON.stringify(booking));

        if (!copy.pnr) {
            copy.pnr = MOCK_BOOKING.pnr;
        }

        if (!Array.isArray(copy.baggage) && baggageData && Array.isArray(baggageData.passengers)) {
            copy.baggage = baggageData.passengers;
            copy.baggageTotal = baggageData.totalBaggageCost || 0;
        }

        if (!Array.isArray(copy.meals) && mealData && Array.isArray(mealData.passengers)) {
            copy.meals = mealData.passengers;
            copy.mealTotal = mealData.totalMealCost || 0;
        }

        if (!Array.isArray(copy.extraServices) && extraServicesData) {
            copy.extraServices = extraServicesData.selectedServices || [];
            copy.extraServicesTotal = extraServicesData.extraServicesTotal || 0;
        }

        if (typeof copy.taxesFees !== "number") {
            var base = Number(copy.totalPrice) || 0;
            copy.taxesFees = Math.round(base * 0.08);
        }

        if (typeof copy.baseFare !== "number") {
            var baggageTotal = Number(copy.baggageTotal) || 0;
            var mealTotal = Number(copy.mealTotal) || 0;
            var extrasTotal = Number(copy.extraServicesTotal) || 0;
            var taxes = Number(copy.taxesFees) || 0;
            var grand = Number(copy.totalPrice);

            if (isFinite(grand) && grand > 0) {
                copy.baseFare = Math.max(grand - baggageTotal - mealTotal - extrasTotal - taxes, 0);
            } else {
                copy.baseFare = MOCK_BOOKING.totalPrice;
            }
        }

        return copy;
    }

    function getSearchableBookings() {
        var stored = readJSON("bookingData");
        var bookings = [];

        if (stored) {
            bookings.push(enrichBooking(stored));
        }

        bookings.push(JSON.parse(JSON.stringify(MOCK_BOOKING)));
        return bookings;
    }

    function findBooking(pnr, lastName) {
        var targetPnr = normalizePnr(pnr);
        var targetLastName = normalizeValue(lastName);
        var bookings = getSearchableBookings();

        for (var i = 0; i < bookings.length; i += 1) {
            var booking = bookings[i];
            var bookingPnr = normalizePnr(booking.pnr);

            if (bookingPnr !== targetPnr) {
                continue;
            }

            var passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
            for (var j = 0; j < passengers.length; j += 1) {
                if (normalizeValue(getPassengerLastName(passengers[j])) === targetLastName) {
                    return booking;
                }
            }
        }

        return null;
    }

    function showMessage(text) {
        var message = document.getElementById("manage-message");
        if (!message) {
            return;
        }

        message.textContent = text || "";
        message.hidden = !text;
    }

    function clearFieldError(input) {
        if (!input || !input.classList.contains("is-invalid")) {
            return;
        }

        input.classList.remove("is-invalid");

        var original = input.getAttribute("data-original-placeholder");
        if (original !== null) {
            if (original) {
                input.setAttribute("placeholder", original);
            } else {
                input.removeAttribute("placeholder");
            }
        }
    }

    function markInvalid(input, message) {
        if (!input) {
            return;
        }

        if (input.getAttribute("data-original-placeholder") === null) {
            input.setAttribute("data-original-placeholder", input.getAttribute("placeholder") || "");
        }

        input.classList.add("is-invalid");
        input.setAttribute("placeholder", message || tr("manage.fieldRequired", "This field is required"));

        if (!String(input.value || "").trim()) {
            input.value = "";
        }
    }

    function validateForm() {
        var pnrInput = document.getElementById("booking-pnr");
        var lastNameInput = document.getElementById("passenger-last-name");
        var isValid = true;

        clearFieldError(pnrInput);
        clearFieldError(lastNameInput);

        if (!pnrInput || !String(pnrInput.value || "").trim()) {
            markInvalid(pnrInput, tr("manage.enterPnr", "Enter your booking reference"));
            isValid = false;
        }

        if (!lastNameInput || !String(lastNameInput.value || "").trim()) {
            markInvalid(lastNameInput, tr("manage.enterLastName", "Enter the passenger last name"));
            isValid = false;
        }

        return isValid;
    }

    function renderNotFound() {
        var results = document.getElementById("manage-results");
        if (!results) {
            return;
        }

        results.hidden = false;
        results.innerHTML =
            '<div class="booking-not-found">' +
                '<h2 class="booking-not-found-title">' + tr("manage.notFoundTitle", "Booking Not Found") + '</h2>' +
                '<p class="booking-not-found-text">' + tr("manage.notFoundText", "We could not find a reservation matching that reference and last name. Please check your details and try again.") + '</p>' +
            "</div>";
    }

    function renderBookingResult(booking) {
        var results = document.getElementById("manage-results");
        if (!results) {
            return;
        }

        var flight = booking.flight || {};
        var passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
        var primaryPassenger = getPassengerName(passengers[0]) || "Passenger";
        var route = flight.from && flight.to
            ? flight.from + " → " + flight.to
            : (flight.route || "—");

        results.hidden = false;
        results.innerHTML =
            '<article class="booking-result-card" aria-label="' + tr("manage.resultAria", "Booking result") + '">' +
                '<div class="booking-result-top">' +
                    "<div>" +
                        '<p class="booking-result-pnr-label">' + tr("manage.bookingReference", "Booking Reference") + '</p>' +
                        '<p class="booking-result-pnr">' + escapeHtml(booking.pnr || "—") + "</p>" +
                    "</div>" +
                    '<p class="booking-status-badge">' + escapeHtml(getBookingStatus(booking)) + "</p>" +
                "</div>" +
                '<dl class="booking-result-meta">' +
                    '<div class="booking-result-meta-item"><dt>' + tr("manage.passenger", "Passenger") + '</dt><dd>' + escapeHtml(primaryPassenger) + "</dd></div>" +
                    '<div class="booking-result-meta-item"><dt>' + tr("manage.flight", "Flight") + '</dt><dd>' + escapeHtml(flight.flightNumber || "—") + "</dd></div>" +
                    '<div class="booking-result-meta-item"><dt>' + tr("manage.route", "Route") + '</dt><dd>' + escapeHtml(route) + "</dd></div>" +
                    '<div class="booking-result-meta-item"><dt>' + tr("manage.date", "Date") + '</dt><dd>' + escapeHtml(formatDisplayDate(flight.departureDate)) + "</dd></div>" +
                "</dl>" +
                '<div class="booking-result-actions">' +
                    '<button class="booking-action-button booking-action-button--primary" type="button" data-action="view">' + tr("manage.viewBooking", "View Booking") + '</button>' +
                    '<button class="booking-action-button booking-action-button--secondary" type="button" data-action="change">' + tr("manage.changeBooking", "Change Booking") + '</button>' +
                    '<button class="booking-action-button booking-action-button--secondary" type="button" data-action="cancel">' + tr("manage.cancelBooking", "Cancel Booking") + '</button>' +
                "</div>" +
            "</article>";

        results.querySelectorAll("[data-action]").forEach(function (button) {
            button.addEventListener("click", function () {
                handleResultAction(button.getAttribute("data-action"));
            });
        });
    }

    function handleResultAction(action) {
        if (!activeBooking) {
            return;
        }

        writeJSON("managedBooking", activeBooking);

        if (action === "view") {
            window.location.href = "booking-details.html?source=manage&intent=view";
            return;
        }

        if (action === "change") {
            window.location.href = "booking-details.html?source=manage&intent=change";
            return;
        }

        if (action === "cancel") {
            window.location.href = "booking-details.html?source=manage&intent=cancel";
        }
    }

    function handleSearch(event) {
        event.preventDefault();
        showMessage("");

        var results = document.getElementById("manage-results");
        if (results) {
            results.hidden = true;
            results.innerHTML = "";
        }

        if (!validateForm()) {
            activeBooking = null;
            return;
        }

        var pnr = document.getElementById("booking-pnr").value;
        var lastName = document.getElementById("passenger-last-name").value;
        var booking = findBooking(pnr, lastName);

        if (!booking) {
            activeBooking = null;
            renderNotFound();
            return;
        }

        activeBooking = booking;
        writeJSON("managedBooking", booking);
        renderBookingResult(booking);
    }

    function initMenuToggle() {
        var header = document.getElementById("site-header");
        if (!header) {
            return;
        }

        var toggle = header.querySelector(".menu-toggle");
        var nav = header.querySelector(".main-navigation");
        if (!toggle || !nav) {
            return;
        }

        function setMenu(open) {
            header.classList.toggle("is-menu-open", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            toggle.setAttribute("aria-label", open ? tr("manage.closeMenu", "Close menu") : tr("manage.openMenu", "Open menu"));
        }

        toggle.addEventListener("click", function () {
            setMenu(!header.classList.contains("is-menu-open"));
        });

        nav.addEventListener("click", function (event) {
            if (event.target.closest("a")) {
                setMenu(false);
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                setMenu(false);
            }
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 1080) {
                setMenu(false);
            }
        });
    }

    function init() {
        var form = document.getElementById("manage-booking-form");
        if (form) {
            form.addEventListener("submit", handleSearch);
        }

        ["booking-pnr", "passenger-last-name"].forEach(function (id) {
            var input = document.getElementById(id);
            if (!input) {
                return;
            }

            input.addEventListener("input", function () {
                clearFieldError(input);
            });
        });

        initMenuToggle();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
