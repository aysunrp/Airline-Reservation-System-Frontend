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

    /*
     * MOCK / DEMO fare rules for cancellations (not real AEROVA fare conditions).
     * Bands are checked from the top; "minDays" is the minimum number of whole
     * days between today and the departure date. feePercent applies to the
     * amount paid; null means the booking is not eligible for a refund.
     */
    var CANCELLATION_FARE_RULES = {
        Economy: [
            { minDays: 30, feePercent: 20 },
            { minDays: 14, feePercent: 40 },
            { minDays: -Infinity, feePercent: null }
        ],
        Comfort: [
            { minDays: 30, feePercent: 10 },
            { minDays: 7, feePercent: 25 },
            { minDays: 1, feePercent: 50 },
            { minDays: -Infinity, feePercent: null }
        ],
        Business: [
            { minDays: 7, feePercent: 0 },
            { minDays: 1, feePercent: 15 },
            { minDays: -Infinity, feePercent: null }
        ]
    };

    /* Demo only: a Pending refund request is shown as Processing after this delay. Never Completed. */
    var MOCK_REFUND_PROCESSING_DELAY_MS = 2 * 60 * 1000;

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
        taxesFees: 86,
        totalPrice: 1539,
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
        ]
    };

    var activeBooking = null;
    var lastFocusedElement = null;

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

        /*
         * Extra services are not part of the booking flow. Bookings saved by an
         * older version may still carry extraServicesTotal / extraServices that
         * were folded into totalPrice; take that amount back out and drop the fields.
         */
        var legacyExtras = toNumber(copy.extraServicesTotal, NaN);
        if (!isFinite(legacyExtras)) {
            legacyExtras = Array.isArray(copy.extraServices)
                ? copy.extraServices.reduce(function (sum, item) { return sum + toNumber(item && item.price, 0); }, 0)
                : 0;
        }

        if (legacyExtras > 0 && isFinite(Number(copy.totalPrice))) {
            copy.totalPrice = Number(copy.totalPrice) - legacyExtras;
        }

        delete copy.extraServices;
        delete copy.extraServicesTotal;
        copy.baggageTotal = toNumber(copy.baggageTotal, 0);
        copy.mealTotal = toNumber(copy.mealTotal, 0);
        copy.taxesFees = toNumber(
            copy.taxesFees != null ? copy.taxesFees : copy.taxesAndFees,
            Math.round(toNumber(copy.baseFare, 0) * 0.1)
        );

        if (typeof copy.baseFare !== "number") {
            var remainder = toNumber(copy.totalPrice, 0) -
                copy.baggageTotal -
                copy.mealTotal -
                copy.taxesFees;
            copy.baseFare = remainder > 0 ? remainder : toNumber(MOCK_BOOKING.baseFare, 0);
        }

        if (!isFinite(Number(copy.totalPrice))) {
            copy.totalPrice = copy.baseFare +
                copy.baggageTotal +
                copy.mealTotal +
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

    function normalizeCabin(cabin) {
        var value = String(cabin || "Economy");
        if (/business/i.test(value)) return "Business";
        if (/comfort/i.test(value)) return "Comfort";
        return "Economy";
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

    function renderBooking(booking) {
        var flight = booking.flight || {};
        var seats = Array.isArray(booking.selectedSeats) ? booking.selectedSeats.join(", ") : "—";
        var route = flight.from && flight.to
            ? flight.from + " → " + flight.to
            : (flight.route || "—");
        var status = getBookingStatus(booking);
        var statusBadge = document.getElementById("details-status");

        setText("details-pnr", booking.pnr || "—");
        if (statusBadge) {
            var statusKey = status.toLowerCase() === "cancelled" ? "trips.statusCancelled" : (status.toLowerCase() === "confirmed" ? "trips.statusConfirmed" : "");
            if (statusKey) {
                statusBadge.setAttribute("data-i18n", statusKey);
                statusBadge.textContent = tr(statusKey, status);
            } else {
                statusBadge.removeAttribute("data-i18n");
                statusBadge.textContent = status;
            }
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
        setText("price-taxes", formatPrice(booking.taxesFees));
        setText("price-grand-total", formatPrice(booking.totalPrice));

        renderPassengers(booking);
        renderBaggage(booking);
        renderMeals(booking);
        renderRefundStatus(booking);
        updateActionAvailability(booking);
    }

    function getDaysBeforeDeparture(dateValue) {
        var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ""));
        if (!match) {
            return null;
        }

        var departure = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        var today = new Date();
        today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return Math.round((departure.getTime() - today.getTime()) / 86400000);
    }

    function getCancellationQuote(booking) {
        var cabin = normalizeCabin(booking.cabinClass);
        var flight = booking.flight || {};
        var days = getDaysBeforeDeparture(flight.departureDate);
        var amountPaid = roundMoney(toNumber(booking.totalPrice, 0));
        var rules = CANCELLATION_FARE_RULES[cabin];
        var band = null;

        if (days !== null) {
            for (var i = 0; i < rules.length; i += 1) {
                if (days >= rules[i].minDays) {
                    band = rules[i];
                    break;
                }
            }
        }

        var eligible = !!band && band.feePercent !== null && amountPaid > 0;
        var fee = eligible ? roundMoney(amountPaid * band.feePercent / 100) : amountPaid;
        var refund = eligible ? roundMoney(amountPaid - fee) : 0;

        return {
            cabin: cabin,
            daysBeforeDeparture: days,
            amountPaid: amountPaid,
            feePercent: eligible ? band.feePercent : null,
            cancellationFee: fee,
            refundAmount: refund,
            eligible: eligible
        };
    }

    function getRefundStatusKey(status) {
        var value = String(status || "").toLowerCase().replace(/[^a-z]/g, "");
        if (value === "processing") return "processing";
        if (value === "completed") return "completed";
        if (value === "noteligible") return "notEligible";
        return "pending";
    }

    function getRefundStatusLabel(status) {
        var key = getRefundStatusKey(status);
        var fallback = { pending: "Pending", processing: "Processing", completed: "Completed", notEligible: "Not Eligible" }[key];
        return tr("cancellation.status." + key, fallback);
    }

    function advanceMockRefund(booking) {
        var refund = booking && booking.refund;
        if (!refund || refund.status !== "Pending" || !refund.requestedAt) {
            return false;
        }

        var requested = new Date(refund.requestedAt).getTime();
        if (isFinite(requested) && Date.now() - requested >= MOCK_REFUND_PROCESSING_DELAY_MS) {
            refund.status = "Processing";
            refund.updatedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    function renderRefundStatus(booking) {
        var box = document.getElementById("details-refund");
        if (!box) {
            return;
        }

        var refund = booking.refund;
        if (!isCancelled(booking) || !refund) {
            box.hidden = true;
            box.innerHTML = "";
            return;
        }

        var key = getRefundStatusKey(refund.status);
        box.hidden = false;
        box.innerHTML =
            '<p class="details-refund-label">' + escapeHtml(tr("cancellation.refundStatus", "Refund status")) + "</p>" +
            '<p class="details-refund-row">' +
                '<span class="refund-status-badge refund-status-badge--' + key + '">' + escapeHtml(getRefundStatusLabel(refund.status)) + "</span>" +
                (key === "notEligible"
                    ? ""
                    : '<span class="details-refund-amount">' + escapeHtml(formatPrice(refund.amount)) + "</span>") +
            "</p>" +
            (refund.reference
                ? '<p class="details-refund-meta">' + escapeHtml(tr("cancellation.refundReference", "Refund request {ref}", { ref: refund.reference })) + "</p>"
                : "") +
            '<p class="details-refund-meta">' + escapeHtml(tr("cancellation.demoShort", "Demo refund status: no real payment provider is contacted.")) + "</p>";
    }

    function updateActionAvailability(booking) {
        var cancelButton = document.getElementById("cancel-booking-button");
        if (cancelButton) {
            var cancelled = isCancelled(booking);
            cancelButton.disabled = cancelled;
            cancelButton.hidden = cancelled;
        }
    }

    function describeRule(quote) {
        if (quote.daysBeforeDeparture === null) {
            return tr("cancellation.ruleUnknownDate", "Departure date unavailable: not eligible for a refund.");
        }
        var vars = {
            cabin: tr("common." + quote.cabin.toLowerCase(), quote.cabin),
            days: Math.max(quote.daysBeforeDeparture, 0),
            percent: quote.feePercent
        };
        if (quote.daysBeforeDeparture < 0) {
            return tr("cancellation.ruleDeparted", "This flight has already departed: not eligible for a refund.");
        }
        return quote.eligible
            ? tr("cancellation.ruleApplied", "{cabin}, {days} days before departure: {percent}% cancellation fee.", vars)
            : tr("cancellation.ruleNotEligible", "{cabin}, {days} days before departure: not eligible for a refund.", vars);
    }

    function describeRuleTable() {
        return Object.keys(CANCELLATION_FARE_RULES).map(function (cabin) {
            var bands = CANCELLATION_FARE_RULES[cabin].map(function (band, index, list) {
                var upper = index > 0 ? list[index - 1].minDays - 1 : null;
                var range = band.minDays === -Infinity
                    ? tr("cancellation.lessThanDays", "< {days} d", { days: list[index - 1] ? list[index - 1].minDays : 0 })
                    : (upper === null
                        ? tr("cancellation.atLeastDays", "≥ {days} d", { days: band.minDays })
                        : tr("cancellation.rangeDays", "{from}–{to} d", { from: band.minDays, to: upper }));
                var value = band.feePercent === null
                    ? getRefundStatusLabel("Not Eligible")
                    : tr("cancellation.feePercent", "{percent}% fee", { percent: band.feePercent });
                return range + ": " + value;
            }).join(" · ");
            return "<li><strong>" + escapeHtml(tr("common." + cabin.toLowerCase(), cabin)) + "</strong> " + escapeHtml(bands) + "</li>";
        }).join("");
    }

    function getCancelModal() {
        return document.getElementById("cancel-booking-modal");
    }

    function renderCancelModal() {
        if (!activeBooking) {
            return;
        }

        var flight = activeBooking.flight || {};
        var quote = getCancellationQuote(activeBooking);
        var route = flight.from && flight.to ? flight.from + " → " + flight.to : (flight.route || "—");

        setText("cancel-modal-pnr", activeBooking.pnr || "—");
        setText("cancel-modal-route", route);
        setText("cancel-modal-date", formatDisplayDate(flight.departureDate));
        setText("cancel-modal-paid", formatPrice(quote.amountPaid));
        setText("cancel-modal-fee", formatPrice(quote.cancellationFee));
        setText("cancel-modal-refund", quote.eligible ? formatPrice(quote.refundAmount) : getRefundStatusLabel("Not Eligible"));
        setText("cancel-modal-rule", describeRule(quote));

        var refundRow = document.getElementById("cancel-modal-refund-row");
        if (refundRow) {
            refundRow.classList.toggle("is-not-eligible", !quote.eligible);
        }

        var notice = document.getElementById("cancel-modal-not-eligible");
        if (notice) {
            notice.hidden = quote.eligible;
        }

        var table = document.getElementById("cancel-modal-rules");
        if (table) {
            table.innerHTML = describeRuleTable();
        }
    }

    function getFocusable(container) {
        return Array.prototype.filter.call(
            container.querySelectorAll("button, [href], input, select, textarea, summary, [tabindex]:not([tabindex='-1'])"),
            function (el) {
                return !el.disabled && !el.hidden && el.offsetParent !== null;
            }
        );
    }

    function openCancelModal() {
        var modal = getCancelModal();
        if (!modal || !activeBooking) {
            return;
        }

        if (isCancelled(activeBooking)) {
            showMessage(tr("bookingDetails.alreadyCancelled", "This booking is already cancelled."));
            return;
        }

        lastFocusedElement = document.activeElement;
        renderCancelModal();
        modal.hidden = false;
        document.body.classList.add("has-open-modal");

        var dialog = modal.querySelector(".booking-modal-dialog");
        if (dialog) {
            dialog.focus();
        }
    }

    function closeCancelModal() {
        var modal = getCancelModal();
        if (!modal || modal.hidden) {
            return;
        }

        modal.hidden = true;
        document.body.classList.remove("has-open-modal");

        if (lastFocusedElement && typeof lastFocusedElement.focus === "function" && !lastFocusedElement.hidden && !lastFocusedElement.disabled) {
            lastFocusedElement.focus();
        } else {
            var title = document.getElementById("reference-title");
            if (title) {
                title.setAttribute("tabindex", "-1");
                title.focus();
            }
        }
        lastFocusedElement = null;
    }

    function trapModalFocus(event) {
        var modal = getCancelModal();
        if (!modal || modal.hidden || event.key !== "Tab") {
            return;
        }

        var focusable = getFocusable(modal);
        if (!focusable.length) {
            return;
        }

        var first = focusable[0];
        var last = focusable[focusable.length - 1];

        if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement) || document.activeElement === modal.querySelector(".booking-modal-dialog"))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function confirmCancellation() {
        /* Guard: a cancelled booking can never be cancelled (or refunded) twice. */
        var latest = resolveBooking();
        if (!activeBooking || isCancelled(activeBooking) || (latest && isCancelled(latest))) {
            if (latest) {
                activeBooking = latest;
                renderBooking(activeBooking);
            }
            closeCancelModal();
            showMessage(tr("bookingDetails.alreadyCancelled", "This booking is already cancelled."));
            return;
        }

        var quote = getCancellationQuote(activeBooking);
        var now = new Date().toISOString();
        var updated = JSON.parse(JSON.stringify(activeBooking));

        updated.status = "Cancelled";
        updated.paymentStatus = "Cancelled";
        updated.cancellation = {
            cancelledAt: now,
            daysBeforeDeparture: quote.daysBeforeDeparture,
            fareRuleCabin: quote.cabin,
            feePercent: quote.feePercent,
            amountPaid: quote.amountPaid,
            cancellationFee: quote.cancellationFee,
            refundableAmount: quote.refundAmount,
            mock: true
        };
        updated.refund = quote.eligible
            ? {
                reference: "RF-" + String(updated.pnr || "BOOKING").toUpperCase(),
                status: "Pending",
                amount: quote.refundAmount,
                requestedAt: now,
                updatedAt: now,
                mock: true
            }
            : {
                status: "Not Eligible",
                amount: 0,
                updatedAt: now,
                mock: true
            };

        if (!persistBooking(updated)) {
            showMessage(tr("bookingDetails.cancelFail", "Unable to cancel this booking. Please try again."));
            closeCancelModal();
            return;
        }

        activeBooking = enrichBooking(updated);
        renderBooking(activeBooking);
        closeCancelModal();
        showMessage(quote.eligible
            ? tr("cancellation.cancelledWithRefund", "Booking {pnr} has been cancelled. Refund request {ref} for {amount} is Pending (demo).", {
                pnr: activeBooking.pnr || "",
                ref: updated.refund.reference,
                amount: formatPrice(quote.refundAmount)
            })
            : tr("cancellation.cancelledNoRefund", "Booking {pnr} has been cancelled. It is not eligible for a refund.", { pnr: activeBooking.pnr || "" }));

        var cancelButton = document.getElementById("cancel-booking-button");
        var focusTarget = document.getElementById("details-message");
        if (focusTarget && (!cancelButton || cancelButton.hidden)) {
            focusTarget.setAttribute("tabindex", "-1");
            focusTarget.focus();
        }
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

    function getCancelModal() {
        return document.getElementById("cancel-booking-modal");
    }

    function bindActions() {
        var cancelButton = document.getElementById("cancel-booking-button");
        var downloadButton = document.getElementById("download-confirmation-button");
        var printButton = document.getElementById("print-confirmation-button");
        var confirmCancellationButton = document.getElementById("confirm-cancellation-button");

        if (cancelButton) {
            cancelButton.addEventListener("click", function () {
                if (!activeBooking || isCancelled(activeBooking)) {
                    showMessage(tr("bookingDetails.alreadyCancelled", "This booking is already cancelled."));
                    return;
                }
                openCancelModal();
            });
        }

        if (confirmCancellationButton) {
            confirmCancellationButton.addEventListener("click", confirmCancellation);
        }

        document.querySelectorAll("[data-close-cancel-modal]").forEach(function (el) {
            el.addEventListener("click", closeCancelModal);
        });

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
                return;
            }
            trapModalFocus(event);
        });

        window.addEventListener("aerova:languagechange", function () {
            if (!activeBooking) {
                return;
            }
            renderBooking(activeBooking);
            var modal = getCancelModal();
            if (modal && !modal.hidden) {
                renderCancelModal();
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
            if (window.innerWidth > 1366) {
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
                "<p class=\"details-empty-text\">There is no confirmed booking to display. Complete a booking or search by PNR in Manage Booking.</p>" +
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

        if (intent === "cancel") {
            openCancelModal();
        }
    }

    function init() {
        activeBooking = resolveBooking();
        if (activeBooking && advanceMockRefund(activeBooking)) {
            persistBooking(activeBooking);
        }
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
