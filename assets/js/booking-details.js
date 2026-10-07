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

    var CABIN_BASE_RATES = {
        Economy: 520,
        Comfort: 680,
        Business: 980
    };

    var DATE_CHANGE_FEE = 50;
    var SEAT_CHANGE_FEE = 25;

    var MOCK_BOOKING = {
        pnr: "AV7K92M",
        status: "Confirmed",
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
    var changeEstimate = {
        currentTotal: 0,
        estimatedTotal: 0,
        difference: 0
    };

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

    function formatSignedPrice(amount) {
        var value = Number(amount) || 0;
        if (value > 0) {
            return "+" + formatPrice(value);
        }
        if (value < 0) {
            return "−" + formatPrice(Math.abs(value));
        }
        return formatPrice(0);
    }

    function toNumber(value, fallback) {
        var amount = Number(value);
        return isFinite(amount) ? amount : fallback;
    }

    function roundMoney(amount) {
        return Math.round(toNumber(amount, 0) * 100) / 100;
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

        var status = String(booking.status || booking.paymentStatus || "Confirmed");
        if (status.toLowerCase() === "paid") {
            return "Confirmed";
        }
        return status;
    }

    function isCancelled(booking) {
        return getBookingStatus(booking).toLowerCase() === "cancelled";
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
            copy.pnr = "—";
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
            if (typeof extraServicesData.grandTotal === "number" && copy.totalPrice == null) {
                copy.totalPrice = extraServicesData.grandTotal;
            }
        }

        copy.baggageTotal = toNumber(copy.baggageTotal, 0);
        copy.mealTotal = toNumber(copy.mealTotal, 0);
        copy.extraServicesTotal = toNumber(copy.extraServicesTotal, 0);
        copy.taxesFees = toNumber(
            copy.taxesFees != null ? copy.taxesFees : copy.taxesAndFees,
            Math.round(toNumber(copy.baseFare, 0) * 0.1)
        );

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

        if (!copy.status) {
            copy.status = getBookingStatus(copy);
        }

        return copy;
    }

    function getPageParams() {
        return new URLSearchParams(window.location.search);
    }

    function isCompletedBooking(booking) {
        if (!booking || typeof booking !== "object") {
            return false;
        }

        var paymentStatus = String(booking.paymentStatus || "").toLowerCase();
        var status = String(booking.status || "").toLowerCase();

        if (paymentStatus === "paid" || status === "confirmed" || status === "cancelled") {
            return true;
        }

        return !!booking.pnr;
    }

    function resolveBooking() {
        var params = getPageParams();
        var source = String(params.get("source") || "").toLowerCase();
        var managed = readJSON("managedBooking");
        var stored = readJSON("bookingData");

        if (source === "manage" && managed) {
            return enrichBooking(managed);
        }

        if ((source === "trips" || !source) && stored && isCompletedBooking(stored)) {
            return enrichBooking(stored);
        }

        if (source !== "trips" && managed) {
            return enrichBooking(managed);
        }

        if (stored && isCompletedBooking(stored)) {
            return enrichBooking(stored);
        }

        return null;
    }

    function persistBooking(booking) {
        var params = getPageParams();
        var source = String(params.get("source") || "").toLowerCase();
        var current = readJSON("bookingData");
        var managed = readJSON("managedBooking");
        var saved = true;

        if (source === "manage") {
            saved = writeJSON("managedBooking", booking);
            if (current && current.pnr && booking.pnr && current.pnr === booking.pnr) {
                writeJSON("bookingData", booking);
            }
            return saved;
        }

        saved = writeJSON("bookingData", booking);
        if (managed && managed.pnr && booking.pnr && managed.pnr === booking.pnr) {
            writeJSON("managedBooking", booking);
        }
        return saved;
    }

    function getPassengerCount(booking) {
        if (Array.isArray(booking.passengers) && booking.passengers.length) {
            return booking.passengers.length;
        }
        var count = toNumber(booking.passengerCount, 0);
        return count > 0 ? count : 1;
    }

    function parseSeats(value) {
        return String(value || "")
            .split(",")
            .map(function (seat) {
                return seat.trim().toUpperCase();
            })
            .filter(Boolean);
    }

    function seatsEqual(a, b) {
        var left = (a || []).slice().sort().join("|");
        var right = (b || []).slice().sort().join("|");
        return left === right;
    }

    function normalizeCabin(cabin) {
        var value = String(cabin || "Economy");
        if (/business/i.test(value)) return "Business";
        if (/comfort/i.test(value)) return "Comfort";
        return "Economy";
    }

    function estimateChangedTotals(booking, nextDate, nextCabin, nextSeats) {
        var passengerCount = getPassengerCount(booking);
        var currentCabin = normalizeCabin(booking.cabinClass);
        var cabin = normalizeCabin(nextCabin);
        var currentDate = booking.flight && booking.flight.departureDate
            ? String(booking.flight.departureDate)
            : "";
        var currentSeats = Array.isArray(booking.selectedSeats) ? booking.selectedSeats : [];

        var currentBase = toNumber(booking.baseFare, CABIN_BASE_RATES[currentCabin] * passengerCount);
        var rateRatio = CABIN_BASE_RATES[cabin] / CABIN_BASE_RATES[currentCabin];
        var nextBase = roundMoney(currentBase * rateRatio);

        var baggage = toNumber(booking.baggageTotal, 0);
        var meals = toNumber(booking.mealTotal, 0);
        var extras = toNumber(booking.extraServicesTotal, 0);
        var taxes = roundMoney(nextBase * 0.1);

        var fees = 0;
        if (nextDate && currentDate && nextDate !== currentDate) {
            fees += DATE_CHANGE_FEE;
        }
        if (!seatsEqual(currentSeats, nextSeats)) {
            fees += SEAT_CHANGE_FEE;
        }

        var estimatedTotal = roundMoney(nextBase + baggage + meals + extras + taxes + fees);
        var currentTotal = roundMoney(toNumber(booking.totalPrice, 0));
        var difference = roundMoney(estimatedTotal - currentTotal);

        return {
            nextBase: nextBase,
            taxes: taxes,
            fees: fees,
            estimatedTotal: estimatedTotal,
            currentTotal: currentTotal,
            difference: difference
        };
    }

    function renderList(elementId, items, mapItem) {
        var list = document.getElementById(elementId);
        if (!list) {
            return;
        }

        if (!items.length) {
            list.innerHTML = '<li class="detail-list-empty">' + tr("bookingDetails.noneSelected", "None selected") + '</li>';
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

    function updateActionAvailability(booking) {
        var changeButton = document.getElementById("change-booking-button");
        var cancelButton = document.getElementById("cancel-booking-button");
        var cancelled = isCancelled(booking);

        if (changeButton) {
            changeButton.disabled = cancelled;
        }
        if (cancelButton) {
            cancelButton.disabled = cancelled;
        }
    }

    function renderBooking(booking) {
        var flight = booking.flight || {};
        var seats = Array.isArray(booking.selectedSeats) ? booking.selectedSeats.join(", ") : "—";
        var route = flight.from && flight.to
            ? flight.from + " → " + flight.to
            : (flight.route || "—");
        var status = getBookingStatus(booking);
        var statusBadge = document.getElementById("details-status");

        setText("details-pnr", booking.pnr || "—");
        setText("details-status", status);
        if (statusBadge) {
            statusBadge.classList.toggle("is-cancelled", status.toLowerCase() === "cancelled");
        }

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
        updateActionAvailability(booking);
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

    function getChangePanel() {
        return document.getElementById("change-booking-panel");
    }

    function getCancelModal() {
        return document.getElementById("cancel-booking-modal");
    }

    function closeChangePanel() {
        var panel = getChangePanel();
        if (panel) {
            panel.hidden = true;
        }
    }

    function openCancelModal() {
        var modal = getCancelModal();
        if (!modal || !activeBooking) {
            return;
        }
        setText("cancel-modal-pnr", activeBooking.pnr || "—");
        modal.hidden = false;
    }

    function closeCancelModal() {
        var modal = getCancelModal();
        if (modal) {
            modal.hidden = true;
        }
    }

    function refreshChangePreview() {
        if (!activeBooking) {
            return;
        }

        var dateInput = document.getElementById("change-flight-date");
        var cabinInput = document.getElementById("change-cabin-class");
        var seatsInput = document.getElementById("change-seats");

        var nextDate = dateInput ? dateInput.value : "";
        var nextCabin = cabinInput ? cabinInput.value : normalizeCabin(activeBooking.cabinClass);
        var nextSeats = parseSeats(seatsInput ? seatsInput.value : "");

        setText("change-new-date-display", nextDate ? formatDisplayDate(nextDate) : "—");
        setText("change-new-cabin-display", nextCabin || "—");
        setText("change-new-seats-display", nextSeats.length ? nextSeats.join(", ") : "—");

        changeEstimate = estimateChangedTotals(activeBooking, nextDate, nextCabin, nextSeats);
        setText("change-current-total", formatPrice(changeEstimate.currentTotal));
        setText("change-estimated-total", formatPrice(changeEstimate.estimatedTotal));
        setText("change-price-difference", formatSignedPrice(changeEstimate.difference));
    }

    function openChangePanel() {
        if (!activeBooking || isCancelled(activeBooking)) {
            showMessage(tr("bookingDetails.cancelledNoChange", "Cancelled bookings cannot be changed."));
            return;
        }

        closeCancelModal();

        var panel = getChangePanel();
        var dateInput = document.getElementById("change-flight-date");
        var cabinInput = document.getElementById("change-cabin-class");
        var seatsInput = document.getElementById("change-seats");
        var flight = activeBooking.flight || {};
        var seats = Array.isArray(activeBooking.selectedSeats) ? activeBooking.selectedSeats : [];

        setText("change-current-date", formatDisplayDate(flight.departureDate));
        setText("change-current-cabin", activeBooking.cabinClass || "—");
        setText("change-current-seats", seats.length ? seats.join(", ") : "—");

        if (dateInput) {
            dateInput.value = flight.departureDate || "";
        }
        if (cabinInput) {
            cabinInput.value = normalizeCabin(activeBooking.cabinClass);
        }
        if (seatsInput) {
            seatsInput.value = seats.join(", ");
        }

        if (panel) {
            panel.hidden = false;
            panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        refreshChangePreview();
        showMessage("");
    }

    function confirmChanges(event) {
        event.preventDefault();

        if (!activeBooking || isCancelled(activeBooking)) {
            showMessage(tr("bookingDetails.cancelledNoChange", "Cancelled bookings cannot be changed."));
            return;
        }

        var dateInput = document.getElementById("change-flight-date");
        var cabinInput = document.getElementById("change-cabin-class");
        var seatsInput = document.getElementById("change-seats");

        var nextDate = dateInput ? dateInput.value : "";
        var nextCabin = cabinInput ? normalizeCabin(cabinInput.value) : "Economy";
        var nextSeats = parseSeats(seatsInput ? seatsInput.value : "");
        var passengerCount = getPassengerCount(activeBooking);

        if (!nextDate) {
            showMessage(tr("bookingDetails.chooseDate", "Please choose a new flight date."));
            if (dateInput) dateInput.focus();
            return;
        }

        if (!nextSeats.length) {
            showMessage(tr("bookingDetails.enterSeats", "Please enter seat selections for your passengers."));
            if (seatsInput) seatsInput.focus();
            return;
        }

        if (nextSeats.length !== passengerCount) {
            showMessage(tr("bookingDetails.exactSeats", "Enter exactly " + passengerCount + " seats.", { count: passengerCount }));
            if (seatsInput) seatsInput.focus();
            return;
        }

        var estimate = estimateChangedTotals(activeBooking, nextDate, nextCabin, nextSeats);
        var updated = JSON.parse(JSON.stringify(activeBooking));

        if (!updated.flight) {
            updated.flight = {};
        }

        updated.flight.departureDate = nextDate;
        updated.cabinClass = nextCabin;
        updated.selectedSeats = nextSeats;
        updated.baseFare = estimate.nextBase;
        updated.taxesFees = estimate.taxes;
        updated.changeFee = estimate.fees;
        updated.totalPrice = estimate.estimatedTotal;
        updated.status = "Confirmed";
        if (updated.paymentStatus === "Cancelled") {
            updated.paymentStatus = "Paid";
        }

        if (!persistBooking(updated)) {
            showMessage(tr("bookingDetails.saveFail", "Unable to save booking changes. Please try again."));
            return;
        }

        activeBooking = enrichBooking(updated);
        renderBooking(activeBooking);
        closeChangePanel();

        var differenceNote = estimate.difference === 0
            ? "No fare difference."
            : (estimate.difference > 0
                ? "Additional amount due: " + formatPrice(estimate.difference) + "."
                : "Estimated refund: " + formatPrice(Math.abs(estimate.difference)) + ".");

        showMessage(tr("bookingDetails.updated", "Booking updated successfully. " + differenceNote, { note: differenceNote }));
    }

    function confirmCancellation() {
        if (!activeBooking || isCancelled(activeBooking)) {
            closeCancelModal();
            return;
        }

        var updated = JSON.parse(JSON.stringify(activeBooking));
        updated.status = "Cancelled";
        updated.paymentStatus = "Cancelled";

        if (!persistBooking(updated)) {
            showMessage(tr("bookingDetails.cancelFail", "Unable to cancel this booking. Please try again."));
            closeCancelModal();
            return;
        }

        activeBooking = enrichBooking(updated);
        renderBooking(activeBooking);
        closeChangePanel();
        closeCancelModal();
        showMessage(tr("bookingDetails.cancelled", "Booking " + (activeBooking.pnr || "") + " has been cancelled.", { pnr: activeBooking.pnr || "" }));
    }

    function bindActions() {
        var changeButton = document.getElementById("change-booking-button");
        var cancelButton = document.getElementById("cancel-booking-button");
        var downloadButton = document.getElementById("download-confirmation-button");
        var printButton = document.getElementById("print-confirmation-button");
        var changeForm = document.getElementById("change-booking-form");
        var cancelChangesButton = document.getElementById("cancel-changes-button");
        var confirmCancellationButton = document.getElementById("confirm-cancellation-button");
        var dateInput = document.getElementById("change-flight-date");
        var cabinInput = document.getElementById("change-cabin-class");
        var seatsInput = document.getElementById("change-seats");

        if (changeButton) {
            changeButton.addEventListener("click", openChangePanel);
        }

        if (cancelButton) {
            cancelButton.addEventListener("click", function () {
                if (!activeBooking || isCancelled(activeBooking)) {
                    showMessage(tr("bookingDetails.alreadyCancelled", "This booking is already cancelled."));
                    return;
                }
                closeChangePanel();
                openCancelModal();
            });
        }

        if (changeForm) {
            changeForm.addEventListener("submit", confirmChanges);
        }

        if (cancelChangesButton) {
            cancelChangesButton.addEventListener("click", function () {
                closeChangePanel();
                showMessage("");
            });
        }

        if (confirmCancellationButton) {
            confirmCancellationButton.addEventListener("click", confirmCancellation);
        }

        document.querySelectorAll("[data-close-cancel-modal]").forEach(function (el) {
            el.addEventListener("click", closeCancelModal);
        });

        if (dateInput) {
            dateInput.addEventListener("change", refreshChangePreview);
            dateInput.addEventListener("input", refreshChangePreview);
        }
        if (cabinInput) {
            cabinInput.addEventListener("change", refreshChangePreview);
        }
        if (seatsInput) {
            seatsInput.addEventListener("input", refreshChangePreview);
        }

        if (downloadButton) {
            downloadButton.addEventListener("click", downloadConfirmation);
        }

        if (printButton) {
            printButton.addEventListener("click", function () {
                window.print();
            });
        }

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeCancelModal();
            }
        });
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

    function showEmptyBookingState() {
        var container = document.querySelector(".booking-details-page .page-container");
        var intro = document.querySelector(".details-intro");
        if (!container) {
            return;
        }

        Array.prototype.forEach.call(container.children, function (child) {
            if (intro && child === intro) {
                return;
            }
            child.hidden = true;
        });

        var empty = document.getElementById("booking-details-empty");
        if (!empty) {
            empty = document.createElement("section");
            empty.id = "booking-details-empty";
            empty.className = "details-card";
            empty.innerHTML =
                "<h2 class=\"details-card-title\">No Booking Found</h2>" +
                "<p class=\"change-booking-intro\">There is no confirmed booking to display. Complete a booking or search by PNR in Manage Booking.</p>" +
                "<div class=\"booking-actions-row\">" +
                    "<a class=\"booking-action-button booking-action-button--primary\" href=\"my-trips.html\">My Trips</a>" +
                    "<a class=\"booking-action-button booking-action-button--secondary\" href=\"manage-booking.html\">Manage Booking</a>" +
                "</div>";
            container.appendChild(empty);
        } else {
            empty.hidden = false;
        }
    }

    function applyIntentActions() {
        var intent = String(getPageParams().get("intent") || "").toLowerCase();
        if (!activeBooking || !intent) {
            return;
        }

        if (intent === "change") {
            openChangePanel();
            return;
        }

        if (intent === "cancel") {
            openCancelModal();
        }
    }

    function init() {
        activeBooking = resolveBooking();
        bindActions();
        initMenuToggle();

        if (!activeBooking) {
            showEmptyBookingState();
            return;
        }

        renderBooking(activeBooking);
        applyIntentActions();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
