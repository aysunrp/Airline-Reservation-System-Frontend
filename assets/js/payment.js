(function () {
    "use strict";

    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

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

    function calculatePriceBreakdown(totalPrice) {
        var total = Number(totalPrice);
        if (!isFinite(total) || total < 0) {
            total = 0;
        }

        var baseFare = total / 1.1;
        var taxes = total - baseFare;

        return {
            baseFare: baseFare,
            taxes: taxes,
            total: total
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
        var prices = calculatePriceBreakdown(bookingData.totalPrice);
        var route = flight.route || ((flight.from || "—") + " → " + (flight.to || "—"));
        var times = (flight.departure || "—") + " → " + (flight.arrival || "—");
        var payButton = document.getElementById("pay-button");
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
            selectedSeats.length ? selectedSeats.join(", ") : "—"
        );
        setText("payment-base-fare", formatPrice(prices.baseFare));
        setText("payment-taxes", formatPrice(prices.taxes));
        setText("payment-total", formatPrice(prices.total));

        if (payButton) {
            payButton.textContent = "Pay " + formatPrice(prices.total);
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

        bookingData.paymentStatus = "Paid";
        bookingData.paymentMethod = getPaymentMethodLabel(method);

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
