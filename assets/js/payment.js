(function () {
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

    function formatPrice(price) {
        var amount = Number(price);

        if (!isFinite(amount)) {
            return "$0.00";
        }

        return "$" + amount.toFixed(2);
    }

    function formatDisplayDate(dateValue) {
        if (!dateValue) {
            return "—";
        }

        var parts = String(dateValue).split("-");
        if (parts.length !== 3) {
            return dateValue;
        }

        var year = Number(parts[0]);
        var month = Number(parts[1]);
        var day = Number(parts[2]);

        if (!year || !month || !day || month < 1 || month > 12) {
            return dateValue;
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

        // Taxes & Fees = 10% of base fare; Base Fare + Taxes = Total
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

    function setFormsVisibility(isVisible) {
        var layout = document.querySelector(".payment-layout");
        var payButton = document.getElementById("pay-button");

        if (layout) {
            layout.hidden = !isVisible;
        }

        if (payButton) {
            payButton.disabled = !isVisible;
        }
    }

    function clearSummaryPlaceholders() {
        setText("payment-summary-airline", "—");
        setText("payment-summary-flight-number", "—");
        setText("payment-summary-route", "—");
        setText("payment-summary-date", "—");
        setText("payment-summary-times", "—");
        setText("payment-summary-aircraft", "—");
        setText("payment-summary-cabin", "—");
        setText("payment-summary-passengers", "—");
        setText("payment-summary-seats", "—");
        setText("payment-base-fare", "$0.00");
        setText("payment-taxes", "$0.00");
        setText("payment-total", "$0.00");

        var payButton = document.getElementById("pay-button");
        if (payButton) {
            payButton.textContent = "Pay $0.00";
        }
    }

    function populatePaymentSummary(bookingData) {
        var flight = bookingData.flight || {};
        var selectedSeats = Array.isArray(bookingData.selectedSeats)
            ? bookingData.selectedSeats
            : [];
        var prices = calculatePriceBreakdown(bookingData.totalPrice);
        var route = flight.route ||
            ((flight.from || "—") + " → " + (flight.to || "—"));
        var times = ((flight.departure || "—") + " → " + (flight.arrival || "—"));
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
        }

        if (cardholderInput && cardholderName) {
            cardholderInput.value = cardholderName;
        }
    }

    function init() {
        var bookingData = readBookingData();

        if (!bookingData) {
            showMessage("Booking information could not be found. Please complete passenger details first.");
            clearSummaryPlaceholders();
            setFormsVisibility(false);
            return;
        }

        showMessage("");
        setFormsVisibility(true);
        populatePaymentSummary(bookingData);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
