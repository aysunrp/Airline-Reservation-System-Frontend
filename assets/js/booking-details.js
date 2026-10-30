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
        "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
        "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
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

        return (day < 10 ? "0" + day : day) + "." + (month < 10 ? "0" + month : month) + "." + year;
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

        function pageFlight(item) {
            var from = directory.find(airports, item.originCode);
            var to = directory.find(airports, item.destinationCode);
            var out = directory.localTime(item.departureAt, from.timeZoneId);
            var back = directory.localTime(item.arrivalAt, to.timeZoneId);
            return {
                flightNumber: item.flightNumber,
                route: item.originCity + " \u2192 " + item.destinationCity,
                departureDate: out.date,
                departure: out.time,
                arrival: back.time,
                aircraft: "AEROVA " + item.aircraftModel,
                cabinClass: item.cabinClass
            };
        }

        var seatsByLeg = dto.legs.map(function () { return []; });

        var passengers = dto.passengers.map(function (passenger) {
            var ticket = passenger.tickets.filter(function (item) { return item.legOrder === leg.legOrder; })[0] || {};
            var perLeg = dto.legs.map(function (item, index) {
                var other = passenger.tickets.filter(function (candidate) { return candidate.legOrder === item.legOrder; })[0];
                if (other && other.seat) {
                    seatsByLeg[index].push(other.seat);
                    return other.seat;
                }
                return null;
            });
            return {
                title: passenger.title,
                firstName: passenger.firstName,
                middleName: passenger.middleName,
                lastName: passenger.lastName,
                passengerType: passenger.passengerType,
                assignedSeat: perLeg.filter(Boolean).join(" | ") || null,
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
            // The other flights of the trip: the return flight of a round trip, or the next flights of a multi-city trip.
            multiCity: dto.tripType === "MultiCity",
            extraFlights: dto.legs.slice(1).map(function (item, index) {
                var other = pageFlight(item);
                other.seats = seatsByLeg[index + 1].join(", ");
                return other;
            }),
            selectedSeats: seatsByLeg[0],
            passengers: passengers,
            baggage: passengers.map(function (passenger) {
                return { name: getPassengerName(passenger), label: passenger.baggageName || tr("api.options.noBaggage", "Əlavə baqaj yoxdur"), price: passenger.baggagePrice };
            }),
            meals: passengers.map(function (passenger) {
                return { passengerName: getPassengerName(passenger), mealName: passenger.mealName || tr("api.options.noMeal", "Yemək yoxdur"), price: passenger.mealPrice };
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
            var cancelled = dto.cancellation;
            booking.refund = {
                status: refundLabel(cancelled.refundStatus),
                amount: cancelled.refundAmount,
                paid: cancelled.amountPaid,
                fee: cancelled.feeAmount,
                currency: cancelled.currency || "USD",
                reason: cancelled.reason || "",
                requestedAt: cancelled.requestedAt,
                demo: !!cancelled.refundIsDemo
            };
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
            list.innerHTML = '<li class="detail-list-empty">' + tr("bookingDetails.noneSelected", "Seçilməyib") + '</li>';
            return;
        }

        list.innerHTML = items.map(mapItem).join("");
    }

    function renderPassengers(booking) {
        var passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
        renderList("details-passengers", passengers, function (passenger, index) {
            var seat = passenger.assignedSeat
                ? "Seat " + passenger.assignedSeat
                : (passenger.passengerType === "Infant" ? tr("api.bookingDetails.infantNoSeat", "Körpə, yer yoxdur") : "Oturacaq təyin edilməyib");

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
            var label = item.label || item.optionLabel || "Əlavə baqaj yoxdur";

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
            var mealName = item.mealName || item.label || "Yemək yoxdur";

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

    /* Every other flight of the trip gets a flight card of its own, filled like the first one. */
    function renderReturnFlight(booking) {
        var card = document.querySelector('article[aria-labelledby="flight-info-title"]');
        var extra = booking.extraFlights || [];
        var copies = window.AEROVA_JOURNEY ? window.AEROVA_JOURNEY.ensureLegCards(card, extra.length, function (number) {
            return booking.multiCity ? tr("api.journey.flightTitle", "Reys {n}", { n: number }) : tr("api.journey.returnFlightTitle", "Qayıdış reysi");
        }) : [];

        copies.forEach(function (copy, index) {
            var flight = extra[index];
            var suffix = copy.suffix;

            setText("details-flight-number" + suffix, flight.flightNumber);
            setText("details-route" + suffix, flight.route);
            setText("details-date" + suffix, formatDisplayDate(flight.departureDate));
            setText("details-departure" + suffix, flight.departure);
            setText("details-arrival" + suffix, flight.arrival);
            setText("details-aircraft" + suffix, flight.aircraft);
            setText("details-cabin" + suffix, flight.cabinClass);
            setText("details-seats" + suffix, flight.seats || "\u2014");
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
        renderReturnFlight(booking);
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
        if (value === "failed") return "failed";
        if (value === "cancelled" || value === "canceled") return "cancelled";
        return "pending";
    }

    function getRefundStatusLabel(status) {
        var key = getRefundStatusKey(status);
        var fallback = { pending: "Pending", processing: "Processing", completed: "Completed", notEligible: "Uyğun deyil", failed: "Failed", cancelled: "Cancelled" }[key];
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
            '<p class="details-refund-label">' + escapeHtml(tr("cancellation.refundStatus", "Geri ödəniş statusu")) + "</p>" +
            '<p class="details-refund-row">' +
                '<span class="refund-status-badge refund-status-badge--' + key + '">' + escapeHtml(getRefundStatusLabel(refund.status)) + "</span>" +
                (key === "notEligible"
                    ? ""
                    : '<span class="details-refund-amount">' + escapeHtml(formatPrice(refund.amount)) + "</span>") +
            "</p>" +
            (refund.reference
                ? '<p class="details-refund-meta">' + escapeHtml(tr("cancellation.refundReference", "Geri ödəniş sorğusu {ref}", { ref: refund.reference })) + "</p>"
                : "") +
            refundFactsMarkup(key, refund) +
            refundNoteMarkup(key, refund, booking);

        var refresh = document.getElementById("details-refund-refresh");
        if (refresh) {
            refresh.addEventListener("click", function () {
                refreshRefundStatus(refresh);
            });
        }
    }

    function money(amount, currency) {
        var value = Number(amount);
        return (isFinite(value) ? value : 0).toFixed(2) + " " + String(currency || "USD").toUpperCase();
    }

    function shortDate(value) {
        if (!value) return "";
        var text = String(value);
        var date = new Date(/(Z|[+-]\d\d:?\d\d)$/i.test(text) ? text : text + "Z");
        if (isNaN(date.getTime())) return "";
        // Day.month.year reads the same in all three languages (some browsers have no Azerbaijani month names).
        var pad = function (n) { return (n < 10 ? "0" : "") + n; };
        return pad(date.getDate()) + "." + pad(date.getMonth() + 1) + "." + date.getFullYear();
    }

    /*
     * The amounts the server saved when the booking was cancelled (never worked out on the page): what was paid, the fee the fare rules
     * keep, what comes back and what does not (a partial refund), and where it goes. A Stripe refund goes back to the card that paid.
     */
    function refundFactsMarkup(key, refund) {
        var rows = [];
        var cancelledOn = shortDate(refund.requestedAt);
        if (cancelledOn) rows.push([tr("cancellation.factsCancelledOn", "Ləğv tarixi"), cancelledOn]);
        if (refund.reason) rows.push([tr("cancellation.factsReason", "Səbəb"), refund.reason]);
        if (refund.paid != null) rows.push([tr("cancellation.factsPaid", "Ödənilən məbləğ"), money(refund.paid, refund.currency)]);
        if (Number(refund.fee) > 0) rows.push([tr("cancellation.factsFee", "Ləğv cəriməsi"), money(refund.fee, refund.currency)]);
        if (key !== "notEligible") {
            rows.push([tr("cancellation.factsRefund", "Qaytarılacaq məbləğ"), money(refund.amount, refund.currency)]);
            var kept = Number(refund.paid) - Number(refund.amount);
            if (kept > 0.004 && Number(refund.amount) > 0) rows.push([tr("cancellation.factsKept", "Qaytarılmayan məbləğ"), money(kept, refund.currency)]);
            rows.push([tr("cancellation.factsMethod", "Qaytarılır"), refund.demo
                ? tr("cancellation.methodOther", "İlkin ödəniş üsuluna")
                : tr("cancellation.methodCard", "Ödəniş etdiyiniz karta")]);
        }

        if (!rows.length) return "";
        return '<dl class="details-refund-facts">' + rows.map(function (row) {
            return '<div class="details-refund-fact"><dt>' + escapeHtml(row[0]) + "</dt><dd>" + escapeHtml(row[1]) + "</dd></div>";
        }).join("") + "</dl>";
    }

    /* What the traveller should know about the refund as it stands. A demo refund says so; a Stripe refund is never shown as arrived before Stripe confirms it. */
    function refundNoteMarkup(key, refund, booking) {
        if (refund.demo) {
            return '<p class="details-refund-meta">' + escapeHtml(tr("cancellation.demoShort", "Demo geri ödəniş statusu: real ödəniş provayderi ilə əlaqə saxlanılmır.")) + "</p>";
        }

        var fallbacks = {
            pending: "Pulun ödəniş etdiyiniz karta qaytarılması üçün sorğu göndərilib. Hələ heç nə qaytarılmayıb; təsdiqlənəndə burada görünəcək.",
            processing: "Pulun geri qaytarılması ilkin ödəniş zamanı istifadə etdiyiniz karta başladılıb və hələ emal olunur. Emal bitdikdən sonra məbləğin bank çıxarışınızda görünməsi adətən 5–10 iş günü çəkir.",
            completed: "Stripe pulun ilkin ödəniş zamanı istifadə etdiyiniz karta qaytarılmasını təsdiqlədi. Məbləğin bank çıxarışınızda görünməsi bankınızdan asılı olaraq adətən 5–10 iş günü çəkə bilər; bu, təxmini müddətdir, zəmanət deyil.",
            failed: "Geri ödəniş alınmadı, amma rezervasiyanız ləğv olunub. Rezervasiya kodu {pnr} ilə AEROVA dəstəyinə müraciət edin, pulunuzu qaytaracağıq.",
            cancelled: "Geri ödəniş bankınıza çatmamış ləğv olundu. Rezervasiya kodu {pnr} ilə AEROVA dəstəyinə müraciət edin."
        };
        var note = fallbacks[key] ? tr("cancellation.note." + key, fallbacks[key], { pnr: booking.pnr }) : "";
        var open = key === "pending" || key === "processing";

        var late = key === "processing" || key === "completed"
            ? '<p class="details-refund-meta">' + escapeHtml(tr("cancellation.noteLate", "Məbləğ 10 iş günündən sonra da görünməsə, əvvəlcə bankınızla, lazım olduqda isə AEROVA dəstəyi ilə əlaqə saxlayın.")) + "</p>"
            : "";

        return (note ? '<p class="details-refund-meta details-refund-meta--' + key + '">' + escapeHtml(note) + "</p>" : "") + late +
            (open
                ? '<button type="button" class="details-refund-refresh" id="details-refund-refresh">' + escapeHtml(tr("cancellation.refreshStatus", "Geri ödəniş statusuna bax")) + "</button>"
                : "");
    }

    /* Reads the booking again so a refund that Stripe has finished since shows its new state. */
    function refreshRefundStatus(button) {
        var request = requestBooking();
        if (!request || !activeBooking) {
            return;
        }

        button.disabled = true;
        button.textContent = tr("cancellation.refreshing", "Yoxlanılır...");

        request.then(function (dto) {
            activeBooking = toPageBooking(dto, activeAirports);
            renderBooking(activeBooking);
        }).catch(function () {
            showMessage(tr("cancellation.refreshFailed", "Geri ödəniş statusunu yeniləmək mümkün olmadı. Yenidən cəhd edin."));
            var again = document.getElementById("details-refund-refresh");
            if (again) {
                again.disabled = false;
                again.textContent = tr("cancellation.refreshStatus", "Geri ödəniş statusuna bax");
            }
        });
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
            ? tr("cancellation.ruleApplied", "{cabin}, uçuşa {days} gün qalmış: {percent}% ləğv haqqı.", vars)
            : tr("cancellation.ruleNotEligible", "{cabin}, uçuşa {days} gün qalmış: geri ödənişə uyğun deyil.", vars);
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
        setText("cancel-modal-refund", quote.eligible ? formatPrice(quote.refundAmount) : getRefundStatusLabel("Uyğun deyil"));
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
            showMessage(tr("bookingDetails.alreadyCancelled", "Bu bron artıq ləğv edilib."));
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
            showCancelError(error, tr("api.bookingDetails.quoteFailed", "Ləğv şərtlərini yoxlamaq mümkün olmadı. Zəhmət olmasa yenidən cəhd edin."));
        });
    }

    /* A booking made under an account can only be cancelled while signed in to it: the server answers 401 and the page offers the sign-in. */
    function showCancelError(error, fallback) {
        var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;
        if (isApiError && error.status === 401) {
            showSignInMessage(tr("cancellation.noteSignIn", "Bu rezervasiyanı ləğv etmək üçün onu edən hesaba daxil olun."));
            return;
        }

        if (isApiError && error.status === 429) {
            showMessage(tr("cancellation.linkWait", "Təsdiq keçidi bir az əvvəl göndərilib. Yenisini istəməzdən əvvəl bir dəqiqə gözləyin."));
            return;
        }

        showMessage(isApiError ? error.userMessage : fallback);
    }

    function showSignInMessage(text) {
        var message = document.getElementById("details-message");
        if (!message) {
            return;
        }

        var next = (window.location.pathname.split("/").pop() || "booking-details.html") + window.location.search;
        var link = document.createElement("a");
        link.href = "login.html?next=" + encodeURIComponent(next);
        link.textContent = tr("cancellation.signInLink", "Daxil ol");

        message.textContent = text + " ";
        message.appendChild(link);
        message.hidden = false;
    }

    /* The sentence after cancelling, from the refund the server recorded (its amount and state), never from anything typed on this page. */
    function cancelledMessage(refund, pnr) {
        if (!refund || !(refund.amount > 0)) {
            return tr("cancellation.cancelledNoRefund", "{pnr} bronu ləğv edildi. Geri ödənişə uyğun deyil.", { pnr: pnr });
        }

        var vars = { pnr: pnr, amount: formatPrice(refund.amount) };
        if (refund.demo) {
            return tr("api.bookingDetails.cancelledWithRefund", "{pnr} rezervasiyası ləğv edildi. {amount} məbləğində geri ödəniş tələb olundu (demo: real ödəniş provayderi ilə əlaqə qurulmur).", vars);
        }

        var key = getRefundStatusKey(refund.status);
        return key === "failed" || key === "cancelled"
            ? tr("cancellation.cancelledRefundFailed", "{pnr} rezervasiyası ləğv edildi, amma {amount} geri ödənişi hələ göndərilə bilmədi. Bu rezervasiya kodu ilə AEROVA dəstəyinə müraciət edin.", vars)
            : tr("cancellation.cancelledStripe", "{pnr} rezervasiyası ləğv edildi. {amount} məbləğində geri ödəniş kartınıza göndərilir.", vars);
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
            showMessage(tr("bookingDetails.alreadyCancelled", "Bu bron artıq ləğv edilib."));
            return;
        }

        var button = document.getElementById("confirm-cancellation-button");
        var idleLabel = button ? button.textContent : "";
        var pnr = activeBooking.pnr;
        if (button) {
            button.disabled = true;
            button.setAttribute("aria-busy", "true");
            button.textContent = tr("cancellation.cancelling", "Ləğv edilir...");
        }

        // The page language goes along so the cancellation and refund e-mails are written in it.
        var language = "az";
        window.AEROVA_API.post(bookingPath("/cancel"), { lastName: ownerLastName(), language: language }).then(function (dto) {
            // A paid booking is not cancelled yet: a confirmation link went to the account's e-mail, and the booking stays as it is.
            if (dto && dto.confirmationSent) {
                closeCancelModal();
                showMessage(tr("cancellation.linkSent", "{email} ünvanına təsdiq keçidi göndərdik. Keçidi açıb ləğvi təsdiqləyənə qədər rezervasiyanız qüvvədə qalır.", { email: dto.email }));
                return;
            }

            activeBooking = toPageBooking(dto, activeAirports);
            renderBooking(activeBooking);
            closeCancelModal();

            showMessage(cancelledMessage(activeBooking.refund, pnr));

            var focusTarget = document.getElementById("details-message");
            if (focusTarget) {
                focusTarget.setAttribute("tabindex", "-1");
                focusTarget.focus();
            }
        }).catch(function (error) {
            closeCancelModal();
            showCancelError(error, tr("bookingDetails.cancelFail", "Bu bron ləğv edilə bilmədi. Yenidən cəhd edin."));
        }).then(function () {
            if (button) {
                button.disabled = false;
                button.removeAttribute("aria-busy");
                button.textContent = idleLabel;
            }
        });
    }

    function buildConfirmationText(booking) {
        var flight = booking.flight || {};
        var passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
        var lines = [
            "AEROVA bron təsdiqi",
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
        lines.push("AEROVA ilə uçduğunuz üçün təşəkkür edirik.");

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
                    showMessage(tr("bookingDetails.alreadyCancelled", "Bu bron artıq ləğv edilib."));
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
            toggle.setAttribute("aria-label", open ? "Menyunu bağla" : "Menyunu aç");
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
            title: tr("api.bookingDetails.notFoundTitle", "Rezervasiya tapılmadı"),
            text: tr("api.bookingDetails.notFoundText", "Göstəriləcək rezervasiya yoxdur. Onu Səyahətlərim bölməsindən açın və ya Rezervasiyanı idarə et bölməsində kodla axtarın."),
            actions: [
                { label: tr("nav.myTrips", "Səyahətlərim"), href: "my-trips.html" },
                { label: tr("nav.manageBooking", "Bronu idarə et"), href: "manage-booking.html" }
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

        setPageStatus({ kind: "loading", title: tr("api.bookingDetails.loadingTitle", "Rezervasiyanız yüklənir"), text: tr("api.bookingDetails.loadingText", "Zəhmət olmasa bir az gözləyin."), actions: [] });

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
                title: tr("api.bookingDetails.errorTitle", "Rezervasiyanı yükləmək mümkün olmadı"),
                text: isApiError ? error.userMessage : tr("api.errors.generic", "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin."),
                actions: [{ label: tr("api.options.retry", "Yenidən cəhd et") }],
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
