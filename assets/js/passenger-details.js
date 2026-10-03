(function () {
    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

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

    function showMessage(text) {
        var message = document.getElementById("passenger-details-message");
        if (!message) {
            return;
        }

        message.textContent = text || "";
        message.hidden = !text;
    }

    function formatDisplayDate(dateValue) {
        if (!dateValue) {
            return "Date not selected";
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

    function formatPrice(price) {
        var amount = Number(price);

        if (!isFinite(amount)) {
            return "$0.00";
        }

        return "$" + amount.toFixed(2);
    }

    function readSelectedFlight() {
        try {
            var raw = sessionStorage.getItem("aerovaSelectedFlight");
            if (!raw) {
                return null;
            }

            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function resolvePassengerCount(flightData) {
        var count = Number(flightData && flightData.passengers);

        if (!count || count < 1) {
            return 0;
        }

        return Math.floor(count);
    }

    function resolveSelectedSeats(flightData) {
        if (!flightData) {
            return [];
        }

        var seats = [];

        if (Array.isArray(flightData.selectedSeats)) {
            seats = flightData.selectedSeats;
        } else if (flightData.selectedSeat) {
            seats = String(flightData.selectedSeat).split(",");
        }

        return seats
            .map(function (seat) {
                return String(seat || "").trim();
            })
            .filter(function (seat) {
                return !!seat;
            });
    }

    function hasDuplicateSeats(seats) {
        var seen = {};

        for (var i = 0; i < seats.length; i += 1) {
            var seat = seats[i];
            if (seen[seat]) {
                return true;
            }
            seen[seat] = true;
        }

        return false;
    }

    function buildSelectOptions(options, placeholder) {
        var markup = '<option value="" selected disabled>' + escapeHtml(placeholder) + "</option>";

        options.forEach(function (option) {
            markup += '<option value="' + escapeHtml(option) + '">' + escapeHtml(option) + "</option>";
        });

        return markup;
    }

    function buildPassengerCard(index, seat) {
        var passengerNumber = index + 1;
        var prefix = "passenger-" + passengerNumber;
        var titleId = prefix + "-title";
        var personalId = prefix + "-personal";
        var documentId = prefix + "-document";

        return (
            '<article class="details-card passenger-card" data-passenger-index="' + passengerNumber + '" data-seat="' + escapeHtml(seat) + '" aria-labelledby="' + titleId + '">' +
                '<h2 class="details-card-title" id="' + titleId + '">Passenger ' + passengerNumber + "</h2>" +
                '<p class="passenger-seat">Selected Seat: ' + escapeHtml(seat) + "</p>" +

                '<section class="details-section" aria-labelledby="' + personalId + '">' +
                    '<h3 class="details-section-title" id="' + personalId + '">Personal Information</h3>' +
                    '<div class="field-grid">' +
                        '<div class="field">' +
                            '<label class="field-label" for="' + prefix + '-title-field">Title <span class="required-mark" aria-hidden="true">*</span></label>' +
                            '<select class="field-input" id="' + prefix + '-title-field" name="passengers[' + index + '][title]" required>' +
                                buildSelectOptions(["Mr", "Mrs", "Ms"], "Select title") +
                            "</select>" +
                        "</div>" +
                        '<div class="field">' +
                            '<label class="field-label" for="' + prefix + '-first-name">First Name / Given Name <span class="required-mark" aria-hidden="true">*</span></label>' +
                            '<input class="field-input" id="' + prefix + '-first-name" name="passengers[' + index + '][firstName]" type="text" autocomplete="given-name" required>' +
                        "</div>" +
                        '<div class="field">' +
                            '<label class="field-label" for="' + prefix + '-middle-name">Middle Name <span class="optional-mark">(Optional)</span></label>' +
                            '<input class="field-input" id="' + prefix + '-middle-name" name="passengers[' + index + '][middleName]" type="text" autocomplete="additional-name">' +
                        "</div>" +
                        '<div class="field">' +
                            '<label class="field-label" for="' + prefix + '-last-name">Last Name / Surname <span class="required-mark" aria-hidden="true">*</span></label>' +
                            '<input class="field-input" id="' + prefix + '-last-name" name="passengers[' + index + '][lastName]" type="text" autocomplete="family-name" required>' +
                        "</div>" +
                        '<div class="field">' +
                            '<label class="field-label" for="' + prefix + '-dob">Date of Birth <span class="required-mark" aria-hidden="true">*</span></label>' +
                            '<input class="field-input" id="' + prefix + '-dob" name="passengers[' + index + '][dateOfBirth]" type="date" required>' +
                        "</div>" +
                        '<div class="field">' +
                            '<label class="field-label" for="' + prefix + '-gender">Gender <span class="required-mark" aria-hidden="true">*</span></label>' +
                            '<select class="field-input" id="' + prefix + '-gender" name="passengers[' + index + '][gender]" required>' +
                                buildSelectOptions(
                                    ["Female", "Male", "Other", "Prefer not to say"],
                                    "Select gender"
                                ) +
                            "</select>" +
                        "</div>" +
                        '<div class="field field--full">' +
                            '<label class="field-label" for="' + prefix + '-nationality">Nationality <span class="required-mark" aria-hidden="true">*</span></label>' +
                            '<input class="field-input" id="' + prefix + '-nationality" name="passengers[' + index + '][nationality]" type="text" autocomplete="country-name" required>' +
                        "</div>" +
                    "</div>" +
                "</section>" +

                '<section class="details-section" aria-labelledby="' + documentId + '">' +
                    '<h3 class="details-section-title" id="' + documentId + '">Travel Document</h3>' +
                    '<div class="field-grid">' +
                        '<div class="field">' +
                            '<label class="field-label" for="' + prefix + '-document-type">Document Type <span class="required-mark" aria-hidden="true">*</span></label>' +
                            '<select class="field-input" id="' + prefix + '-document-type" name="passengers[' + index + '][documentType]" required>' +
                                buildSelectOptions(["Passport", "ID Card"], "Select document type") +
                            "</select>" +
                        "</div>" +
                        '<div class="field">' +
                            '<label class="field-label" for="' + prefix + '-document-number">Document Number <span class="required-mark" aria-hidden="true">*</span></label>' +
                            '<input class="field-input" id="' + prefix + '-document-number" name="passengers[' + index + '][documentNumber]" type="text" required>' +
                        "</div>" +
                        '<div class="field">' +
                            '<label class="field-label" for="' + prefix + '-issuing-country">Issuing Country <span class="required-mark" aria-hidden="true">*</span></label>' +
                            '<input class="field-input" id="' + prefix + '-issuing-country" name="passengers[' + index + '][issuingCountry]" type="text" required>' +
                        "</div>" +
                        '<div class="field">' +
                            '<label class="field-label" for="' + prefix + '-document-expiry">Document Expiry Date <span class="required-mark" aria-hidden="true">*</span></label>' +
                            '<input class="field-input" id="' + prefix + '-document-expiry" name="passengers[' + index + '][documentExpiry]" type="date" required>' +
                        "</div>" +
                    "</div>" +
                "</section>" +
            "</article>"
        );
    }

    function populateBookingSummary(flightData, passengerCount, selectedSeats) {
        setText("summary-airline", (flightData && flightData.airline) || "AEROVA");
        setText("summary-flight-number", (flightData && flightData.flightNumber) || "—");
        setText(
            "summary-route",
            ((flightData && flightData.from) || "—") + " → " + ((flightData && flightData.to) || "—")
        );
        setText("summary-date", formatDisplayDate(flightData && flightData.departureDate));
        setText(
            "summary-times",
            ((flightData && flightData.departure) || "—") +
                " → " +
                ((flightData && flightData.arrival) || "—")
        );
        setText("summary-aircraft", (flightData && flightData.aircraft) || "—");
        setText("summary-cabin", (flightData && flightData.cabinClass) || "—");
        setText("summary-passengers", String(passengerCount || "—"));
        setText("summary-seats", selectedSeats.length ? selectedSeats.join(", ") : "—");
        setText("summary-total", formatPrice(flightData && flightData.price));
    }

    function renderPassengerCards(selectedSeats) {
        var container = document.getElementById("passenger-cards");
        if (!container) {
            return;
        }

        var markup = "";

        selectedSeats.forEach(function (seat, index) {
            markup += buildPassengerCard(index, seat);
        });

        container.innerHTML = markup;
    }

    function setFormsVisibility(isVisible) {
        var contactCard = document.getElementById("booking-contact-card");
        var continueButton = document.getElementById("continue-confirmation-button");

        if (contactCard) {
            contactCard.hidden = !isVisible;
        }

        if (continueButton) {
            continueButton.disabled = !isVisible;
        }
    }

    function init() {
        var flightData = readSelectedFlight();
        var passengerCount = resolvePassengerCount(flightData);
        var selectedSeats = resolveSelectedSeats(flightData);
        var container = document.getElementById("passenger-cards");

        populateBookingSummary(flightData, passengerCount, selectedSeats);

        if (!flightData) {
            showMessage("No booking data found. Please select a flight and seats first.");
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        if (!passengerCount) {
            showMessage("Passenger count is missing. Please return to booking and try again.");
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        if (!selectedSeats.length) {
            showMessage("No seats selected. Please return to seat selection and choose seats.");
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        if (hasDuplicateSeats(selectedSeats)) {
            showMessage("Duplicate seats were found. Please return to seat selection and choose unique seats.");
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        if (selectedSeats.length !== passengerCount) {
            showMessage(
                "Selected seats (" +
                    selectedSeats.length +
                    ") do not match the passenger count (" +
                    passengerCount +
                    "). Please return to seat selection."
            );
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        showMessage("");
        setFormsVisibility(true);
        renderPassengerCards(selectedSeats);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
