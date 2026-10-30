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
                option.textContent = message || tr("passengers.requiredField", "Bu sahə mütləqdir");
            }

            if (!getTrimmedValue(input)) {
                input.selectedIndex = 0;
            }
            return;
        }

        input.setAttribute("placeholder", message || "Bu sahə mütləqdir");

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
            return "Tarix seçilməyib";
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

        return (day < 10 ? "0" + day : day) + "." + (month < 10 ? "0" + month : month) + "." + year;
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

    /*
     * Ages are counted on the day of the last flight of the trip (its departure airport's local day), with the server's limits
     * (GET api/booking-options/passenger-rules: Pricing:InfantMaxAgeYears, ChildMaxAgeYears). The server decides in the end.
     */
    var INFANT_UNDER_AGE = 2;
    var ADULT_FROM_AGE = 12;

    function loadPassengerRules() {
        if (!window.AEROVA_API || typeof window.AEROVA_API.get !== "function") {
            return;
        }

        window.AEROVA_API.get("api/booking-options/passenger-rules").then(function (rules) {
            if (rules && rules.infantMaxAgeYears > 0 && rules.childMaxAgeYears > rules.infantMaxAgeYears) {
                INFANT_UNDER_AGE = rules.infantMaxAgeYears;
                ADULT_FROM_AGE = rules.childMaxAgeYears;
                refreshPassengerCardText();
            }
        }).catch(function () {
            // The defaults are the server's usual limits; the server checks every booking anyway.
        });
    }

    /* The last flight of the trip. */
    function lastFlightDate() {
        var last = activeLegs.length ? activeLegs[activeLegs.length - 1] : activeFlightData;
        return parseISODate(last && last.departureDate);
    }

    /*
     * Who travels, as chosen in the search: adults and children have the seats picked on the seat page, infants none.
     * Null when the selection does not carry it (an older selection): then the type only follows the date of birth.
     */
    function declaredMix() {
        var data = activeFlightData;
        if (!data || data.adults == null || data.adults === "") {
            return null;
        }

        var mix = {
            adults: Math.max(0, Math.floor(Number(data.adults)) || 0),
            children: Math.max(0, Math.floor(Number(data.children)) || 0),
            infants: Math.max(0, Math.floor(Number(data.infants)) || 0)
        };

        return mix.adults + mix.children === activeSelectedSeats.length ? mix : null;
    }

    function declaredInfants() {
        var mix = declaredMix();
        return mix ? mix.infants : 0;
    }

    /* Adults first, then children, then infants. */
    function declaredType(index) {
        var mix = declaredMix();
        if (!mix) {
            return "";
        }
        return index < mix.adults ? "Adult" : (index < mix.adults + mix.children ? "Child" : "Infant");
    }

    /*
     * The seats of one passenger (card number n) on every flight of the trip, named by flight: "Outbound seat: 12A · Return seat:
     * 14C" on a round trip, "Flight 1 seat: ... · Flight 2 seat: ..." on a multi-city trip. Each flight has its own seat.
     */
    function seatLineFor(number, fallbackSeat) {
        var legs = activeLegSeats.length > 1 ? activeLegSeats : null;
        if (!legs) {
            return tr("travelDocs.selectedSeat", "Seçilmiş oturacaq: {seat}", { seat: fallbackSeat });
        }

        var roundTrip = legs.length === 2 && !(activeLegs[0] && window.AEROVA_JOURNEY && window.AEROVA_JOURNEY.isMultiCity(activeLegs[0]));
        return legs.map(function (legSeats, legIndex) {
            var seat = legSeats[number - 1] || "—";
            if (roundTrip) {
                return legIndex === 0
                    ? tr("api.journey.seatOutbound", "Gediş oturacağı: {seat}", { seat: seat })
                    : tr("api.journey.seatReturn", "Qayıdış oturacağı: {seat}", { seat: seat });
            }
            return tr("api.journey.seatLeg", "Reys {n} oturacağı: {seat}", { n: legIndex + 1, seat: seat });
        }).join(" · ");
    }

    /* The seats of the whole trip for the summary, named by flight. */
    function legSeatsSummary(lists) {
        var roundTrip = lists.length === 2 && !(activeLegs[0] && window.AEROVA_JOURNEY && window.AEROVA_JOURNEY.isMultiCity(activeLegs[0]));
        return lists.map(function (list, legIndex) {
            var seats = list.join(", ") || "—";
            if (roundTrip) {
                return legIndex === 0
                    ? tr("api.journey.seatsOutboundList", "Gediş: {seats}", { seats: seats })
                    : tr("api.journey.seatsReturnList", "Qayıdış: {seats}", { seats: seats });
            }
            return tr("api.journey.seatsLegList", "Reys {n}: {seats}", { n: legIndex + 1, seats: seats });
        }).join(" · ");
    }

    function cardTitle(number, type) {
        return type
            ? tr("api.passengers.card" + type, "Passenger {n} \u00b7 " + type, { n: number })
            : tr("passengers.passengerN", "Sərnişin {n}", { n: number });
    }

    function passengerTypeFor(dateOfBirthText) {
        var birth = parseISODate(dateOfBirthText);
        var travel = lastFlightDate();

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
        // With the travellers chosen in the search the seats stay as picked; infants never had one.
        if (declaredMix()) {
            document.querySelectorAll(".passenger-card").forEach(function (card) {
                var birthField = card.querySelector('input[name$="[dateOfBirth]"]');
                card.setAttribute("data-passenger-type", passengerTypeFor(birthField ? birthField.value : ""));
            });
            return;
        }

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
                    ? tr("api.passengers.infantNote", "2 yaşdan kiçik körpə: böyüyün qucağında uçur, ona görə {seat} oturacağı azad ediləcək.", { seat: seat })
                    : seatLineFor(index + 1, seat);
            }

            if (type !== "Infant" && seat) {
                keptSeats.push(seat);
                activeLegSeats.forEach(function (legSeats, legIndex) {
                    if (legSeats[index]) keptByLeg[legIndex].push(legSeats[index]);
                });
            }
        });

        var text = keptByLeg.length > 1 ? legSeatsSummary(keptByLeg) : keptByLeg.map(function (list) { return list.join(", "); }).filter(Boolean).join(" | ");
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
        ["Göstərmək istəmirəm", "travelDocs.preferNot"]
    ];
    var DOC_TYPE_FALLBACKS = { passport: "Passport", az_id_card: "Azərbaycan şəxsiyyət vəsiqəsi" };

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
                : ' <span class="optional-mark" data-i18n="travelDocs.optional">' + escapeHtml(tr("travelDocs.optional", "(İstəyə bağlı)")) + "</span>") +
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

        var declared = declaredType(index);

        return (
            '<article class="details-card passenger-card" data-passenger-index="' + passengerNumber + '" data-seat="' + escapeHtml(seat) + '" data-declared-type="' + declared + '" aria-labelledby="' + titleId + '">' +
                '<h2 class="details-card-title" id="' + titleId + '">' + escapeHtml(cardTitle(passengerNumber, declared)) + "</h2>" +
                '<p class="passenger-seat">' + escapeHtml(declared === "Infant"
                    ? tr("api.passengers.infantLap", "Körpə: böyüyün qucağında uçur, oturacaq lazım deyil.")
                    : seatLineFor(passengerNumber, seat)) + "</p>" +

                '<section class="details-section" aria-labelledby="' + personalId + '">' +
                    '<h3 class="details-section-title" id="' + personalId + '" data-i18n="travelDocs.personalInfo">' + escapeHtml(tr("travelDocs.personalInfo", "Şəxsi məlumatlar")) + "</h3>" +
                    '<div class="field-grid">' +
                        '<div class="field">' +
                            fieldLabel(prefix + "-title-field", "travelDocs.title", "Müraciət", true) +
                            '<select class="field-input" id="' + prefix + '-title-field" ' + name("title") + described(prefix + "-title-field") + " required>" +
                                buildKeyedOptions(TITLE_OPTIONS, "travelDocs.selectTitle", "Müraciəti seçin") +
                            "</select>" + fieldError(prefix + "-title-field") +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-first-name", "travelDocs.firstName", "Ad", true) +
                            '<input class="field-input" id="' + prefix + '-first-name" ' + name("firstName") + described(prefix + "-first-name") + ' type="text" autocomplete="given-name" required>' + fieldError(prefix + "-first-name") +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-middle-name", "travelDocs.middleName", "Ata adı", false) +
                            '<input class="field-input" id="' + prefix + '-middle-name" ' + name("middleName") + ' type="text" autocomplete="additional-name">' +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-last-name", "travelDocs.lastName", "Soyad", true) +
                            '<input class="field-input" id="' + prefix + '-last-name" ' + name("lastName") + described(prefix + "-last-name") + ' type="text" autocomplete="family-name" required>' + fieldError(prefix + "-last-name") +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-dob", "travelDocs.dob", "Doğum tarixi", true) +
                            '<input class="field-input" id="' + prefix + '-dob" ' + name("dateOfBirth") + described(prefix + "-dob") + ' type="date" required>' + fieldError(prefix + "-dob") +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-gender", "travelDocs.gender", "Cins", true) +
                            '<select class="field-input" id="' + prefix + '-gender" ' + name("gender") + described(prefix + "-gender") + " required>" +
                                buildKeyedOptions(GENDER_OPTIONS, "travelDocs.selectGender", "Cinsi seçin") +
                            "</select>" + fieldError(prefix + "-gender") +
                        "</div>" +
                        '<div class="field field--full">' +
                            fieldLabel(prefix + "-nationality", "travelDocs.nationality", "Vətəndaşlıq", true) +
                            '<select class="field-input" id="' + prefix + '-nationality" ' + name("nationality") + described(prefix + "-nationality") + ' data-doc-trigger="nationality" required>' +
                                countryOptions("travelDocs.selectNationality", "Vətəndaşlığı seçin") +
                            "</select>" + fieldError(prefix + "-nationality") +
                        "</div>" +
                    "</div>" +
                "</section>" +

                '<section class="details-section" aria-labelledby="' + documentId + '">' +
                    '<h3 class="details-section-title" id="' + documentId + '" data-i18n="travelDocs.travelDocument">' + escapeHtml(tr("travelDocs.travelDocument", "Səyahət sənədi")) + "</h3>" +
                    '<div class="field-grid">' +
                        '<div class="field field--full">' +
                            fieldLabel(prefix + "-document-type", "travelDocs.documentType", "Sənəd növü", true) +
                            '<select class="field-input" id="' + prefix + '-document-type" ' + name("documentType") + described(prefix + "-document-type") + ' data-doc-trigger="type" required></select>' +
                            fieldError(prefix + "-document-type") +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-document-number", "travelDocs.documentNumber", "Sənəd nömrəsi", true) +
                            '<input class="field-input" id="' + prefix + '-document-number" ' + name("documentNumber") + described(prefix + "-document-number", true) + ' type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" required>' +
                            '<p class="field-hint" id="' + prefix + '-document-number-hint"></p>' + fieldError(prefix + "-document-number") +
                        "</div>" +
                        '<div class="field" id="' + prefix + '-issuing-field">' +
                            fieldLabel(prefix + "-issuing-country", "travelDocs.issuingCountry", "Verən ölkə", true) +
                            '<select class="field-input" id="' + prefix + '-issuing-country" ' + name("issuingCountry") + described(prefix + "-issuing-country") + ' data-doc-trigger="issuing" data-auto="1" required>' +
                                countryOptions("travelDocs.selectCountry", "Ölkəni seçin") +
                            "</select>" + fieldError(prefix + "-issuing-country") +
                        "</div>" +
                        '<div class="field">' +
                            fieldLabel(prefix + "-document-expiry", "travelDocs.expiry", "Sənədin etibarlılıq müddəti", true) +
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
        return String(date.getDate()).padStart(2, "0") + "." + String(date.getMonth() + 1).padStart(2, "0") + "." + date.getFullYear();
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
        }), "travelDocs.selectDocumentType", "Sənəd növünü seçin").replace(/data-i18n="travelDocs\.docTypes\.(\w+)">[^<]*</g, function (match, code) {
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
            ? tr("travelDocs.hints." + definition.code, definition.code === "az_id_card" ? "AA + 7 rəqəm və ya AZE + 8 rəqəm, məsələn {example}" : "6–9 hərf və ya rəqəm, məsələn {example}", { example: definition.numberExample })
            : tr("travelDocs.hints.chooseType", "Əvvəlcə sənəd növünü seçin."));
        if (typeChanged && numberInput.value) clearFieldError(numberInput);

        var limits = minimumExpiryDate(options.minValidityDays);
        getFieldById(prefix + "-document-expiry").min = toISODateLocal(limits.minimum);
        setText(prefix + "-document-expiry-hint", options.minValidityDays
            ? tr("travelDocs.hints.expiryValidity", "{date} tarixindən sonra ən azı {days} gün etibarlı olmalıdır.", { days: options.minValidityDays, date: localizedDate(limits.travel) })
            : tr("travelDocs.hints.expiry", "Son səyahət tarixindən ({date}) sonra da etibarlı olmalıdır.", { date: localizedDate(limits.travel) }));
    }

    function updateRouteNotice() {
        var notice = getFieldById("travel-docs-notice");
        if (!notice || !DOCS || !activeFlightData) return;
        var countries = DOCS.routeCountries(activeFlightData);
        var names = countries.map(function (code) { return tr("travelDocs.countries." + code, DOCS.countryName(code) || "—"); });
        var unique = names.filter(function (value, index) { return names.indexOf(value) === index; });
        var domestic = DOCS.routeType(activeFlightData) === "domestic";
        setText("travel-docs-route", domestic
            ? tr("travelDocs.routeDomestic", "{country} daxilində daxili uçuş", { country: names[0] })
            : tr("travelDocs.routeInternational", "Beynəlxalq uçuş: {countries}", { countries: unique.join(" → ") }));
        notice.setAttribute("data-route-type", domestic ? "domestic" : "international");
        notice.hidden = false;
    }

    function refreshPassengerCardText() {
        document.querySelectorAll(".passenger-card").forEach(function (card) {
            var index = Number(card.getAttribute("data-passenger-index"));
            var declared = card.getAttribute("data-declared-type") || "";
            setText("passenger-" + index + "-title", cardTitle(index, declared));

            var seatLine = card.querySelector(".passenger-seat");
            if (seatLine && declared) {
                seatLine.textContent = declared === "Infant"
                    ? tr("api.passengers.infantLap", "Körpə: böyüyün qucağında uçur, oturacaq lazım deyil.")
                    : seatLineFor(index, card.getAttribute("data-seat"));
            }
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

    var SAVED_GENDERS = { Male: "Male", Female: "Female", Other: "Other", PreferNotToSay: "Göstərmək istəmirəm" };
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
                '<label class="field-label" for="' + id + '">' + escapeHtml(tr("api.passengers.savedLabel", "Saxlanmış sərnişin")) + "</label>" +
                '<select class="field-input" id="' + id + '">' +
                    '<option value="">' + escapeHtml(tr("api.passengers.savedNone", "Məlumatları özüm daxil edəcəyəm")) + "</option>" +
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

    /*
     * The signed-in account's own details (GET api/profile, which answers for the token's account only) start the first adult card
     * filled in, and its phone the contact block. Nothing is stored: the form only starts filled, every field stays editable, and the
     * profile itself changes only on the profile page. Only empty fields are filled, so nothing typed is overwritten. The contact e-mail
     * stays for the traveller to type, since the booking link goes to the address written there. Other passengers are never filled
     * with these details.
     */
    var profileNoteState = "";

    function paintProfileNote() {
        var note = document.getElementById("profile-fill-note");
        if (!note) {
            return;
        }

        var texts = {
            loading: tr("api.passengers.profileLoading", "Profil məlumatlarınız yüklənir..."),
            filled: tr("api.passengers.profileFilled", "Məlumatlarınızı profilinizdən doldurduq. Yoxlayın və bu səfər üçün fərqli olanı dəyişin; profildə olmayan sahələr boş qalır."),
            failed: tr("api.passengers.profileFailed", "Profil məlumatlarınızı yükləmək mümkün olmadı. Formanı özünüz doldurun.")
        };
        note.hidden = !texts[profileNoteState];
        note.setAttribute("data-state", profileNoteState);
        note.textContent = texts[profileNoteState] || "";
    }

    function showProfileNote(state) {
        profileNoteState = state;
        paintProfileNote();
    }

    function fillIfEmpty(id, value) {
        var field = document.getElementById(id);
        if (!field || value == null || value === "" || field.value) {
            return false;
        }

        if (field.tagName === "SELECT" && !Array.prototype.some.call(field.options, function (option) { return option.value === value; })) {
            return false;
        }

        setCardField(id, value);
        return true;
    }

    /* "+994508343943": the longest country code the contact list offers, and the digits after it. */
    function splitPhone(phone) {
        var select = document.getElementById("contact-country-code");
        var text = String(phone || "").replace(/[^0-9+]/g, "");
        if (!select || text.charAt(0) !== "+") {
            return null;
        }

        var codes = Array.prototype.map.call(select.options, function (option) { return option.value; })
            .filter(function (code) { return code && text.indexOf(code) === 0; })
            .sort(function (a, b) { return b.length - a.length; });
        return codes.length ? { code: codes[0], number: text.slice(codes[0].length) } : null;
    }

    function fillFromProfile(profile) {
        // The first adult; when the search did not say who travels, simply the first passenger.
        var cards = Array.prototype.slice.call(document.querySelectorAll(".passenger-card"));
        var undeclared = cards.every(function (item) { return !item.getAttribute("data-declared-type"); });
        var card = cards.filter(function (item) { return item.getAttribute("data-declared-type") === "Adult"; })[0] || (undeclared ? cards[0] : null);

        if (card) {
            var prefix = "passenger-" + card.getAttribute("data-passenger-index") + "-";
            fillIfEmpty(prefix + "title-field", profile.title);
            fillIfEmpty(prefix + "first-name", profile.firstName);
            fillIfEmpty(prefix + "last-name", profile.lastName);
            fillIfEmpty(prefix + "dob", profile.dateOfBirth);
            // The nationality decides which documents are offered, so it is set after the rest of the card exists.
            fillIfEmpty(prefix + "nationality", profile.nationalityCode);
        }

        var phone = splitPhone(profile.phone);
        if (phone && !getTrimmedValue(document.getElementById("contact-phone"))) {
            fillIfEmpty("contact-country-code", phone.code);
            fillIfEmpty("contact-phone", phone.number);
        }
    }

    function loadProfileDetails() {
        var auth = window.AerovaAuth;
        if (!auth || !auth.isLoggedIn() || !window.AEROVA_API) {
            return;
        }

        var signedIn = auth.getCurrentUser ? auth.getCurrentUser() : null;
        showProfileNote("loading");
        window.AEROVA_API.get("api/profile").then(function (profile) {
            // The answer belongs to this tab's sign-in; a profile of any other account is never put in the form.
            if (!profile || (signedIn && signedIn.id && profile.id !== signedIn.id)) {
                showProfileNote("failed");
                return;
            }

            fillFromProfile(profile);
            showProfileNote("filled");
        }).catch(function () {
            showProfileNote("failed");
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
            setText("summary-seats", legSeatsSummary(activeLegSeats));
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
            { key: "title", error: "travelDocs.errors.title", message: "Müraciəti seçin" },
            { key: "firstName", error: "travelDocs.errors.firstName", message: "Adınızı daxil edin" },
            { key: "lastName", error: "travelDocs.errors.lastName", message: "Soyadınızı daxil edin" },
            { key: "dateOfBirth", error: "travelDocs.errors.dob", message: "Doğum tarixinizi daxil edin" },
            { key: "gender", error: "travelDocs.errors.gender", message: "Cinsinizi seçin" },
            { key: "nationality", error: "travelDocs.errors.nationality", message: "Vətəndaşlığınızı seçin" },
            { key: "documentType", error: "travelDocs.errors.documentType", message: "Sənəd növünü seçin" },
            { key: "documentNumber", error: "travelDocs.errors.documentNumber", message: "Sənəd nömrəsini daxil edin" },
            { key: "issuingCountry", error: "travelDocs.errors.issuingCountry", message: "Sənədi verən ölkəni seçin", skip: !issuingVisible },
            { key: "documentExpiry", error: "travelDocs.errors.expiry", message: "Bitmə tarixini daxil edin" }
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
            invalid(fields.dateOfBirth, "travelDocs.errors.dobInvalid", "Keçmişdə olan düzgün doğum tarixi daxil edin");
        }

        // The type chosen in the search must match the date of birth (the server checks it again).
        var wantedType = card ? card.getAttribute("data-declared-type") : "";
        if (wantedType && dateOfBirth && dateOfBirth < today) {
            var typeNow = passengerTypeFor(getTrimmedValue(fields.dateOfBirth));
            if (typeNow && typeNow !== wantedType) {
                invalid(
                    fields.dateOfBirth,
                    "api.passengers.type" + wantedType,
                    wantedType === "Adult"
                        ? "Böyük sərnişin son reysin günündə ({date}) {age} yaşda və ya daha böyük olmalıdır."
                        : (wantedType === "Child"
                            ? "Uşaq son reysin günündə ({date}) {min}–{max} yaşında olmalıdır."
                            : "Körpə son reysin günündə ({date}) {age} yaşdan kiçik olmalıdır."),
                    { age: wantedType === "Adult" ? ADULT_FROM_AGE : INFANT_UNDER_AGE, min: INFANT_UNDER_AGE, max: ADULT_FROM_AGE - 1, date: localizedDate(minimumExpiryDate(0).travel) }
                );
            }
        }

        if (getTrimmedValue(fields.documentType) && (!definition || options.documents.indexOf(definition.code) === -1)) {
            invalid(fields.documentType, "travelDocs.errors.documentTypeNotAllowed", "Bu sənəd növü bu marşrut üçün qəbul edilmir");
        } else if (definition && numberValue && !definition.numberPattern.test(numberValue)) {
            invalid(
                fields.documentNumber,
                "travelDocs.errors.number_" + definition.code,
                definition.code === "az_id_card"
                    ? "Düzgün şəxsiyyət vəsiqəsi nömrəsi daxil edin (AA + 7 rəqəm və ya AZE + 8 rəqəm), məsələn {example}"
                    : "Düzgün pasport nömrəsi daxil edin (6–9 hərf və ya rəqəm), məsələn {example}",
                { example: definition.numberExample }
            );
        }

        if (expiryValue) {
            var limits = minimumExpiryDate(options.minValidityDays);
            if (!expiry) {
                invalid(fields.documentExpiry, "travelDocs.errors.expiry", "Etibarlılıq tarixini daxil edin");
            } else if (expiry < limits.minimum) {
                if (options.minValidityDays) {
                    invalid(fields.documentExpiry, "travelDocs.errors.expiryValidity", "Sənəd {date} tarixindən sonra ən azı {days} gün etibarlı olmalıdır", { days: options.minValidityDays, date: localizedDate(limits.travel) });
                } else {
                    invalid(fields.documentExpiry, "travelDocs.errors.expiryAfterTravel", "Sənəd son səyahət tarixindən ({date}) sonra da etibarlı olmalıdır", { date: localizedDate(limits.travel) });
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
            markInvalid(emailInput, "Düzgün e-poçt ünvanı daxil edin");
            focusField = emailInput;
            isValid = false;
        } else if (!isValidEmail(email)) {
            markInvalid(emailInput, "Düzgün e-poçt ünvanı daxil edin");
            emailInput.value = "";
            focusField = emailInput;
            isValid = false;
        }

        if (!countryCode) {
            markInvalid(countryCodeInput, "Bu sahə mütləqdir");
            if (!focusField) {
                focusField = countryCodeInput;
            }
            isValid = false;
        }

        if (!mobilePhone) {
            markInvalid(phoneInput, "Telefon nömrənizi daxil edin");
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
        // Everyone on the booking, infants included; the price estimate counts the seats (the server prices the booking).
        var passengerCount = passengers.length;
        var unitPrice = Number(flightData.price);
        var totalPrice = isFinite(unitPrice) ? unitPrice * (Number(flightData.passengers) || passengers.length) : 0;

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
            showMessage(tr("passengers.incompleteBooking", "Bron məlumatı natamamdır. Oturacaq seçiminə qayıdın."));
            return;
        }

        var passengers = [];
        var i;
        var passengerResult;
        var contactResult;
        var bookingData;
        var isValid = true;
        var focusField = null;

        for (i = 0; i < activeSelectedSeats.length + declaredInfants(); i += 1) {
            passengerResult = collectPassengerData(i, activeSelectedSeats[i] || "");

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
            showMessage(tr("api.passengers.needAdult", "Ən azı bir sərnişin {age} yaşda və ya daha böyük olmalıdır.", { age: ADULT_FROM_AGE }));
            return;
        }

        if (infants > adults) {
            showMessage(tr("api.passengers.tooManyInfants", "Hər körpəyə bir böyük lazımdır: körpələrin sayı böyüklərdən çox ola bilməz."));
            return;
        }

        bookingData = buildBookingData(passengers, contactResult.contact);

        if (!saveBookingData(bookingData)) {
            showMessage(tr("passengers.saveFail", "Bron detalları yadda saxlanılmadı. Yenidən cəhd edin."));
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

        // A flight of a round trip or a multi-city trip without the other flights cannot be booked on its own.
        var returnWithoutOutbound = !!chosen && !!window.AEROVA_JOURNEY && window.AEROVA_JOURNEY.isIncomplete(chosen, activeLegs);
        var flightData = returnWithoutOutbound ? null : (activeLegs[0] || null);
        var passengerCount = resolvePassengerCount(flightData);
        var selectedSeats = resolveSelectedSeats(flightData);
        var container = document.getElementById("passenger-cards");

        activeFlightData = flightData;
        activeSelectedSeats = selectedSeats.slice();
        activeSelectedSeatIds = resolveSelectedSeatIds(flightData);
        activeLegSeats = activeLegs.map(resolveSelectedSeats);
        activeLegSeatIds = activeLegs.map(resolveSelectedSeatIds);

        populateBookingSummary(flightData, passengerCount + declaredInfants(), selectedSeats);
        bindContinueButton();
        bindClearInvalidOnInput();
        bindDocumentControls();

        if (!flightData) {
            showMessage(returnWithoutOutbound
                ? (window.AEROVA_JOURNEY.isMultiCity(chosen)
                    ? tr("api.journey.legsMissing", "Bu səfərin bəzi reysləri çatışmır. Axtarışı yenidən başladın.")
                    : tr("api.journey.outboundMissing", "Bu gediş-qayıdış səyahətinin gediş reysi tapılmadı. Zəhmət olmasa axtarışa yenidən başlayın."))
                : tr("passengers.noBooking", "Bron tapılmadı. Əvvəlcə uçuş və oturacaq seçin."));
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        if (!passengerCount) {
            showMessage(tr("passengers.missingCount", "Sərnişin sayı yoxdur. Bron səhifəsinə qayıdın."));
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        if (!selectedSeats.length) {
            showMessage(tr("passengers.noSeats", "Oturacaq seçilməyib. Oturacaq seçiminə qayıdın."));
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        if (hasDuplicateSeats(selectedSeats)) {
            showMessage(tr("passengers.duplicateSeats", "Təkrarlanan oturacaqlar tapıldı. Unikal oturacaqlar seçin."));
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
            showMessage(tr("api.passengers.seatDataMissing", "Oturacaq məlumatları yoxdur. Zəhmət olmasa oturacaq seçiminə qayıdın."));
            setFormsVisibility(false);
            if (container) {
                container.innerHTML = "";
            }
            return;
        }

        showMessage("");
        setFormsVisibility(true);
        // Infants get a form too, without a seat.
        var cardSeats = selectedSeats.slice();
        for (var infant = 0; infant < declaredInfants(); infant += 1) {
            cardSeats.push("");
        }
        renderPassengerCards(cardSeats);
        bindInfantRule();
        loadSavedPassengers();
        loadProfileDetails();
        loadPassengerRules();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
