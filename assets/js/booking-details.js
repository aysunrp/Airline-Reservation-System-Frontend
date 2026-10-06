(function () {
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
        baseFare: 1360,
        baggageTotal: 55,
        mealTotal: 38,
        extraServicesTotal: 55,
        taxesFees: 86,
        totalPrice: 1594,
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

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
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

    function formatPrice(price) {
        var amount = Number(price);

        if (!isFinite(amount)) {
            return "$0";
        }

        if (amount === 0) {
            return "$0";
        }

        return "$" + amount.toFixed(amount % 1 === 0 ? 0 : 2);
    }

    function toNumber(value, fallback) {
        var amount = Number(value);
        return isFinite(amount) ? amount : fallback;
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

    function getPassengerName(passenger) {
        if (!passenger || typeof passenger !== "object") {
            return "Passenger";
        }

        if (passenger.fullName || passenger.name) {
            return String(passenger.fullName || passenger.name);
        }

        var name = [passenger.title, passenger.firstName, passenger.middleName, passenger.lastName]
            .map(function (part) {
                return String(part || "").trim();
            })
            .filter(Boolean)
            .join(" ");

        return name || "Passenger";
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

    function showMessage(text) {
        var message = document.getElementById("details-message");
        if (!message) {
            return;
        }

        message.textContent = text || "";
        message.hidden = !text;
    }

    function enrichBooking(booking) {
        var copy = JSON.parse(JSON.stringify(booking || MOCK_BOOKING));
        var baggageData = readJSON("baggageData");
        var mealData = readJSON("mealData");
        var extraServicesData = readJSON("extraServicesData");

        if (!copy.pnr) {
            copy.pnr = MOCK_BOOKING.pnr;
        }

        if (!Array.isArray(copy.baggage) && baggageData && Array.isArray(baggageData.passengers)) {
            copy.baggage = baggageData.passengers;
            copy.baggageTotal = toNumber(baggageData.totalBaggageCost, 0);
        }

        if (!Array.isArray(copy.meals) && mealData && Array.isArray(mealData.passengers)) {
            copy.meals = mealData.passengers;
            copy.mealTotal = toNumber(mealData.totalMealCost, 0);
        }

        if (!Array.isArray(copy.extraServices) && extraServicesData) {
            copy.extraServices = extraServicesData.selectedServices || [];
            copy.extraServicesTotal = toNumber(extraServicesData.extraServicesTotal, 0);
            if (typeof extraServicesData.baseFare === "number") {
                copy.baseFare = extraServicesData.baseFare;
            }
            if (typeof extraServicesData.grandTotal === "number") {
                copy.totalPrice = extraServicesData.grandTotal;
            }
        }

        copy.baggageTotal = toNumber(copy.baggageTotal, 0);
        copy.mealTotal = toNumber(copy.mealTotal, 0);
        copy.extraServicesTotal = toNumber(copy.extraServicesTotal, 0);
        copy.taxesFees = toNumber(copy.taxesFees, Math.round(toNumber(copy.totalPrice, 0) * 0.08));

        if (typeof copy.baseFare !== "number") {
            var remainder = toNumber(copy.totalPrice, 0) -
                copy.baggageTotal -
                copy.mealTotal -
                copy.extraServicesTotal -
                copy.taxesFees;
            copy.baseFare = remainder > 0 ? remainder : toNumber(MOCK_BOOKING.baseFare, 0);
        }

        if (!isFinite(Number(copy.totalPrice))) {
            copy.totalPrice = copy.baseFare +
                copy.baggageTotal +
                copy.mealTotal +
                copy.extraServicesTotal +
                copy.taxesFees;
        }

        return copy;
    }

    function resolveBooking() {
        var managed = readJSON("managedBooking");
        if (managed) {
            return enrichBooking(managed);
        }

        var stored = readJSON("bookingData");
        if (stored) {
            return enrichBooking(stored);
        }

        return JSON.parse(JSON.stringify(MOCK_BOOKING));
    }

    function renderList(elementId, items, mapItem) {
        var list = document.getElementById(elementId);
        if (!list) {
            return;
        }

        if (!items.length) {
            list.innerHTML = '<li class="detail-list-empty">None selected</li>';
            return;
        }

        list.innerHTML = items.map(mapItem).join("");
    }

    function renderPassengers(booking) {
        var passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
        var seats = Array.isArray(booking.selectedSeats) ? booking.selectedSeats : [];

        renderList("details-passengers", passengers, function (passenger, index) {
            var seat = seats[index] ? "Seat " + seats[index] : "Seat not assigned";

            return (
                '<li class="detail-list-item">' +
                    "<div>" +
                        '<p class="detail-list-primary">' + escapeHtml(getPassengerName(passenger)) + "</p>" +
                        '<p class="detail-list-secondary">' + escapeHtml(seat) + "</p>" +
                    "</div>" +
                    '<span class="detail-list-meta">Passenger ' + (index + 1) + "</span>" +
                "</li>"
            );
        });
    }

    function renderBaggage(booking) {
        var items = Array.isArray(booking.baggage) ? booking.baggage : [];

        renderList("details-baggage", items, function (item) {
            var label = item.label || item.optionLabel || "No Extra Baggage";

            return (
                '<li class="detail-list-item">' +
                    "<div>" +
                        '<p class="detail-list-primary">' + escapeHtml(item.name || "Passenger") + "</p>" +
                        '<p class="detail-list-secondary">' + escapeHtml(label) + "</p>" +
                    "</div>" +
                    '<span class="detail-list-meta">' + escapeHtml(formatPrice(item.price)) + "</span>" +
                "</li>"
            );
        });
    }

    function renderMeals(booking) {
        var items = Array.isArray(booking.meals) ? booking.meals : [];

        renderList("details-meals", items, function (item) {
            var passengerName = item.passengerName || item.name || "Passenger";
            var mealName = item.mealName || item.label || "No Meal";

            return (
                '<li class="detail-list-item">' +
                    "<div>" +
                        '<p class="detail-list-primary">' + escapeHtml(passengerName) + "</p>" +
                        '<p class="detail-list-secondary">' + escapeHtml(mealName) + "</p>" +
                    "</div>" +
                    '<span class="detail-list-meta">' + escapeHtml(formatPrice(item.price)) + "</span>" +
                "</li>"
            );
        });
    }

    function renderExtras(booking) {
        var items = Array.isArray(booking.extraServices) ? booking.extraServices : [];

        renderList("details-extras", items, function (item) {
            return (
                '<li class="detail-list-item">' +
                    "<div>" +
                        '<p class="detail-list-primary">' + escapeHtml(item.name || "Service") + "</p>" +
                        '<p class="detail-list-secondary">' + escapeHtml(item.description || "Optional upgrade") + "</p>" +
                    "</div>" +
                    '<span class="detail-list-meta">' + escapeHtml(formatPrice(item.price)) + "</span>" +
                "</li>"
            );
        });
    }

    function renderBooking(booking) {
        var flight = booking.flight || {};
        var seats = Array.isArray(booking.selectedSeats) ? booking.selectedSeats.join(", ") : "—";
        var route = flight.from && flight.to
            ? flight.from + " → " + flight.to
            : (flight.route || "—");

        setText("details-pnr", booking.pnr || "—");
        setText("details-status", getBookingStatus(booking));
        setText("details-flight-number", flight.flightNumber || "—");
        setText("details-route", route);
        setText("details-date", formatDisplayDate(flight.departureDate));
        setText("details-departure", flight.departure || "—");
        setText("details-arrival", flight.arrival || "—");
        setText("details-aircraft", flight.aircraft || "—");
        setText("details-cabin", booking.cabinClass || "—");
        setText("details-seats", seats || "—");

        setText("price-base-fare", formatPrice(booking.baseFare));
        setText("price-baggage", formatPrice(booking.baggageTotal));
        setText("price-meals", formatPrice(booking.mealTotal));
        setText("price-extras", formatPrice(booking.extraServicesTotal));
        setText("price-taxes", formatPrice(booking.taxesFees));
        setText("price-grand-total", formatPrice(booking.totalPrice));

        renderPassengers(booking);
        renderBaggage(booking);
        renderMeals(booking);
        renderExtras(booking);
    }

    function buildConfirmationText(booking) {
        var flight = booking.flight || {};
        var passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
        var lines = [
            "AEROVA Booking Confirmation",
            "PNR: " + (booking.pnr || "—"),
            "Status: " + getBookingStatus(booking),
            "Flight: " + (flight.flightNumber || "—"),
            "Route: " + ((flight.from || "") + " → " + (flight.to || "")),
            "Date: " + formatDisplayDate(flight.departureDate),
            "Departure: " + (flight.departure || "—"),
            "Arrival: " + (flight.arrival || "—"),
            "Cabin: " + (booking.cabinClass || "—"),
            "Seats: " + ((booking.selectedSeats || []).join(", ") || "—"),
            "",
            "Passengers:"
        ];

        passengers.forEach(function (passenger, index) {
            lines.push((index + 1) + ". " + getPassengerName(passenger));
        });

        lines.push("");
        lines.push("Grand Total: " + formatPrice(booking.totalPrice));
        lines.push("Thank you for flying AEROVA.");

        return lines.join("\n");
    }

    function downloadConfirmation() {
        if (!activeBooking) {
            return;
        }

        var content = buildConfirmationText(activeBooking);
        var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");

        link.href = url;
        link.download = "AEROVA-" + (activeBooking.pnr || "booking") + "-confirmation.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function bindActions() {
        var changeButton = document.getElementById("change-booking-button");
        var cancelButton = document.getElementById("cancel-booking-button");
        var downloadButton = document.getElementById("download-confirmation-button");
        var printButton = document.getElementById("print-confirmation-button");

        if (changeButton) {
            changeButton.addEventListener("click", function () {
                showMessage("Change requests are available through AEROVA support. Your booking remains confirmed.");
            });
        }

        if (cancelButton) {
            cancelButton.addEventListener("click", function () {
                showMessage("Cancellation is not completed online yet. Please contact AEROVA support with your PNR.");
            });
        }

        if (downloadButton) {
            downloadButton.addEventListener("click", downloadConfirmation);
        }

        if (printButton) {
            printButton.addEventListener("click", function () {
                window.print();
            });
        }
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
            toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
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
        activeBooking = resolveBooking();
        renderBooking(activeBooking);
        bindActions();
        initMenuToggle();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
