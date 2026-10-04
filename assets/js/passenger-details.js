(function () {
    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var PNR_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var activeFlightData = null;
    var activeSelectedSeats = [];

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

    function getSelectPlaceholderOption(select) {
        if (!select || select.tagName !== "SELECT" || !select.options.length) {
            return null;
        }

        return select.options[0];
    }

    function rememberOriginalPlaceholder(input) {
        if (!input || input.getAttribute("data-original-placeholder") !== null) {
            return;
        }

        if (input.tagName === "SELECT") {
            var option = getSelectPlaceholderOption(input);
            input.setAttribute(
                "data-original-placeholder",
                option ? option.textContent : ""
            );
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

        if (input.tagName === "SELECT") {
            var option = getSelectPlaceholderOption(input);
            if (option) {
                option.textContent = original;
            }
            return;
        }

        if (original) {
            input.setAttribute("placeholder", original);
        } else {
            input.removeAttribute("placeholder");
        }
    }

    function clearFieldErrors() {
        document.querySelectorAll(".field-input.is-invalid").forEach(function (input) {
            clearFieldError(input);
        });
    }

    function markInvalid(input, message) {
        if (!input) {
            return;
        }

        rememberOriginalPlaceholder(input);
        input.classList.add("is-invalid");

        if (input.tagName === "SELECT") {
            var option = getSelectPlaceholderOption(input);
            if (option) {
                option.textContent = message || "This field is required";
            }

            if (!getTrimmedValue(input)) {
                input.selectedIndex = 0;
            }
            return;
        }

        input.setAttribute("placeholder", message || "This field is required");

        if (!getTrimmedValue(input) && input.type !== "date") {
            input.value = "";
        }
    }

    function getTrimmedValue(input) {
        return input ? String(input.value || "").trim() : "";
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function parseISODate(value) {
        if (!value) {
            return null;
        }

        var parts = String(value).split("-");
        if (parts.length !== 3) {
            return null;
        }

        var year = Number(parts[0]);
        var month = Number(parts[1]);
        var day = Number(parts[2]);
        var date = new Date(year, month - 1, day);

        if (
            !year ||
            !month ||
            !day ||
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        return date;
    }

    function isPastDate(value) {
        var date = parseISODate(value);
        if (!date) {
            return true;
        }

        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    }

    function generatePNR() {
        var pnr = "";
        var i;

        for (i = 0; i < 6; i += 1) {
            pnr += PNR_CHARSET.charAt(Math.floor(Math.random() * PNR_CHARSET.length));
        }

        return pnr;
    }

    function getFieldById(id) {
        return document.getElementById(id);
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

    function collectPassengerData(index, seat) {
        var passengerNumber = index + 1;
        var prefix = "passenger-" + passengerNumber;
        var fields = {
            title: getFieldById(prefix + "-title-field"),
            firstName: getFieldById(prefix + "-first-name"),
            middleName: getFieldById(prefix + "-middle-name"),
            lastName: getFieldById(prefix + "-last-name"),
            dateOfBirth: getFieldById(prefix + "-dob"),
            gender: getFieldById(prefix + "-gender"),
            nationality: getFieldById(prefix + "-nationality"),
            documentType: getFieldById(prefix + "-document-type"),
            documentNumber: getFieldById(prefix + "-document-number"),
            issuingCountry: getFieldById(prefix + "-issuing-country"),
            documentExpiry: getFieldById(prefix + "-document-expiry")
        };

        var requiredChecks = [
            { key: "title", message: "This field is required" },
            { key: "firstName", message: "Enter your first name" },
            { key: "lastName", message: "Enter your last name" },
            { key: "dateOfBirth", message: "Enter your date of birth" },
            { key: "gender", message: "Select your gender" },
            { key: "nationality", message: "Enter your nationality" },
            { key: "documentType", message: "Select document type" },
            { key: "documentNumber", message: "Enter document number" },
            { key: "issuingCountry", message: "Enter issuing country" },
            { key: "documentExpiry", message: "Enter expiry date" }
        ];

        var isValid = true;
        var focusField = null;
        var i;
        var check;
        var value;
        var dateOfBirthValue;
        var documentExpiryValue;

        for (i = 0; i < requiredChecks.length; i += 1) {
            check = requiredChecks[i];
            value = getTrimmedValue(fields[check.key]);

            if (!value) {
                markInvalid(fields[check.key], check.message);
                if (!focusField) {
                    focusField = fields[check.key];
                }
                isValid = false;
            }
        }

        dateOfBirthValue = getTrimmedValue(fields.dateOfBirth);
        if (dateOfBirthValue && !parseISODate(dateOfBirthValue)) {
            markInvalid(fields.dateOfBirth, "Enter your date of birth");
            if (!focusField) {
                focusField = fields.dateOfBirth;
            }
            isValid = false;
        }

        documentExpiryValue = getTrimmedValue(fields.documentExpiry);
        if (documentExpiryValue && !parseISODate(documentExpiryValue)) {
            markInvalid(fields.documentExpiry, "Enter expiry date");
            if (!focusField) {
                focusField = fields.documentExpiry;
            }
            isValid = false;
        } else if (documentExpiryValue && isPastDate(documentExpiryValue)) {
            markInvalid(fields.documentExpiry, "Enter expiry date");
            if (!focusField) {
                focusField = fields.documentExpiry;
            }
            isValid = false;
        }

        if (!isValid) {
            return {
                valid: false,
                focusField: focusField
            };
        }

        return {
            valid: true,
            passenger: {
                title: getTrimmedValue(fields.title),
                firstName: getTrimmedValue(fields.firstName),
                middleName: getTrimmedValue(fields.middleName),
                lastName: getTrimmedValue(fields.lastName),
                dateOfBirth: getTrimmedValue(fields.dateOfBirth),
                gender: getTrimmedValue(fields.gender),
                nationality: getTrimmedValue(fields.nationality),
                documentType: getTrimmedValue(fields.documentType),
                documentNumber: getTrimmedValue(fields.documentNumber),
                issuingCountry: getTrimmedValue(fields.issuingCountry),
                documentExpiryDate: getTrimmedValue(fields.documentExpiry),
                assignedSeat: seat
            }
        };
    }

    function collectContactData() {
        var emailInput = getFieldById("contact-email");
        var countryCodeInput = getFieldById("contact-country-code");
        var phoneInput = getFieldById("contact-phone");
        var email = getTrimmedValue(emailInput);
        var countryCode = getTrimmedValue(countryCodeInput);
        var mobilePhone = getTrimmedValue(phoneInput);
        var isValid = true;
        var focusField = null;

        if (!email) {
            markInvalid(emailInput, "Enter a valid email");
            focusField = emailInput;
            isValid = false;
        } else if (!isValidEmail(email)) {
            markInvalid(emailInput, "Enter a valid email");
            emailInput.value = "";
            focusField = emailInput;
            isValid = false;
        }

        if (!countryCode) {
            markInvalid(countryCodeInput, "This field is required");
            if (!focusField) {
                focusField = countryCodeInput;
            }
            isValid = false;
        }

        if (!mobilePhone) {
            markInvalid(phoneInput, "Enter your phone number");
            if (!focusField) {
                focusField = phoneInput;
            }
            isValid = false;
        }

        if (!isValid) {
            return {
                valid: false,
                focusField: focusField
            };
        }

        return {
            valid: true,
            contact: {
                email: email,
                countryCode: countryCode,
                mobilePhone: mobilePhone
            }
        };
    }

    function buildBookingData(passengers, contact) {
        var flightData = activeFlightData || {};
        var passengerCount = Number(flightData.passengers) || passengers.length;
        var unitPrice = Number(flightData.price);
        var totalPrice = isFinite(unitPrice) ? unitPrice * passengerCount : 0;

        return {
            flight: {
                id: flightData.id || null,
                airline: flightData.airline || "AEROVA",
                flightNumber: flightData.flightNumber || "",
                from: flightData.from || "",
                to: flightData.to || "",
                route: ((flightData.from || "") + " → " + (flightData.to || "")).trim(),
                departure: flightData.departure || "",
                arrival: flightData.arrival || "",
                duration: flightData.duration || "",
                aircraft: flightData.aircraft || "",
                departureDate: flightData.departureDate || "",
                returnDate: flightData.returnDate || "",
                tripType: flightData.tripType || ""
            },
            cabinClass: flightData.cabinClass || "",
            passengerCount: passengerCount,
            selectedSeats: activeSelectedSeats.slice(),
            passengers: passengers,
            contact: contact,
            totalPrice: totalPrice
        };
    }

    function saveBookingData(bookingData) {
        try {
            sessionStorage.setItem("bookingData", JSON.stringify(bookingData));
            return true;
        } catch (error) {
            return false;
        }
    }

    function handleContinueClick() {
        clearFieldErrors();
        showMessage("");

        if (!activeFlightData || !activeSelectedSeats.length) {
            showMessage("Booking data is incomplete. Please return to seat selection.");
            return;
        }

        var passengers = [];
        var i;
        var passengerResult;
        var contactResult;
        var bookingData;
        var isValid = true;
        var focusField = null;

        for (i = 0; i < activeSelectedSeats.length; i += 1) {
            passengerResult = collectPassengerData(i, activeSelectedSeats[i]);

            if (!passengerResult.valid) {
                isValid = false;
                if (!focusField && passengerResult.focusField) {
                    focusField = passengerResult.focusField;
                }
            } else {
                passengers.push(passengerResult.passenger);
            }
        }

        contactResult = collectContactData();
        if (!contactResult.valid) {
            isValid = false;
            if (!focusField && contactResult.focusField) {
                focusField = contactResult.focusField;
            }
        }

        if (!isValid) {
            if (focusField) {
                focusField.focus();
            }
            return;
        }

        bookingData = buildBookingData(passengers, contactResult.contact);

        if (!saveBookingData(bookingData)) {
            showMessage("Unable to save booking details. Please try again.");
            return;
        }

        window.location.href = "confirmation.html";
    }

    function bindContinueButton() {
        var continueButton = document.getElementById("continue-confirmation-button") ||
            document.querySelector(".booking-summary .continue-button");

        if (!continueButton) {
            return;
        }

        continueButton.addEventListener("click", function (event) {
            console.log("Continue button clicked");
            event.preventDefault();
            handleContinueClick();
        });
    }

    function bindClearInvalidOnInput() {
        document.addEventListener("input", function (event) {
            var target = event.target;
            if (target && target.classList && target.classList.contains("field-input")) {
                clearFieldError(target);
            }
        });

        document.addEventListener("change", function (event) {
            var target = event.target;
            if (target && target.classList && target.classList.contains("field-input")) {
                clearFieldError(target);
            }
        });
    }

    function init() {
        var flightData = readSelectedFlight();
        var passengerCount = resolvePassengerCount(flightData);
        var selectedSeats = resolveSelectedSeats(flightData);
        var container = document.getElementById("passenger-cards");

        activeFlightData = flightData;
        activeSelectedSeats = selectedSeats.slice();

        populateBookingSummary(flightData, passengerCount, selectedSeats);
        bindContinueButton();
        bindClearInvalidOnInput();

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
