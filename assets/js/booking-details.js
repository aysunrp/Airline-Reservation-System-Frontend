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

    var activeBooking = null;
    var activeAirports = [];
    var cancelQuote = null;
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

    function refundLabel(status) {
        return status ? String(status) : "NotEligible";
    }

    /* One BookingDto from the API in the shape the sections below render. Times are shown at each airport. */
    function toPageBooking(dto, airports) {
        var directory = window.AEROVA_AIRPORTS;
        var leg = dto.legs[0];
        var origin = directory.find(airports, leg.originCode);
        var destination = directory.find(airports, leg.destinationCode);
        var departure = directory.localTime(leg.departureAt, origin.timeZoneId);
        var arrival = directory.localTime(leg.arrivalAt, destination.timeZoneId);

        var passengers = dto.passengers.map(function (passenger) {
            var ticket = passenger.tickets.filter(function (item) { return item.legOrder === leg.legOrder; })[0] || {};
            return {
                title: passenger.title,
                firstName: passenger.firstName,
                middleName: passenger.middleName,
                lastName: passenger.lastName,
                passengerType: passenger.passengerType,
                assignedSeat: ticket.seat || null,
                baggageName: ticket.baggageName || null,
                baggagePrice: ticket.baggagePrice || 0,
                mealName: ticket.mealName || null,
                mealPrice: ticket.mealPrice || 0
            };
        });

        var price = dto.price;
        var booking = {
            pnr: dto.pnr,
            status: dto.status,
            flight: {
                airline: "AEROVA",
                flightNumber: leg.flightNumber,
                from: leg.originCity,
                to: leg.destinationCity,
                route: leg.originCity + " \u2192 " + leg.destinationCity,
                departureDate: departure.date,
                departure: departure.time,
                arrival: arrival.time,
                aircraft: "AEROVA " + leg.aircraftModel,
                utcDepartureAt: leg.departureAt
            },
            cabinClass: leg.cabinClass,
            selectedSeats: passengers.map(function (passenger) { return passenger.assignedSeat; }).filter(Boolean),
            passengers: passengers,
            baggage: passengers.map(function (passenger) {
                return { name: getPassengerName(passenger), label: passenger.baggageName || tr("api.options.noBaggage", "No Extra Baggage"), price: passenger.baggagePrice };
            }),
            meals: passengers.map(function (passenger) {
                return { passengerName: getPassengerName(passenger), mealName: passenger.mealName || tr("api.options.noMeal", "No Meal"), price: passenger.mealPrice };
            }),
            baseFare: price.baseFare,
            baggageTotal: price.baggage,
            mealTotal: price.meals,
            taxesFees: price.taxes,
            discount: price.discount,
            promoCode: price.promoCode,
            totalPrice: price.total
        };

        if (dto.cancellation) {
            booking.refund = { status: refundLabel(dto.cancellation.refundStatus), amount: dto.cancellation.refundAmount };
        }

        return booking;
    }

    function getPageParams() {
        return new URLSearchParams(window.location.search);
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
        renderList("details-passengers", passengers, function (passenger, index) {
            var seat = passenger.assignedSeat
                ? "Seat " + passenger.assignedSeat
                : (passenger.passengerType === "Infant" ? tr("api.bookingDetails.infantNoSeat", "Infant, no seat") : "Seat not assigned");

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

        var discountRow = document.getElementById("price-discount-row");
        if (discountRow) {
            discountRow.hidden = !(booking.discount > 0);
            setText("price-discount", "\u2212" + formatPrice(booking.discount));
        }
        setText("price-grand-total", formatPrice(booking.totalPrice));

        renderPassengers(booking);
        renderBaggage(booking);
        renderMeals(booking);
        renderRefundStatus(booking);
        updateActionAvailability(booking);
    }

    /* The quote the backend gave for this booking, in the shape the cancel window shows. */
    function toCancelQuote(dto, booking) {
        return {
            cabin: normalizeCabin(booking.cabinClass),
            daysBeforeDeparture: dto.daysBeforeDeparture,
            amountPaid: dto.amountPaid,
            feePercent: dto.feePercent,
            cancellationFee: dto.feeAmount,
            refundAmount: dto.refundAmount,
            eligible: dto.isRefundable
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
        var vars = {
            cabin: tr("common." + quote.cabin.toLowerCase(), quote.cabin),
            days: Math.max(quote.daysBeforeDeparture, 0),
            percent: quote.feePercent
        };
        return quote.eligible
            ? tr("cancellation.ruleApplied", "{cabin}, {days} days before departure: {percent}% cancellation fee.", vars)
            : tr("cancellation.ruleNotEligible", "{cabin}, {days} days before departure: not eligible for a refund.", vars);
    }

    function getCancelModal() {
        return document.getElementById("cancel-booking-modal");
    }

    function renderCancelModal() {
        if (!activeBooking || !cancelQuote) {
            return;
        }

        var flight = activeBooking.flight || {};
        var quote = cancelQuote;
        var route = flight.from && flight.to ? flight.from + " \u2192 " + flight.to : (flight.route || "\u2014");

        setText("cancel-modal-pnr", activeBooking.pnr || "\u2014");
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

        // The fare rule table was a demo; only the rule that applies to this booking is shown now.
        var rules = document.querySelector(".cancel-rules");
        if (rules) {
            rules.hidden = true;
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

    function ownerLastName() {
        return activeBooking && activeBooking.passengers[0] ? activeBooking.passengers[0].lastName : "";
    }

    /* The same two calls serve My Trips (signed in) and Manage Booking (reference and last name). */
    function bookingPath(suffix) {
        return "api/bookings/" + encodeURIComponent(activeBooking.pnr) + suffix;
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

        var opener = document.activeElement;
        showMessage("");

        window.AEROVA_API.get(bookingPath("/cancellation-quote?lastName=" + encodeURIComponent(ownerLastName()))).then(function (dto) {
            cancelQuote = toCancelQuote(dto, activeBooking);
            lastFocusedElement = opener;
            renderCancelModal();
            modal.hidden = false;
            document.body.classList.add("has-open-modal");

            var dialog = modal.querySelector(".booking-modal-dialog");
            if (dialog) {
                dialog.focus();
            }
        }).catch(function (error) {
            var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;
            showMessage(isApiError ? error.userMessage : tr("api.bookingDetails.quoteFailed", "We could not check the cancellation terms. Please try again."));
        });
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
        if (!activeBooking || isCancelled(activeBooking)) {
            closeCancelModal();
            showMessage(tr("bookingDetails.alreadyCancelled", "This booking is already cancelled."));
            return;
        }

        var button = document.getElementById("confirm-cancellation-button");
        var pnr = activeBooking.pnr;
        if (button) {
            button.disabled = true;
        }

        window.AEROVA_API.post(bookingPath("/cancel"), { lastName: ownerLastName() }).then(function (dto) {
            activeBooking = toPageBooking(dto, activeAirports);
            renderBooking(activeBooking);
            closeCancelModal();

            var refund = activeBooking.refund;
            showMessage(refund && refund.amount > 0
                ? tr("api.bookingDetails.cancelledWithRefund", "Booking {pnr} has been cancelled. A refund of {amount} was requested (demo: no real payment provider is contacted).", { pnr: pnr, amount: formatPrice(refund.amount) })
                : tr("cancellation.cancelledNoRefund", "Booking {pnr} has been cancelled. It is not eligible for a refund.", { pnr: pnr }));

            var focusTarget = document.getElementById("details-message");
            if (focusTarget) {
                focusTarget.setAttribute("tabindex", "-1");
                focusTarget.focus();
            }
        }).catch(function (error) {
            var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;
            closeCancelModal();
            showMessage(isApiError ? error.userMessage : tr("bookingDetails.cancelFail", "Unable to cancel this booking. Please try again."));
        }).then(function () {
            if (button) {
                button.disabled = false;
            }
        });
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
        if (booking.discount > 0) {
            lines.push("Discount: -" + formatPrice(booking.discount));
        }
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

    /* Replaces the page content with one message (loading, an error or no booking); a null spec brings the content back. */
    function setPageStatus(spec) {
        var container = document.querySelector(".booking-details-page .page-container");
        var intro = document.querySelector(".details-intro");
        if (!container) {
            return;
        }

        var panel = document.getElementById("booking-details-empty");

        Array.prototype.forEach.call(container.children, function (child) {
            if ((intro && child === intro) || child === panel) {
                return;
            }
            if (spec) {
                if (child.getAttribute("data-was-hidden") === null) {
                    child.setAttribute("data-was-hidden", child.hidden ? "1" : "0");
                }
                child.hidden = true;
            } else if (child.getAttribute("data-was-hidden") !== null) {
                child.hidden = child.getAttribute("data-was-hidden") === "1";
                child.removeAttribute("data-was-hidden");
            }
        });

        if (!spec) {
            if (panel) {
                panel.hidden = true;
            }
            return;
        }

        if (!panel) {
            panel = document.createElement("section");
            panel.id = "booking-details-empty";
            panel.className = "details-card";
            container.appendChild(panel);
        }

        panel.hidden = false;
        panel.setAttribute("role", spec.kind === "error" ? "alert" : "status");
        panel.innerHTML =
            '<h2 class="details-card-title">' + escapeHtml(spec.title) + "</h2>" +
            '<p class="details-empty-text">' + escapeHtml(spec.text) + "</p>" +
            (spec.actions && spec.actions.length
                ? '<div class="booking-actions-row">' + spec.actions.map(function (action) {
                    return action.href
                        ? '<a class="booking-action-button booking-action-button--primary" href="' + escapeHtml(action.href) + '">' + escapeHtml(action.label) + "</a>"
                        : '<button class="booking-action-button booking-action-button--primary" type="button" data-status-action="1">' + escapeHtml(action.label) + "</button>";
                }).join("") + "</div>"
                : "");

        var retry = panel.querySelector("[data-status-action]");
        if (retry && spec.onAction) {
            retry.addEventListener("click", spec.onAction);
        }
    }

    function showEmptyBookingState() {
        setPageStatus({
            kind: "notice",
            title: tr("api.bookingDetails.notFoundTitle", "No Booking Found"),
            text: tr("api.bookingDetails.notFoundText", "There is no booking to display. Open one from My Trips, or search by reference in Manage Booking."),
            actions: [
                { label: tr("nav.myTrips", "My Trips"), href: "my-trips.html" },
                { label: tr("nav.manageBooking", "Manage Booking"), href: "manage-booking.html" }
            ]
        });
    }

    /* Which booking to open: one of mine (signed in) or one found with its reference and a passenger's last name. */
    function requestBooking() {
        var params = getPageParams();
        var pnr = String(params.get("pnr") || "").toUpperCase();

        if (String(params.get("source") || "").toLowerCase() === "manage") {
            var managed = readJSON("aerovaManaged");
            if (!managed || !managed.pnr || !managed.lastName) {
                return null;
            }
            return window.AEROVA_API.get("api/bookings/" + encodeURIComponent(managed.pnr) + "?lastName=" + encodeURIComponent(managed.lastName));
        }

        if (/^[A-Z0-9]{6}$/.test(pnr)) {
            return window.AEROVA_API.get("api/bookings/my/" + pnr);
        }

        return null;
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

    function loadBooking() {
        var request = requestBooking();

        if (!request) {
            showEmptyBookingState();
            return;
        }

        setPageStatus({ kind: "loading", title: tr("api.bookingDetails.loadingTitle", "Loading your booking"), text: tr("api.bookingDetails.loadingText", "Please wait a moment."), actions: [] });

        Promise.all([window.AEROVA_AIRPORTS.load(), request]).then(function (results) {
            activeAirports = results[0];
            activeBooking = toPageBooking(results[1], activeAirports);
            setPageStatus(null);
            renderBooking(activeBooking);
            applyIntentActions();
        }).catch(function (error) {
            var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;

            if (!isApiError && window.console) {
                window.console.error(error);
            }

            if (isApiError && error.status === 404) {
                showEmptyBookingState();
                return;
            }

            setPageStatus({
                kind: "error",
                title: tr("api.bookingDetails.errorTitle", "We could not load the booking"),
                text: isApiError ? error.userMessage : tr("api.errors.generic", "Something went wrong. Please try again."),
                actions: [{ label: tr("api.options.retry", "Try again") }],
                onAction: loadBooking
            });
        });
    }

    function init() {
        bindActions();
        initMenuToggle();
        loadBooking();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
