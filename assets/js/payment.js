(function () {
    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return fallback;
    }

    "use strict";

    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var priceState = {
        baseFare: 0,
        baggage: 0,
        meals: 0,
        taxes: 0,
        subtotal: 0,
        discount: 0,
        promoCode: "",
        promoPercent: 0,
        grandTotal: 0
    };

    var appliedPromo = null;

    /* The booking made in the backend: its price and when the seat hold ends. Nothing is priced locally once it exists. */
    var heldBooking = null;
    var holdTimer = null;

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function showMessage(text) {
        var message = document.getElementById("payment-message");
        if (!message) {
            return;
        }

        message.textContent = text || "";
        message.hidden = !text;
    }

    function toNumber(value, fallback) {
        var amount = Number(value);
        return isFinite(amount) ? amount : fallback;
    }

    function formatPrice(amount) {
        var value = toNumber(amount, 0);
        return "$" + value.toFixed(2);
    }

    function roundMoney(amount) {
        return Math.round(toNumber(amount, 0) * 100) / 100;
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

    function readBookingData() {
        return readJSON("bookingData");
    }

    function normalizePromoCode(value) {
        return String(value || "").trim().toUpperCase();
    }

    function calculatePriceBreakdown() {
        var price = heldBooking && heldBooking.price;

        if (!price) {
            return { baseFare: 0, baggage: 0, meals: 0, taxes: 0, subtotal: 0, discount: 0, promoCode: "", promoPercent: 0, grandTotal: 0 };
        }

        return {
            baseFare: roundMoney(price.baseFare),
            baggage: roundMoney(price.baggage),
            meals: roundMoney(price.meals),
            taxes: roundMoney(price.taxes),
            subtotal: roundMoney(price.subtotal),
            discount: roundMoney(price.discount),
            promoCode: price.promoCode || "",
            promoPercent: toNumber(price.promoPercent, 0),
            grandTotal: roundMoney(price.total)
        };
    }

    function getPassengerOneName(bookingData) {
        var passengers = bookingData && Array.isArray(bookingData.passengers)
            ? bookingData.passengers
            : [];
        var passenger = passengers[0];

        if (!passenger) {
            return "";
        }

        return [passenger.firstName, passenger.lastName]
            .map(function (part) {
                return String(part || "").trim();
            })
            .filter(function (part) {
                return !!part;
            })
            .join(" ");
    }

    function getSelectedPaymentMethod() {
        var selected = document.querySelector('input[name="payment-method"]:checked');
        return selected ? selected.value : "card";
    }

    function getPaymentMethodLabel(method) {
        if (method === "apple") {
            return tr("payment.applePayLabel", "Apple Pay");
        }
        if (method === "google") {
            return tr("payment.googlePayLabel", "Google Pay");
        }
        return tr("payment.cardLabel", "Credit / Debit Card");
    }

    function updateWalletMethodMessage() {
        var method = getSelectedPaymentMethod();
        var messageText = document.getElementById("wallet-method-message-text");
        if (!messageText) {
            return;
        }

        if (method === "apple") {
            messageText.textContent = typeof t === "function" ? t("payment.applePay") : "Continue with Apple Pay to complete your payment securely.";
        } else if (method === "google") {
            messageText.textContent = typeof t === "function" ? t("payment.googlePay") : "Continue with Google Pay to complete your payment securely.";
        } else {
            messageText.textContent = "";
        }
    }

    function clearPromoError() {
        var control = document.getElementById("promo-code-control");
        var error = document.getElementById("promo-code-error");
        var input = document.getElementById("promo-code-input");

        if (control) {
            control.classList.remove("is-invalid");
        }
        if (error) {
            error.textContent = "";
            error.hidden = true;
        }
        if (input) {
            input.classList.remove("is-invalid");
        }
    }

    function showPromoError(message) {
        var control = document.getElementById("promo-code-control");
        var error = document.getElementById("promo-code-error");
        var input = document.getElementById("promo-code-input");

        if (control) {
            control.classList.add("is-invalid");
        }
        if (error) {
            error.textContent = message || (typeof t === "function" ? t("payment.invalidPromo") : "Invalid promo code");
            error.hidden = false;
        }
        if (input) {
            input.classList.add("is-invalid");
            input.focus();
        }
    }

    function updatePromoUi() {
        var input = document.getElementById("promo-code-input");
        var applyButton = document.getElementById("promo-apply-button");
        var appliedBlock = document.getElementById("promo-code-applied");
        var success = document.getElementById("promo-code-success");
        var discountRow = document.getElementById("payment-discount-row");
        var discountCodeLabel = document.getElementById("payment-discount-code-label");

        if (appliedPromo) {
            if (input) {
                input.value = appliedPromo.code;
                input.disabled = true;
            }
            if (applyButton) {
                applyButton.disabled = true;
            }
            if (appliedBlock) {
                appliedBlock.hidden = false;
            }
            if (success) {
                success.textContent = appliedPromo.code + " applied − " + appliedPromo.percent + "% off";
            }
            if (discountRow) {
                discountRow.hidden = false;
            }
            if (discountCodeLabel) {
                discountCodeLabel.textContent = "(" + appliedPromo.code + ")";
            }
        } else {
            if (input) {
                input.disabled = false;
            }
            if (applyButton) {
                applyButton.disabled = false;
            }
            if (appliedBlock) {
                appliedBlock.hidden = true;
            }
            if (success) {
                success.textContent = "";
            }
            if (discountRow) {
                discountRow.hidden = true;
            }
            if (discountCodeLabel) {
                discountCodeLabel.textContent = "";
            }
        }
    }



    function refreshTotals(bookingData) {
        var prices = calculatePriceBreakdown(bookingData || readBookingData() || {});
        var payButton = document.getElementById("pay-button");

        priceState = prices;

        setText("payment-base-fare", formatPrice(prices.baseFare));
        setText("payment-baggage", formatPrice(prices.baggage));
        setText("payment-meals", formatPrice(prices.meals));
        setText("payment-discount", prices.discount > 0 ? ("−" + formatPrice(prices.discount)) : formatPrice(0));
        setText("payment-taxes", formatPrice(prices.taxes));
        setText("payment-total", formatPrice(prices.grandTotal));

        if (payButton) {
            payButton.textContent = (typeof t === "function" ? t("payment.pay", { amount: formatPrice(prices.grandTotal) }) : ("Pay " + formatPrice(prices.grandTotal)));
            payButton.disabled = false;
            payButton.removeAttribute("disabled");
        }

        updatePromoUi();
        return prices;
    }

    function populatePaymentSummary(bookingData) {
        var flight = bookingData.flight || {};
        var selectedSeats = Array.isArray(bookingData.selectedSeats)
            ? bookingData.selectedSeats
            : [];
        var route = flight.route || ((flight.from || "—") + " → " + (flight.to || "—"));
        var times = (flight.departure || "—") + " → " + (flight.arrival || "—");
        var cardholderInput = document.getElementById("cardholder-name");
        var cardholderName = getPassengerOneName(bookingData);

        setText("payment-summary-airline", flight.airline || "AEROVA");
        setText("payment-summary-flight-number", flight.flightNumber || "—");
        setText("payment-summary-route", route);
        setText("payment-summary-date", formatDisplayDate(flight.departureDate));
        setText("payment-summary-times", times);
        setText("payment-summary-aircraft", flight.aircraft || "—");
        setText("payment-summary-cabin", bookingData.cabinClass || "—");
        setText(
            "payment-summary-passengers",
            String(bookingData.passengerCount || selectedSeats.length || "—")
        );
        setText(
            "payment-summary-seats",
            window.AEROVA_JOURNEY && bookingData.legs && bookingData.legs.length > 1
                ? window.AEROVA_JOURNEY.seatsText(bookingData.legs)
                : (selectedSeats.length ? selectedSeats.join(", ") : "\u2014")
        );

        if (window.AEROVA_JOURNEY) {
            window.AEROVA_JOURNEY.paintReturnLine("payment-summary-times", bookingData.legs);
        }

        refreshTotals(bookingData);

        if (cardholderInput && cardholderName) {
            cardholderInput.value = cardholderName;
        }
    }

    function restoreAppliedPromo() {
        var price = heldBooking && heldBooking.price;

        appliedPromo = price && price.promoCode
            ? { code: price.promoCode, percent: toNumber(price.promoPercent, 0) }
            : null;
    }

    function saveBookingData(bookingData) {
        try {
            sessionStorage.setItem("bookingData", JSON.stringify(bookingData));
            return true;
        } catch (error) {
            return false;
        }
    }

    /* The backend decides whether the code can be used; the booking is then made again with it, so the price comes from the backend. */
    function applyPromoCode() {
        clearPromoError();

        var bookingData = readBookingData();
        if (!bookingData) {
            showPromoError(tr("payment.bookingNotFound", "Booking not found"));
            return;
        }

        var input = document.getElementById("promo-code-input");
        var code = normalizePromoCode(input ? input.value : "");

        if (!code) {
            showPromoError(tr("payment.enterPromo", "Enter a promo code"));
            return;
        }

        if (appliedPromo && appliedPromo.code === code) {
            showPromoError(tr("payment.promoAlready", "Promo code already applied"));
            return;
        }

        if (appliedPromo) {
            showPromoError(tr("payment.removeCodeFirst", "Remove the current code first"));
            return;
        }

        var applyButton = document.getElementById("promo-apply-button");
        if (applyButton) {
            applyButton.disabled = true;
        }

        window.AEROVA_API.get("api/promo-codes/" + encodeURIComponent(code)).then(function (promo) {
            bookingData.promoCode = promo.code;

            if (!saveBookingData(bookingData)) {
                showPromoError(tr("payment.promoSaveFail", "Unable to save promo code"));
                return;
            }

            reserveBooking(bookingData, document.querySelector(".payment-layout"));
        }).catch(function (error) {
            var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;
            showPromoError(isApiError ? error.userMessage : tr("api.errors.generic", "Something went wrong. Please try again."));
        }).then(function () {
            if (applyButton && !appliedPromo) {
                applyButton.disabled = false;
            }
        });
    }

    function removePromoCode() {
        clearPromoError();

        var bookingData = readBookingData();
        if (!bookingData) {
            return;
        }

        delete bookingData.promoCode;
        if (!saveBookingData(bookingData)) {
            showPromoError(tr("payment.promoSaveFail", "Unable to save promo code"));
            return;
        }

        var input = document.getElementById("promo-code-input");
        if (input) {
            input.value = "";
        }

        reserveBooking(bookingData, document.querySelector(".payment-layout"));
    }

    function getTrimmedValue(input) {
        return input ? String(input.value || "").trim() : "";
    }

    function digitsOnly(value) {
        return String(value || "").replace(/\D/g, "");
    }

    function rememberOriginalPlaceholder(input) {
        if (!input || input.getAttribute("data-original-placeholder") !== null) {
            return;
        }
        input.setAttribute("data-original-placeholder", input.getAttribute("placeholder") || "");
    }

    function clearFieldError(input) {
        if (!input || !input.classList.contains("is-invalid")) {
            return;
        }

        input.classList.remove("is-invalid");

        var original = input.getAttribute("data-original-placeholder");
        if (original === null) {
            return;
        }

        if (original) {
            input.setAttribute("placeholder", original);
        } else {
            input.removeAttribute("placeholder");
        }
    }

    function clearFieldErrors() {
        var invalidInputs = document.querySelectorAll(".payment-field-input.is-invalid");
        for (var i = 0; i < invalidInputs.length; i += 1) {
            clearFieldError(invalidInputs[i]);
        }
    }

    function markInvalid(input, message) {
        if (!input) {
            return;
        }

        rememberOriginalPlaceholder(input);
        input.classList.add("is-invalid");
        input.setAttribute("placeholder", message || tr("payment.fieldRequired", "This field is required"));

        if (!getTrimmedValue(input)) {
            input.value = "";
        }
    }

    function isValidCardNumber(value) {
        var digits = digitsOnly(value);
        return digits.length >= 13 && digits.length <= 19;
    }

    function isValidExpiry(value) {
        var normalized = String(value || "").replace(/\s+/g, "");
        var match = normalized.match(/^(\d{2})\/(\d{2})$/);

        if (!match) {
            return false;
        }

        var month = Number(match[1]);
        var year = Number(match[2]);

        if (month < 1 || month > 12) {
            return false;
        }

        var fullYear = 2000 + year;
        var expiryEnd = new Date(fullYear, month, 0, 23, 59, 59, 999);
        return expiryEnd >= new Date();
    }

    function isValidCvv(value) {
        return /^\d{3,4}$/.test(digitsOnly(value));
    }

    function validateCardDetails() {
        var cardholderInput = document.getElementById("cardholder-name");
        var cardNumberInput = document.getElementById("card-number");
        var expiryInput = document.getElementById("card-expiry");
        var cvvInput = document.getElementById("card-cvv");

        var isValid = true;
        var focusField = null;

        var cardholderName = getTrimmedValue(cardholderInput);
        var cardNumber = getTrimmedValue(cardNumberInput);
        var expiry = getTrimmedValue(expiryInput);
        var cvv = getTrimmedValue(cvvInput);

        if (!cardholderName) {
            markInvalid(cardholderInput, tr("payment.cardholder", "Enter cardholder name"));
            focusField = cardholderInput;
            isValid = false;
        }

        if (!cardNumber) {
            markInvalid(cardNumberInput, tr("payment.enterCard", "Enter card number"));
            if (!focusField) {
                focusField = cardNumberInput;
            }
            isValid = false;
        } else if (!isValidCardNumber(cardNumber)) {
            markInvalid(cardNumberInput, tr("payment.validCard", "Enter a valid card number"));
            cardNumberInput.value = "";
            if (!focusField) {
                focusField = cardNumberInput;
            }
            isValid = false;
        }

        if (!expiry) {
            markInvalid(expiryInput, tr("payment.enterExpiry", "Enter expiry date"));
            if (!focusField) {
                focusField = expiryInput;
            }
            isValid = false;
        } else if (!isValidExpiry(expiry)) {
            markInvalid(expiryInput, tr("payment.validExpiry", "Enter a valid expiry date"));
            expiryInput.value = "";
            if (!focusField) {
                focusField = expiryInput;
            }
            isValid = false;
        }

        if (!cvv) {
            markInvalid(cvvInput, tr("payment.enterCvv", "Enter CVV"));
            if (!focusField) {
                focusField = cvvInput;
            }
            isValid = false;
        } else if (!isValidCvv(cvv)) {
            markInvalid(cvvInput, tr("payment.validCvv", "Enter a valid CVV"));
            cvvInput.value = "";
            if (!focusField) {
                focusField = cvvInput;
            }
            isValid = false;
        }

        return {
            valid: isValid,
            focusField: focusField
        };
    }

    var paying = false;

    function paymentMethodFor(method) {
        return method === "apple" ? "ApplePay" : (method === "google" ? "GooglePay" : "Card");
    }

    /* Card details go to the backend only to be checked; nothing of them is kept on this page or in storage. */
    function buildPaymentRequest(method) {
        var request = { pnr: heldBooking.pnr, method: paymentMethodFor(method) };

        if (method === "card") {
            var expiry = getTrimmedValue(document.getElementById("card-expiry")).replace(/\s+/g, "").split("/");

            request.cardholderName = getTrimmedValue(document.getElementById("cardholder-name"));
            request.cardNumber = digitsOnly(getTrimmedValue(document.getElementById("card-number")));
            request.expiryMonth = Number(expiry[0]);
            request.expiryYear = 2000 + Number(expiry[1]);
            request.cvv = digitsOnly(getTrimmedValue(document.getElementById("card-cvv")));
        }

        return request;
    }

    function setPaying(isPaying) {
        var payButton = document.getElementById("pay-button");

        paying = isPaying;
        if (payButton) {
            payButton.disabled = isPaying;
            if (isPaying) {
                payButton.textContent = tr("api.payment.processing", "Processing payment...");
            } else {
                refreshTotals();
            }
        }
    }

    /* Paid: only the reference and a passenger's last name are kept, so the confirmation page can ask the backend for the booking. */
    function paymentSucceeded(pnr, lastName) {
        try {
            sessionStorage.setItem("aerovaPaid", JSON.stringify({ pnr: pnr, lastName: lastName }));

            // Signed-in travellers are offered to save the passengers they typed in; guests have no profile.
            var savable = window.AerovaAuth && window.AerovaAuth.isLoggedIn() ? window.AEROVA_BOOKING.savablePassengers(readBookingData()) : [];
            if (savable.length) {
                sessionStorage.setItem("aerovaSavable", JSON.stringify({ pnr: pnr, passengers: savable }));
            } else {
                sessionStorage.removeItem("aerovaSavable");
            }

            sessionStorage.removeItem("bookingData");
        } catch (error) {
            // The confirmation page then asks for the reference again.
        }

        window.AEROVA_BOOKING.forget();
        stopHoldTimer();
        ["card-number", "card-cvv", "card-expiry", "cardholder-name"].forEach(function (id) {
            var field = document.getElementById(id);
            if (field) {
                field.value = "";
            }
        });
        window.location.href = "./confirmation.html";
    }

    function paymentFailed(error, pnr, lastName) {
        var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;
        var cvv = document.getElementById("card-cvv");

        if (cvv) {
            cvv.value = "";
        }

        if (!isApiError) {
            if (window.console) {
                window.console.error(error);
            }
            setPaying(false);
            showMessage(tr("api.errors.generic", "Something went wrong. Please try again."));
            return;
        }

        if (error.status === 409) {
            // A payment whose answer was lost may already have gone through: ask the backend before saying anything.
            window.AEROVA_API.get("api/bookings/" + encodeURIComponent(pnr) + "?lastName=" + encodeURIComponent(lastName)).then(function (booking) {
                if (booking.status === "Confirmed") {
                    paymentSucceeded(pnr, lastName);
                    return;
                }
                setPaying(false);
                showMessage(error.userMessage);
            }).catch(function () {
                setPaying(false);
                showMessage(error.userMessage);
            });
            return;
        }

        setPaying(false);

        if (error.status === 422 && /seats were released|no longer be paid/i.test(error.userMessage || "")) {
            holdEnded();
            return;
        }

        showMessage(error.userMessage);
    }

    function handlePayClick(event) {
        event.preventDefault();

        if (paying) {
            return;
        }

        clearFieldErrors();
        showMessage("");

        var method = getSelectedPaymentMethod();
        var bookingData = readBookingData();

        if (!heldBooking || !bookingData || !bookingData.passengers || !bookingData.passengers.length) {
            showMessage(typeof t === "function" ? t("payment.bookingMissing") : "Booking information could not be found. Please complete passenger details first.");
            return;
        }

        if (method === "card") {
            var validation = validateCardDetails();
            if (!validation.valid) {
                if (validation.focusField) {
                    validation.focusField.focus();
                }
                return;
            }
        }

        var pnr = heldBooking.pnr;
        var lastName = bookingData.passengers[0].lastName;

        setPaying(true);
        window.AEROVA_API.post("api/payments", buildPaymentRequest(method)).then(function () {
            paymentSucceeded(pnr, lastName);
        }).catch(function (error) {
            paymentFailed(error, pnr, lastName);
        });
    }

    function bindClearInvalidOnInput() {
        document.addEventListener("input", function (event) {
            var target = event.target;
            if (!target || !target.classList) {
                return;
            }

            if (target.classList.contains("payment-field-input")) {
                clearFieldError(target);
            }

            if (target.id === "promo-code-input") {
                clearPromoError();
            }
        });
    }

    function bindPaymentMethodSelection() {
        var methodInputs = document.querySelectorAll('input[name="payment-method"]');
        for (var i = 0; i < methodInputs.length; i += 1) {
            methodInputs[i].addEventListener("change", function () {
                clearFieldErrors();
                updateWalletMethodMessage();
            });
        }
    }

    function bindPromoActions() {
        var applyButton = document.getElementById("promo-apply-button");
        var removeButton = document.getElementById("promo-remove-button");
        var promoInput = document.getElementById("promo-code-input");

        if (applyButton) {
            applyButton.addEventListener("click", applyPromoCode);
        }

        if (removeButton) {
            removeButton.addEventListener("click", removePromoCode);
        }

        if (promoInput) {
            promoInput.addEventListener("keydown", function (event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    applyPromoCode();
                }
            });
        }
    }

    function bookingPanel(kind, title, text, actions) {
        var panel = document.getElementById("booking-status");
        var layout = document.querySelector(".payment-layout");
        var buttons = document.getElementById("booking-status-actions");

        if (!panel) {
            return;
        }

        setText("booking-status-title", title);
        setText("booking-status-text", text);
        panel.setAttribute("role", kind === "error" ? "alert" : "status");
        buttons.innerHTML = "";

        (actions || []).forEach(function (action) {
            var element = document.createElement(action.href ? "a" : "button");
            element.className = "pay-button booking-action";
            element.textContent = action.label;
            if (action.href) {
                element.setAttribute("href", action.href);
            } else {
                element.type = "button";
                element.addEventListener("click", action.onClick);
            }
            buttons.appendChild(element);
        });

        panel.hidden = false;
        if (layout) {
            layout.hidden = true;
        }
    }

    function stopHoldTimer() {
        if (holdTimer) {
            window.clearInterval(holdTimer);
            holdTimer = null;
        }
        var hold = document.getElementById("booking-hold");
        if (hold) {
            hold.hidden = true;
        }
    }

    function holdEnded() {
        stopHoldTimer();
        window.AEROVA_BOOKING.forget();
        heldBooking = null;
        bookingPanel("error", tr("api.booking.expiredTitle", "Your seat hold has ended"), tr("api.booking.expiredText", "The seats were held for 15 minutes and are now released. Please choose your seats again."), [
            { label: tr("api.booking.backToSeats", "Choose seats again"), href: "seat-selection.html" }
        ]);
    }

    function paintHold() {
        var hold = document.getElementById("booking-hold");
        if (!hold || !heldBooking) {
            return;
        }

        var left = window.AEROVA_BOOKING.parseUtc(heldBooking.expiresAt).getTime() - Date.now();
        if (left <= 0) {
            holdEnded();
            return;
        }

        var totalSeconds = Math.ceil(left / 1000);
        var clock = Math.floor(totalSeconds / 60) + ":" + (totalSeconds % 60 < 10 ? "0" : "") + (totalSeconds % 60);
        hold.textContent = tr("api.booking.holdText", "Your seats are held for {time}. Booking reference {pnr}.", { time: clock, pnr: heldBooking.pnr });
        hold.hidden = false;
    }

    function startHoldTimer() {
        stopHoldTimer();
        paintHold();
        if (heldBooking) {
            holdTimer = window.setInterval(paintHold, 1000);
        }
    }

    function showBookingError(error, retry) {
        var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;
        var status = isApiError ? error.status : 0;
        var actions = [];
        var title = tr("api.booking.errorTitle", "We could not reserve your seats");
        var text;

        if (!isApiError && window.console) {
            window.console.error(error);
        }

        if (status === 409) {
            title = tr("api.booking.conflictTitle", "A seat is no longer available");
            text = tr("api.booking.conflictText", "Another traveller has just taken one of your seats. Please choose your seats again.");
            actions.push({ label: tr("api.booking.backToSeats", "Choose seats again"), href: "seat-selection.html" });
        } else {
            text = isApiError ? error.userMessage : tr("api.errors.generic", "Something went wrong. Please try again.");
            if (!isApiError || status === 0 || status >= 500) {
                actions.push({ label: tr("api.booking.retry", "Try again"), onClick: retry });
            }
            actions.push({ label: tr("api.booking.backToPassengers", "Back to passenger details"), href: "passenger-details.html" });
        }

        bookingPanel("error", title, text, actions);
    }

    /* Creates the booking in the backend (or reuses the one already held) before the payment page shows anything priced. */
    function reserveBooking(bookingData, layout) {
        var panel = document.getElementById("booking-status");

        bookingPanel("loading", tr("api.booking.loadingTitle", "Reserving your seats"), tr("api.booking.loadingText", "Please wait while we hold your seats and confirm the price."), []);

        window.AEROVA_BOOKING.ensure(bookingData).then(function (held) {
            heldBooking = held;
            if (panel) {
                panel.hidden = true;
            }
            if (layout) {
                layout.hidden = false;
            }

            restoreAppliedPromo();
            populatePaymentSummary(bookingData);
            startHoldTimer();
        }).catch(function (error) {
            showBookingError(error, function () {
                reserveBooking(bookingData, layout);
            });
        });
    }

    function init() {
        var payButton = document.getElementById("pay-button");
        var layout = document.querySelector(".payment-layout");
        var bookingData = readBookingData();

        bindPaymentMethodSelection();
        bindClearInvalidOnInput();
        bindPromoActions();
        updateWalletMethodMessage();

        if (payButton) {
            payButton.addEventListener("click", handlePayClick);
        }

        if (!bookingData) {
            showMessage(typeof t === "function" ? t("payment.bookingMissing") : "Booking information could not be found. Please complete passenger details first.");
            if (layout) {
                layout.hidden = true;
            }
            return;
        }

        showMessage("");
        reserveBooking(bookingData, layout);
    }

    document.addEventListener("DOMContentLoaded", init);
    window.addEventListener("aerova:languagechange", function () {
        if (typeof updatePaymentSummary === 'function') { try { updatePaymentSummary(); } catch (e) {} } if (typeof updateWalletMethodMessage === 'function') { try { updateWalletMethodMessage(); } catch (e) {} } if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);
    });
})();
