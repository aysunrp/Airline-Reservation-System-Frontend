(function () {
    "use strict";

    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var TAX_RATE = 0.1;
    var priceState = {
        baseFare: 0,
        baggage: 0,
        meals: 0,
        extraServices: 0,
        taxes: 0,
        grandTotal: 0
    };

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

    function getPassengerCount(bookingData) {
        if (!bookingData) {
            return 1;
        }

        if (Array.isArray(bookingData.passengers) && bookingData.passengers.length) {
            return bookingData.passengers.length;
        }

        var count = toNumber(bookingData.passengerCount, 0);
        return count > 0 ? count : 1;
    }

    function getBaggageTotal(baggageData, bookingData, extraServicesData) {
        if (baggageData && baggageData.totalBaggageCost != null) {
            return roundMoney(toNumber(baggageData.totalBaggageCost, 0));
        }
        if (extraServicesData && extraServicesData.baggageTotal != null) {
            return roundMoney(toNumber(extraServicesData.baggageTotal, 0));
        }
        if (bookingData && bookingData.baggageTotal != null) {
            return roundMoney(toNumber(bookingData.baggageTotal, 0));
        }
        return 0;
    }

    function getMealTotal(mealData, bookingData, extraServicesData) {
        if (mealData && mealData.totalMealCost != null) {
            return roundMoney(toNumber(mealData.totalMealCost, 0));
        }
        if (extraServicesData && extraServicesData.mealTotal != null) {
            return roundMoney(toNumber(extraServicesData.mealTotal, 0));
        }
        if (bookingData && bookingData.mealTotal != null) {
            return roundMoney(toNumber(bookingData.mealTotal, 0));
        }
        return 0;
    }

    function getExtraServicesTotal(extraServicesData, bookingData) {
        if (extraServicesData && extraServicesData.extraServicesTotal != null) {
            return roundMoney(toNumber(extraServicesData.extraServicesTotal, 0));
        }

        if (extraServicesData && Array.isArray(extraServicesData.selectedServices)) {
            return roundMoney(extraServicesData.selectedServices.reduce(function (sum, service) {
                return sum + toNumber(service && service.price, 0);
            }, 0));
        }

        if (bookingData && bookingData.extraServicesTotal != null) {
            return roundMoney(toNumber(bookingData.extraServicesTotal, 0));
        }

        if (bookingData && Array.isArray(bookingData.extraServices)) {
            return roundMoney(bookingData.extraServices.reduce(function (sum, service) {
                return sum + toNumber(service && service.price, 0);
            }, 0));
        }

        return 0;
    }

    function getBaseFare(bookingData, baggageTotal, mealTotal, extraServicesTotal, extraServicesData) {
        if (extraServicesData && extraServicesData.baseFare != null) {
            return roundMoney(toNumber(extraServicesData.baseFare, 0));
        }

        var selectedFlight = readJSON("aerovaSelectedFlight");
        var passengerCount = getPassengerCount(bookingData);
        var unitPrice = toNumber(selectedFlight && selectedFlight.price, NaN);

        if (isFinite(unitPrice)) {
            return roundMoney(unitPrice * passengerCount);
        }

        var storedTotal = toNumber(bookingData && bookingData.totalPrice, NaN);
        if (!isFinite(storedTotal)) {
            return 0;
        }

        // If add-on totals were already folded into bookingData.totalPrice, recover base fare.
        if (
            (bookingData && (bookingData.baggageTotal != null || bookingData.mealTotal != null || bookingData.extraServicesTotal != null)) ||
            extraServicesData
        ) {
            return roundMoney(Math.max(0, storedTotal - baggageTotal - mealTotal - extraServicesTotal));
        }

        return roundMoney(storedTotal);
    }

    function calculatePriceBreakdown(bookingData) {
        var baggageData = readJSON("baggageData");
        var mealData = readJSON("mealData");
        var extraServicesData = readJSON("extraServicesData");

        var baggage = getBaggageTotal(baggageData, bookingData, extraServicesData);
        var meals = getMealTotal(mealData, bookingData, extraServicesData);
        var extraServices = getExtraServicesTotal(extraServicesData, bookingData);
        var baseFare = getBaseFare(bookingData, baggage, meals, extraServices, extraServicesData);
        var taxes = roundMoney(baseFare * TAX_RATE);
        var grandTotal = roundMoney(baseFare + baggage + meals + extraServices + taxes);

        return {
            baseFare: baseFare,
            baggage: baggage,
            meals: meals,
            extraServices: extraServices,
            taxes: taxes,
            grandTotal: grandTotal
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
            return "Apple Pay";
        }
        if (method === "google") {
            return "Google Pay";
        }
        return "Credit / Debit Card";
    }

    function updateWalletMethodMessage() {
        var method = getSelectedPaymentMethod();
        var messageText = document.getElementById("wallet-method-message-text");
        if (!messageText) {
            return;
        }

        if (method === "apple") {
            messageText.textContent = "Continue with Apple Pay to complete your payment securely.";
        } else if (method === "google") {
            messageText.textContent = "Continue with Google Pay to complete your payment securely.";
        } else {
            messageText.textContent = "";
        }
    }

    function populatePaymentSummary(bookingData) {
        var flight = bookingData.flight || {};
        var selectedSeats = Array.isArray(bookingData.selectedSeats)
            ? bookingData.selectedSeats
            : [];
        var prices = calculatePriceBreakdown(bookingData);
        var route = flight.route || ((flight.from || "—") + " → " + (flight.to || "—"));
        var times = (flight.departure || "—") + " → " + (flight.arrival || "—");
        var payButton = document.getElementById("pay-button");
        var cardholderInput = document.getElementById("cardholder-name");
        var cardholderName = getPassengerOneName(bookingData);

        priceState = prices;

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
            selectedSeats.length ? selectedSeats.join(", ") : "—"
        );
        setText("payment-base-fare", formatPrice(prices.baseFare));
        setText("payment-baggage", formatPrice(prices.baggage));
        setText("payment-meals", formatPrice(prices.meals));
        setText("payment-extra-services", formatPrice(prices.extraServices));
        setText("payment-taxes", formatPrice(prices.taxes));
        setText("payment-total", formatPrice(prices.grandTotal));

        if (payButton) {
            payButton.textContent = "Pay " + formatPrice(prices.grandTotal);
            payButton.disabled = false;
            payButton.removeAttribute("disabled");
        }

        if (cardholderInput && cardholderName) {
            cardholderInput.value = cardholderName;
        }
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
        input.setAttribute("placeholder", message || "This field is required");

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
            markInvalid(cardholderInput, "Enter cardholder name");
            focusField = cardholderInput;
            isValid = false;
        }

        if (!cardNumber) {
            markInvalid(cardNumberInput, "Enter card number");
            if (!focusField) {
                focusField = cardNumberInput;
            }
            isValid = false;
        } else if (!isValidCardNumber(cardNumber)) {
            markInvalid(cardNumberInput, "Enter a valid card number");
            cardNumberInput.value = "";
            if (!focusField) {
                focusField = cardNumberInput;
            }
            isValid = false;
        }

        if (!expiry) {
            markInvalid(expiryInput, "Enter expiry date");
            if (!focusField) {
                focusField = expiryInput;
            }
            isValid = false;
        } else if (!isValidExpiry(expiry)) {
            markInvalid(expiryInput, "Enter a valid expiry date");
            expiryInput.value = "";
            if (!focusField) {
                focusField = expiryInput;
            }
            isValid = false;
        }

        if (!cvv) {
            markInvalid(cvvInput, "Enter CVV");
            if (!focusField) {
                focusField = cvvInput;
            }
            isValid = false;
        } else if (!isValidCvv(cvv)) {
            markInvalid(cvvInput, "Enter a valid CVV");
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

    function handlePayClick(event) {
        event.preventDefault();

        clearFieldErrors();

        var method = getSelectedPaymentMethod();

        if (method === "card") {
            var validation = validateCardDetails();
            if (!validation.valid) {
                if (validation.focusField) {
                    validation.focusField.focus();
                }
                return;
            }
        }

        var bookingData = readBookingData();
        if (!bookingData) {
            showMessage("Booking information could not be found. Please complete passenger details first.");
            return;
        }

        var prices = calculatePriceBreakdown(bookingData);
        priceState = prices;

        bookingData.paymentStatus = "Paid";
        bookingData.paymentMethod = getPaymentMethodLabel(method);
        bookingData.totalPrice = prices.grandTotal;
        bookingData.baseFare = prices.baseFare;
        bookingData.baggageTotal = prices.baggage;
        bookingData.mealTotal = prices.meals;
        bookingData.extraServicesTotal = prices.extraServices;
        bookingData.taxesAndFees = prices.taxes;

        try {
            sessionStorage.setItem("bookingData", JSON.stringify(bookingData));
        } catch (error) {
            showMessage("Unable to save payment status. Please try again.");
            return;
        }

        window.location.href = "./confirmation.html";
    }

    function bindClearInvalidOnInput() {
        document.addEventListener("input", function (event) {
            var target = event.target;
            if (target && target.classList && target.classList.contains("payment-field-input")) {
                clearFieldError(target);
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

    function init() {
        var payButton = document.getElementById("pay-button");
        var layout = document.querySelector(".payment-layout");
        var bookingData = readBookingData();

        bindPaymentMethodSelection();
        bindClearInvalidOnInput();
        updateWalletMethodMessage();

        if (payButton) {
            payButton.addEventListener("click", handlePayClick);
        }

        if (!bookingData) {
            showMessage("Booking information could not be found. Please complete passenger details first.");
            if (layout) {
                layout.hidden = true;
            }
            return;
        }

        showMessage("");
        if (layout) {
            layout.hidden = false;
        }
        populatePaymentSummary(bookingData);
    }

    document.addEventListener("DOMContentLoaded", init);
})();
