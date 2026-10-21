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

    var PNR_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var activeFlightData = null;
    var activeSelectedSeats = [];
    var activeSelectedSeatIds = [];
    /* Every flight of the trip in travel order (one for a one-way trip), with the seats chosen on each. */
    var activeLegs = [];
    var activeLegSeats = [];
    var activeLegSeatIds = [];

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

    /* Visible per-field error text (passenger cards); survives language changes via data-error-key. */
    function fieldErrorElement(input) {
        return input && input.id ? document.getElementById(input.id + "-error") : null;
    }

    function hideFieldErrorText(input) {
        var element = fieldErrorElement(input);
        if (input) input.removeAttribute("aria-invalid");
        if (!element) return;
        element.hidden = true;
        element.textContent = "";
        element.removeAttribute("data-error-key");
        element.removeAttribute("data-error-fallback");
        element.removeAttribute("data-error-vars");
    }

    function showFieldError(input, key, fallback, vars) {
        var message = tr(key, fallback, vars);
        markInvalid(input, message);
        if (!input) return;
        input.setAttribute("aria-invalid", "true");
        var element = fieldErrorElement(input);
        if (!element) return;
        element.textContent = message;
        element.hidden = false;
        element.setAttribute("data-error-key", key);
        element.setAttribute("data-error-fallback", fallback);
        element.setAttribute("data-error-vars", JSON.stringify(vars || {}));
    }

    function clearFieldError(input) {
        if (!input || !input.classList.contains("is-invalid")) {
            return;
        }

        input.classList.remove("is-invalid");
        hideFieldErrorText(input);

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
                option.textContent = message || tr("passengers.requiredField", "This field is required");
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

    function resolveSelectedSeatIds(flightData) {
        var ids = flightData && Array.isArray(flightData.selectedSeatIds) ? flightData.selectedSeatIds : [];

        return ids.map(function (id) {
            var number = Number(id);
            return number > 0 && Math.floor(number) === number ? number : 0;
        });
    }

    /* Ages are counted on the first travel day, with the backend's limits (Pricing:InfantMaxAgeYears, ChildMaxAgeYears). */
    var INFANT_UNDER_AGE = 2;
    var ADULT_FROM_AGE = 12;

    function passengerTypeFor(dateOfBirthText) {
        var birth = parseISODate(dateOfBirthText);
        var travel = parseISODate(activeFlightData && activeFlightData.departureDate);

        if (!birth || !travel || birth > travel) {
            return "";
        }

        var age = travel.getFullYear() - birth.getFullYear();
        var monthDiff = travel.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && travel.getDate() < birth.getDate())) {
            age -= 1;
        }

        return age < INFANT_UNDER_AGE ? "Infant" : (age < ADULT_FROM_AGE ? "Child" : "Adult");
    }

    /* An infant travels on an adult's lap: the seat chosen for that passenger is released. */
    function refreshInfantState() {
        var keptSeats = [];
        var keptByLeg = activeLegSeats.map(function () { return []; });

        document.querySelectorAll(".passenger-card").forEach(function (card, index) {
            var birthField = card.querySelector('input[name$="[dateOfBirth]"]');
            var type = passengerTypeFor(birthField ? birthField.value : "");
            var seat = activeSelectedSeats[index];
            var seatLine = card.querySelector(".passenger-seat");

            card.setAttribute("data-passenger-type", type);

            if (seatLine) {
                seatLine.textContent = type === "Infant"
                    ? tr("api.passengers.infantNote", "Infant under 2: travels on an adult's lap, so seat {seat} will be released.", { seat: seat })
                    : tr("travelDocs.selectedSeat", "Selected Seat: {seat}", { seat: seat });
            }

            if (type !== "Infant" && seat) {
                keptSeats.push(seat);
                activeLegSeats.forEach(function (legSeats, legIndex) {
                    if (legSeats[index]) keptByLeg[legIndex].push(legSeats[index]);
                });
            }
        });

        var text = keptByLeg.map(function (list) { return list.join(", "); }).filter(Boolean).join(" | ");
        setText("summary-seats", text || "\u2014");
    }

    function bindInfantRule() {
        var container = document.getElementById("passenger-cards");
        if (!container) {
            return;
        }

        ["input", "change"].forEach(function (eventName) {
            container.addEventListener(eventName, function (event) {
                if (event.target && event.target.name && /\[dateOfBirth\]$/.test(event.target.name)) {
                    refreshInfantState();
                }
            });
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

    var DOCS = window.AEROVA_TRAVEL_DOCS || null;
    var TITLE_OPTIONS = [["Mr", "travelDocs.mr"], ["Mrs", "travelDocs.mrs"], ["Ms", "travelDocs.ms"], ["Mx", "travelDocs.mx"]];
    var GENDER_OPTIONS = [
        ["Female", "travelDocs.female"],
        ["Male", "travelDocs.male"],
        ["Other", "travelDocs.other"],
        ["Prefer not to say", "travelDocs.preferNot"]
    ];
    var DOC_TYPE_FALLBACKS = { passport: "Passport", az_id_card: "Azerbaijani national ID card" };

    /* Options carry English values (stored) and translated labels. */
    function buildKeyedOptions(options, placeholderKey, placeholderFallback) {
        var markup = '<option value="" selected disabled data-i18n="' + placeholderKey + '">' + escapeHtml(tr(placeholderKey, placeholderFallback)) + "</option>";
        options.forEach(function (option) {
            markup += '<option value="' + escapeHtml(option[0]) + '" data-i18n="' + option[1] + '">' + escapeHtml(tr(option[1], option[0])) + "</option>";
        });
        return markup;
    }

    function countryOptions(placeholderKey, placeholderFallback) {
        var countries = DOCS ? DOCS.countries : [];
        return buildKeyedOptions(countries.map(function (country) {
            return [country.code, "travelDocs.countries." + country.code];
        }), placeholderKey, placeholderFallback).replace(/data-i18n="travelDocs\.countries\.(\w+)">([^<]*)</g, function (match, code, text) {
            return 'data-i18n="travelDocs.countries.' + code + '">' + escapeHtml(tr("travelDocs.countries." + code, DOCS.countryName(code))) + "<";
        });
    }

    function fieldLabel(forId, key, fallback, required) {
        return '<label class="field-label" for="' + forId + '"><span data-i18n="' + key + '">' + escapeHtml(tr(key, fallback)) + "</span>" +
            (required
                ? ' <span class="required-mark" aria-hidden="true">*</span>'
                : ' <span class="optional-mark" data-i18n="travelDocs.optional">' + escapeHtml(tr("travelDocs.optional", "(Optional)")) + "</span>") +
            "</label>";
    }

    function fieldError(id) {
        return '<p class="field-error" id="' + id + '-error" hidden></p>';
    }

    function buildPassengerCard(index, seat) {
        var passengerNumber = index + 1;
        var prefix = "passenger-" + passengerNumber;
        var titleId = prefix + "-title";
        var personalId = prefix + "-personal";
        var documentId = prefix + "-document";
        var name = function (field) { return 'name="passengers[' + index + '][' + field + ']"'; };
        var described = function (id, hint) {
            return ' aria-describedby="' + (hint ? id + "-hint " : "") + id + '-error"';
        };

        return (
            '<article class="details-card passenger-card" data-passenger-index="' + passengerNumber + '" data-seat="' + escapeHtml(seat) + '" aria-labelledby="' + titleId + '">' +
                '<h2 class="details-card-title" id="' + titleId + '">' + escapeHtml(tr("passengers.passengerN", "Passenger {n}", { n: passengerNumber })) + "</h2>" +
                '<p class="passenger-seat">' + escapeHtml(tr("travelDocs.selectedSeat", "Selected Seat: {seat}", { seat: seat })) + "</p>" +

                '<section class="details-section" aria-labelledby="' + personalId + '">' +
                    '<h3 class="details-section-title" id="' + personalId + '" data-i18n="travelDocs.personalInfo">' + escapeHtml(tr("travelDocs.personalInfo", "Personal Information")) + "</h3>" +
                    '<div class="field-grid">' +
                        '<div class="field">' +
                            fieldLabel(prefix + "-title-field", "travelDocs.title", "Title", true) +
                            '<select class="field-input" id="' + prefix + '-title-field" ' + name("title") + described(prefix + "-title-field") + " required>" +
                                buildKeyedOptions(TITLE_OPTIONS, "travelDocs.selectTitle", "Select title") +
                            "</select>" + fieldError(prefix + "-title-field") +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-first-name", "travelDocs.firstName", "First Name / Given Name", true) +
                            '<input class="field-input" id="' + prefix + '-first-name" ' + name("firstName") + described(prefix + "-first-name") + ' type="text" autocomplete="given-name" required>' + fieldError(prefix + "-first-name") +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-middle-name", "travelDocs.middleName", "Middle Name", false) +
                            '<input class="field-input" id="' + prefix + '-middle-name" ' + name("middleName") + ' type="text" autocomplete="additional-name">' +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-last-name", "travelDocs.lastName", "Last Name / Surname", true) +
                            '<input class="field-input" id="' + prefix + '-last-name" ' + name("lastName") + described(prefix + "-last-name") + ' type="text" autocomplete="family-name" required>' + fieldError(prefix + "-last-name") +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-dob", "travelDocs.dob", "Date of Birth", true) +
                            '<input class="field-input" id="' + prefix + '-dob" ' + name("dateOfBirth") + described(prefix + "-dob") + ' type="date" required>' + fieldError(prefix + "-dob") +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-gender", "travelDocs.gender", "Gender", true) +
                            '<select class="field-input" id="' + prefix + '-gender" ' + name("gender") + described(prefix + "-gender") + " required>" +
                                buildKeyedOptions(GENDER_OPTIONS, "travelDocs.selectGender", "Select gender") +
                            "</select>" + fieldError(prefix + "-gender") +
                        "</div>" +
                        '<div class="field field--full">' +
                            fieldLabel(prefix + "-nationality", "travelDocs.nationality", "Nationality", true) +
                            '<select class="field-input" id="' + prefix + '-nationality" ' + name("nationality") + described(prefix + "-nationality") + ' data-doc-trigger="nationality" required>' +
                                countryOptions("travelDocs.selectNationality", "Select nationality") +
                            "</select>" + fieldError(prefix + "-nationality") +
                        "</div>" +
                    "</div>" +
                "</section>" +

                '<section class="details-section" aria-labelledby="' + documentId + '">' +
                    '<h3 class="details-section-title" id="' + documentId + '" data-i18n="travelDocs.travelDocument">' + escapeHtml(tr("travelDocs.travelDocument", "Travel Document")) + "</h3>" +
                    '<div class="field-grid">' +
                        '<div class="field field--full">' +
                            fieldLabel(prefix + "-document-type", "travelDocs.documentType", "Document Type", true) +
                            '<select class="field-input" id="' + prefix + '-document-type" ' + name("documentType") + described(prefix + "-document-type") + ' data-doc-trigger="type" required></select>' +
                            fieldError(prefix + "-document-type") +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-document-number", "travelDocs.documentNumber", "Document Number", true) +
                            '<input class="field-input" id="' + prefix + '-document-number" ' + name("documentNumber") + described(prefix + "-document-number", true) + ' type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" required>' +
                            '<p class="field-hint" id="' + prefix + '-document-number-hint"></p>' + fieldError(prefix + "-document-number") +
                        "</div>" +
                        '<div class="field" id="' + prefix + '-issuing-field">' +
                            fieldLabel(prefix + "-issuing-country", "travelDocs.issuingCountry", "Issuing Country", true) +
                            '<select class="field-input" id="' + prefix + '-issuing-country" ' + name("issuingCountry") + described(prefix + "-issuing-country") + ' data-doc-trigger="issuing" data-auto="1" required>' +
                                countryOptions("travelDocs.selectCountry", "Select country") +
                            "</select>" + fieldError(prefix + "-issuing-country") +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-document-expiry", "travelDocs.expiry", "Document Expiry Date", true) +
                            '<input class="field-input" id="' + prefix + '-document-expiry" ' + name("documentExpiry") + described(prefix + "-document-expiry", true) + ' type="date" required>' +
                            '<p class="field-hint" id="' + prefix + '-document-expiry-hint"></p>' + fieldError(prefix + "-document-expiry") +
                        "</div>" +
                    "</div>" +
                "</section>" +
            "</article>"
        );
    }

    /* Last date of travel the document must cover: return date, else arrival, else departure. */
    function lastTravelDate() {
        var flight = activeFlightData || {};
        var candidates = [flight.returnDate, flight.arrivalDate, flight.departureDate];
        for (var i = 0; i < candidates.length; i += 1) {
            if (parseISODate(candidates[i])) return parseISODate(candidates[i]);
        }
        return null;
    }

    function toISODateLocal(date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    }

    function localizedDate(date) {
        var monthName = tr("common.months." + (date.getMonth() + 1), MONTH_NAMES[date.getMonth()]);
        return date.getDate() + " " + monthName + " " + date.getFullYear();
    }

    /* Earliest acceptable expiry date (exclusive bound is the last travel date + mock validity days). */
    function minimumExpiryDate(minValidityDays) {
        var base = lastTravelDate();
        if (!base) {
            base = new Date();
            base.setHours(0, 0, 0, 0);
        }
        var date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (minValidityDays || 0) + 1);
        return { travel: base, minimum: date };
    }

    function documentOptionsFor(card) {
        var nationality = card.querySelector('[data-doc-trigger="nationality"]').value;
        if (!DOCS) {
            return { routeType: "international", countries: [], documents: ["passport"], minValidityDays: 0 };
        }
        return DOCS.documentOptions(activeFlightData, nationality);
    }

    function documentTypeDefinition(code) {
        return DOCS && DOCS.documentTypes[code] ? DOCS.documentTypes[code] : null;
    }

    /* Rebuilds document type options, issuing country, hints and limits for one passenger card. */
    function updateDocumentFields(card) {
        var prefix = "passenger-" + card.getAttribute("data-passenger-index");
        var nationalitySelect = getFieldById(prefix + "-nationality");
        var typeSelect = getFieldById(prefix + "-document-type");
        var numberInput = getFieldById(prefix + "-document-number");
        var issuingSelect = getFieldById(prefix + "-issuing-country");
        var issuingField = getFieldById(prefix + "-issuing-field");
        var options = documentOptionsFor(card);
        var current = typeSelect.value;
        var typeChanged;

        typeSelect.innerHTML = buildKeyedOptions(options.documents.map(function (code) {
            return [code, "travelDocs.docTypes." + code];
        }), "travelDocs.selectDocumentType", "Select document type").replace(/data-i18n="travelDocs\.docTypes\.(\w+)">[^<]*</g, function (match, code) {
            return 'data-i18n="travelDocs.docTypes.' + code + '">' + escapeHtml(tr("travelDocs.docTypes." + code, DOC_TYPE_FALLBACKS[code] || code)) + "<";
        });

        if (options.documents.indexOf(current) !== -1) {
            typeSelect.value = current;
        } else if (options.documents.length === 1) {
            typeSelect.value = options.documents[0];
        } else {
            typeSelect.value = "";
        }
        typeChanged = typeSelect.value !== card.getAttribute("data-doc-type");
        card.setAttribute("data-doc-type", typeSelect.value);
        card.setAttribute("data-min-validity", String(options.minValidityDays || 0));
        if (typeSelect.value) clearFieldError(typeSelect);

        var definition = documentTypeDefinition(typeSelect.value);
        if (definition && definition.issuingCountry !== "select") {
            issuingField.hidden = true;
            issuingSelect.value = definition.issuingCountry;
            issuingSelect.setAttribute("data-auto", "1");
            clearFieldError(issuingSelect);
        } else {
            issuingField.hidden = false;
            if ((issuingSelect.getAttribute("data-auto") === "1" || !issuingSelect.value) && nationalitySelect.value) {
                issuingSelect.value = nationalitySelect.value;
                issuingSelect.setAttribute("data-auto", "1");
                clearFieldError(issuingSelect);
            }
        }

        numberInput.maxLength = definition && definition.code === "az_id_card" ? 11 : 9;
        setText(prefix + "-document-number-hint", definition
            ? tr("travelDocs.hints." + definition.code, definition.code === "az_id_card" ? "AA + 7 digits or AZE + 8 digits, e.g. {example}" : "6–9 letters or digits, e.g. {example}", { example: definition.numberExample })
            : tr("travelDocs.hints.chooseType", "Choose a document type first."));
        if (typeChanged && numberInput.value) clearFieldError(numberInput);

        var limits = minimumExpiryDate(options.minValidityDays);
        getFieldById(prefix + "-document-expiry").min = toISODateLocal(limits.minimum);
        setText(prefix + "-document-expiry-hint", options.minValidityDays
            ? tr("travelDocs.hints.expiryValidity", "Must be valid at least {days} days after {date}.", { days: options.minValidityDays, date: localizedDate(limits.travel) })
            : tr("travelDocs.hints.expiry", "Must be valid after your last travel date ({date}).", { date: localizedDate(limits.travel) }));
    }

    function updateRouteNotice() {
        var notice = getFieldById("travel-docs-notice");
        if (!notice || !DOCS || !activeFlightData) return;
        var countries = DOCS.routeCountries(activeFlightData);
        var names = countries.map(function (code) { return tr("travelDocs.countries." + code, DOCS.countryName(code) || "—"); });
        var unique = names.filter(function (value, index) { return names.indexOf(value) === index; });
        var domestic = DOCS.routeType(activeFlightData) === "domestic";
        setText("travel-docs-route", domestic
            ? tr("travelDocs.routeDomestic", "Domestic flight within {country}", { country: names[0] })
            : tr("travelDocs.routeInternational", "International flight: {countries}", { countries: unique.join(" → ") }));
        notice.setAttribute("data-route-type", domestic ? "domestic" : "international");
        notice.hidden = false;
    }

    function refreshPassengerCardText() {
        document.querySelectorAll(".passenger-card").forEach(function (card) {
            var index = Number(card.getAttribute("data-passenger-index"));
            setText("passenger-" + index + "-title", tr("passengers.passengerN", "Passenger {n}", { n: index }));
            updateDocumentFields(card);
            card.querySelectorAll(".field-error[data-error-key]").forEach(function (element) {
                var vars = {};
                try { vars = JSON.parse(element.getAttribute("data-error-vars") || "{}"); } catch (error) { vars = {}; }
                element.textContent = tr(element.getAttribute("data-error-key"), element.getAttribute("data-error-fallback"), vars);
            });
        });
        updateRouteNotice();
        refreshInfantState();
    }

    /*
     * Saved passengers (GET api/profile/saved-passengers) for signed-in travellers. Each card gets a list to fill it from one of them;
     * the choice is sent as savedPassengerId so the backend can check it belongs to the account. Guests see nothing here.
     */
    var savedPassengers = [];

    var SAVED_GENDERS = { Male: "Male", Female: "Female", Other: "Other", PreferNotToSay: "Prefer not to say" };
    var SAVED_DOCUMENTS = { Passport: "passport", NationalIdCard: "az_id_card" };

    function savedLabel(saved) {
        return (saved.firstName + " " + saved.lastName).trim() + (saved.relationship ? " (" + saved.relationship + ")" : "");
    }

    function setCardField(id, value, bubbles) {
        var field = document.getElementById(id);
        if (!field || value == null || value === "") {
            return;
        }
        field.value = value;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: bubbles !== false }));
    }

    /* Fills what the saved passenger knows; the traveller completes the rest (title, and any detail that was never saved). */
    function fillCardFromSaved(card, saved) {
        var prefix = "passenger-" + card.getAttribute("data-passenger-index") + "-";

        setCardField(prefix + "first-name", saved.firstName);
        setCardField(prefix + "last-name", saved.lastName);
        setCardField(prefix + "dob", saved.dateOfBirth);
        setCardField(prefix + "gender", saved.gender ? SAVED_GENDERS[saved.gender] : "");
        // The nationality decides which documents are offered, so it goes first.
        setCardField(prefix + "nationality", saved.nationalityCode);
        setCardField(prefix + "document-type", saved.documentType ? SAVED_DOCUMENTS[saved.documentType] : "");
        setCardField(prefix + "document-number", saved.documentNumber);
        setCardField(prefix + "issuing-country", saved.documentIssuingCountry);
        setCardField(prefix + "document-expiry", saved.documentExpiryDate);
    }

    function refreshSavedChoices() {
        var taken = {};
        document.querySelectorAll(".passenger-card[data-saved-id]").forEach(function (card) {
            taken[card.getAttribute("data-saved-id")] = true;
        });

        document.querySelectorAll(".saved-picker select").forEach(function (select) {
            Array.prototype.forEach.call(select.options, function (option) {
                option.disabled = !!option.value && !!taken[option.value] && option.value !== select.value;
            });
        });
    }

    function attachSavedPickers() {
        if (!savedPassengers.length) {
            return;
        }

        document.querySelectorAll(".passenger-card").forEach(function (card) {
            if (card.querySelector(".saved-picker")) {
                return;
            }

            var number = card.getAttribute("data-passenger-index");
            var id = "passenger-" + number + "-saved";
            var wrapper = document.createElement("div");
            wrapper.className = "field field--full saved-picker";
            wrapper.innerHTML =
                '<label class="field-label" for="' + id + '">' + escapeHtml(tr("api.passengers.savedLabel", "Saved passenger")) + "</label>" +
                '<select class="field-input" id="' + id + '">' +
                    '<option value="">' + escapeHtml(tr("api.passengers.savedNone", "Enter the details myself")) + "</option>" +
                    savedPassengers.map(function (saved) {
                        return '<option value="' + saved.id + '">' + escapeHtml(savedLabel(saved)) + "</option>";
                    }).join("") +
                "</select>";

            var firstSection = card.querySelector(".details-section");
            card.insertBefore(wrapper, firstSection);

            wrapper.querySelector("select").addEventListener("change", function (event) {
                var chosen = savedPassengers.filter(function (saved) { return String(saved.id) === event.target.value; })[0];

                if (chosen) {
                    card.setAttribute("data-saved-id", String(chosen.id));
                    fillCardFromSaved(card, chosen);
                } else {
                    card.removeAttribute("data-saved-id");
                }

                refreshSavedChoices();
            });
        });
    }

    function loadSavedPassengers() {
        if (!window.AerovaAuth || !window.AerovaAuth.isLoggedIn() || !window.AEROVA_API) {
            return;
        }

        window.AEROVA_API.get("api/profile/saved-passengers").then(function (list) {
            savedPassengers = list || [];
            attachSavedPickers();
        }).catch(function () {
            // The list is a convenience: without it the traveller simply types the details.
        });
    }

    function bindDocumentControls() {
        var container = document.getElementById("passenger-cards");
        if (!container) return;
        container.addEventListener("change", function (event) {
            var trigger = event.target && event.target.getAttribute("data-doc-trigger");
            if (!trigger) return;
            var card = event.target.closest(".passenger-card");
            if (!card) return;
            if (trigger === "issuing") {
                event.target.setAttribute("data-auto", "0");
                return;
            }
            updateDocumentFields(card);
        });
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
        var total = activeLegs.reduce(function (sum, leg) { return sum + (Number(leg.price) || 0); }, 0);
        setText("summary-total", formatPrice(activeLegs.length > 1 ? total : (flightData && flightData.price)));

        if (window.AEROVA_JOURNEY) {
            window.AEROVA_JOURNEY.paintReturnLine("summary-times", activeLegs.map(function (leg) {
                return { flight: leg };
            }));
        }
        if (activeLegSeats.length > 1) {
            setText("summary-seats", activeLegSeats.map(function (list) { return list.join(", "); }).join(" | "));
        }
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
        container.querySelectorAll(".passenger-card").forEach(updateDocumentFields);
        updateRouteNotice();
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

        var issuingVisible = !getFieldById(prefix + "-issuing-field").hidden;
        var requiredChecks = [
            { key: "title", error: "travelDocs.errors.title", message: "Select a title" },
            { key: "firstName", error: "travelDocs.errors.firstName", message: "Enter your first name" },
            { key: "lastName", error: "travelDocs.errors.lastName", message: "Enter your last name" },
            { key: "dateOfBirth", error: "travelDocs.errors.dob", message: "Enter your date of birth" },
            { key: "gender", error: "travelDocs.errors.gender", message: "Select your gender" },
            { key: "nationality", error: "travelDocs.errors.nationality", message: "Select your nationality" },
            { key: "documentType", error: "travelDocs.errors.documentType", message: "Select document type" },
            { key: "documentNumber", error: "travelDocs.errors.documentNumber", message: "Enter document number" },
            { key: "issuingCountry", error: "travelDocs.errors.issuingCountry", message: "Select issuing country", skip: !issuingVisible },
            { key: "documentExpiry", error: "travelDocs.errors.expiry", message: "Enter expiry date" }
        ];

        var isValid = true;
        var focusField = null;
        var invalid = function (field, key, fallback, vars) {
            showFieldError(field, key, fallback, vars);
            if (!focusField) focusField = field;
            isValid = false;
        };
        var card = fields.title ? fields.title.closest(".passenger-card") : null;
        var options = card ? documentOptionsFor(card) : { documents: ["passport"], minValidityDays: 0, routeType: "international", countries: [] };
        var definition = documentTypeDefinition(getTrimmedValue(fields.documentType));
        var numberValue = getTrimmedValue(fields.documentNumber).toUpperCase().replace(/[\s-]/g, "");
        var dateOfBirth = parseISODate(getTrimmedValue(fields.dateOfBirth));
        var expiryValue = getTrimmedValue(fields.documentExpiry);
        var expiry = parseISODate(expiryValue);
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        requiredChecks.forEach(function (check) {
            if (!check.skip && !getTrimmedValue(fields[check.key])) {
                invalid(fields[check.key], check.error, check.message);
            }
        });

        if (getTrimmedValue(fields.dateOfBirth) && (!dateOfBirth || dateOfBirth >= today)) {
            invalid(fields.dateOfBirth, "travelDocs.errors.dobInvalid", "Enter a valid date of birth in the past");
        }

        if (getTrimmedValue(fields.documentType) && (!definition || options.documents.indexOf(definition.code) === -1)) {
            invalid(fields.documentType, "travelDocs.errors.documentTypeNotAllowed", "This document type is not accepted for this route");
        } else if (definition && numberValue && !definition.numberPattern.test(numberValue)) {
            invalid(
                fields.documentNumber,
                "travelDocs.errors.number_" + definition.code,
                definition.code === "az_id_card"
                    ? "Enter a valid ID card number (AA + 7 digits or AZE + 8 digits), e.g. {example}"
                    : "Enter a valid passport number (6–9 letters or digits), e.g. {example}",
                { example: definition.numberExample }
            );
        }

        if (expiryValue) {
            var limits = minimumExpiryDate(options.minValidityDays);
            if (!expiry) {
                invalid(fields.documentExpiry, "travelDocs.errors.expiry", "Enter expiry date");
            } else if (expiry < limits.minimum) {
                if (options.minValidityDays) {
                    invalid(fields.documentExpiry, "travelDocs.errors.expiryValidity", "The document must be valid at least {days} days after {date}", { days: options.minValidityDays, date: localizedDate(limits.travel) });
                } else {
                    invalid(fields.documentExpiry, "travelDocs.errors.expiryAfterTravel", "The document must be valid after your last travel date ({date})", { date: localizedDate(limits.travel) });
                }
            }
        }

        if (!isValid) {
            return {
                valid: false,
                focusField: focusField
            };
        }

        var passengerType = passengerTypeFor(getTrimmedValue(fields.dateOfBirth));
        var isInfant = passengerType === "Infant";
        var nationalityCode = getTrimmedValue(fields.nationality);
        var issuingCode = definition.issuingCountry !== "select" ? definition.issuingCountry : getTrimmedValue(fields.issuingCountry);
        var countryName = function (code) { return DOCS ? DOCS.countryName(code) : code; };

        return {
            valid: true,
            passenger: {
                title: getTrimmedValue(fields.title),
                firstName: getTrimmedValue(fields.firstName),
                middleName: getTrimmedValue(fields.middleName),
                lastName: getTrimmedValue(fields.lastName),
                dateOfBirth: getTrimmedValue(fields.dateOfBirth),
                gender: getTrimmedValue(fields.gender),
                /* Legacy string fields kept for compatibility (English names / labels). */
                nationality: countryName(nationalityCode),
                documentType: definition.legacyLabel,
                documentNumber: numberValue,
                issuingCountry: countryName(issuingCode),
                documentExpiryDate: expiryValue,
                passengerType: passengerType,
                assignedSeat: isInfant ? null : seat,
                savedPassengerId: card && Number(card.getAttribute("data-saved-id")) > 0 ? Number(card.getAttribute("data-saved-id")) : null,
                assignedSeatId: isInfant ? null : (activeSelectedSeatIds[index] || null),
                assignedSeats: isInfant ? [] : activeLegs.map(function (leg, legIndex) {
                    return { flightId: leg.id, flightSeatId: activeLegSeatIds[legIndex][index] || null, label: activeLegSeats[legIndex][index] || null };
                }),
                /* Structured document details (mock rules, see travel-documents.js). */
                nationalityCode: nationalityCode,
                document: {
                    type: definition.code,
                    number: numberValue,
                    issuingCountry: issuingCode,
                    expiryDate: expiryValue
                }
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

        function legData(leg, legIndex) {
            return {
                flight: {
                    id: leg.id || null,
                    airline: leg.airline || "AEROVA",
                    flightNumber: leg.flightNumber || "",
                    from: leg.from || "",
                    to: leg.to || "",
                    route: ((leg.from || "") + " \u2192 " + (leg.to || "")).trim(),
                    departure: leg.departure || "",
                    arrival: leg.arrival || "",
                    duration: leg.duration || "",
                    aircraft: leg.aircraft || "",
                    departureDate: leg.departureDate || "",
                    returnDate: leg.returnDate || "",
                    tripType: leg.tripType || ""
                },
                cabinClass: leg.cabinClass || "",
                selectedSeats: passengers.map(function (passenger) {
                    return passenger.assignedSeats && passenger.assignedSeats[legIndex] ? passenger.assignedSeats[legIndex].label : null;
                }).filter(Boolean),
                selectedSeatIds: passengers.map(function (passenger) {
                    return passenger.assignedSeats && passenger.assignedSeats[legIndex] ? passenger.assignedSeats[legIndex].flightSeatId : null;
                }).filter(Boolean)
            };
        }

        return {
            legs: activeLegs.map(legData),
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
            selectedSeats: passengers.map(function (passenger) { return passenger.assignedSeat; }).filter(Boolean),
            selectedSeatIds: passengers.map(function (passenger) { return passenger.assignedSeatId; }).filter(Boolean),
            passengers: passengers,
            contact: contact,
            totalPrice: totalPrice,
            travelDocuments: DOCS ? {
                routeType: DOCS.routeType(flightData),
                countries: DOCS.routeCountries(flightData),
                rulesVersion: DOCS.version,
                mockRules: true
            } : null
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
            showMessage(tr("passengers.incompleteBooking", "Booking data is incomplete. Please return to seat selection."));
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

        var adults = passengers.filter(function (passenger) { return passenger.passengerType === "Adult"; }).length;
        var infants = passengers.filter(function (passenger) { return passenger.passengerType === "Infant"; }).length;

        if (adults === 0) {
            showMessage(tr("api.passengers.needAdult", "At least one passenger must be 12 or older."));
            return;
        }

        if (infants > adults) {
            showMessage(tr("api.passengers.tooManyInfants", "Each infant needs an adult: there cannot be more infants than adults."));
            return;
        }

        bookingData = buildBookingData(passengers, contactResult.contact);

        if (!saveBookingData(bookingData)) {
            showMessage(tr("passengers.saveFail", "Unable to save booking details. Please try again."));
            return;
        }

        window.location.href = "baggage-selection.html";
    }

    function bindContinueButton() {
        var continueButton = document.getElementById("continue-confirmation-button") ||
            document.querySelector(".booking-summary .continue-button");

        if (!continueButton) {
            return;
        }

        continueButton.addEventListener("click", function (event) {
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
        var chosen = readSelectedFlight();
        activeLegs = window.AEROVA_JOURNEY ? window.AEROVA_JOURNEY.legs(chosen) : (chosen ? [chosen] : []);

        // A return flight without its outbound flight cannot be booked on its own.
        var returnWithoutOutbound = !!chosen && !!window.AEROVA_JOURNEY && window.AEROVA_JOURNEY.isReturnLeg(chosen) && activeLegs.length < 2;
        var flightData = returnWithoutOutbound ? null : (activeLegs[0] || null);
        var passengerCount = resolvePassengerCount(flightData);
        var selectedSeats = resolveSelectedSeats(flightData);
        var container = document.getElementById("passenger-cards");

        activeFlightData = flightData;
        activeSelectedSeats = selectedSeats.slice();
        activeSelectedSeatIds = resolveSelectedSeatIds(flightData);
        activeLegSeats = activeLegs.map(resolveSelectedSeats);
        activeLegSeatIds = activeLegs.map(resolveSelectedSeatIds);

        populateBookingSummary(flightData, passengerCount, selectedSeats);
        bindContinueButton();
        bindClearInvalidOnInput();
        bindDocumentControls();
        window.addEventListener("aerova:languagechange", refreshPassengerCardText);

        if (!flightData) {
            showMessage(returnWithoutOutbound
                ? tr("api.journey.outboundMissing", "The outbound flight of this round trip is missing. Please start your search again.")
                : tr("passengers.noBooking", "No booking data found. Please select a flight and seats first."));
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        if (!passengerCount) {
            showMessage(tr("passengers.missingCount", "Passenger count is missing. Please return to booking and try again."));
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        if (!selectedSeats.length) {
            showMessage(tr("passengers.noSeats", "No seats selected. Please return to seat selection and choose seats."));
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        if (hasDuplicateSeats(selectedSeats)) {
            showMessage(tr("passengers.duplicateSeats", "Duplicate seats were found. Please return to seat selection and choose unique seats."));
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

        // Every other flight of the trip needs the same number of different seats with their ids.
        var otherLegBroken = activeLegSeats.some(function (legSeats, legIndex) {
            var ids = activeLegSeatIds[legIndex];
            return legSeats.length !== passengerCount || hasDuplicateSeats(legSeats) || ids.length !== legSeats.length || ids.indexOf(0) !== -1;
        });

        if (otherLegBroken || activeSelectedSeatIds.length !== selectedSeats.length || activeSelectedSeatIds.indexOf(0) !== -1) {
            showMessage(tr("api.passengers.seatDataMissing", "Seat details are missing. Please return to seat selection."));
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        showMessage("");
        setFormsVisibility(true);
        renderPassengerCards(selectedSeats);
        bindInfantRule();
        loadSavedPassengers();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
