(function () {
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
        if (window.innerWidth > 1080) {
            setMenu(false);
        }
    });
})();

(function () {
    var form = document.getElementById("booking-form");
    var multiPanel = document.getElementById("multi-city");
    var segmentList = document.getElementById("segment-list");
    var addSegmentButton = document.getElementById("add-segment");
    var returnField = form ? form.querySelector(".booking-return") : null;
    var departureField = form ? form.querySelector(".booking-departure") : null;
    var routePair = form ? form.querySelector(":scope > .route-pair") : null;
    var message = document.getElementById("booking-message");
    var fromInput = document.getElementById("booking-from");
    var toInput = document.getElementById("booking-to");
    var departureInput = document.getElementById("booking-departure");
    var returnInput = document.getElementById("booking-return");
    var passengersInput = document.getElementById("booking-passengers");
    var cabinInput = document.getElementById("booking-cabin");

    if (
        !form ||
        !multiPanel ||
        !segmentList ||
        !addSegmentButton ||
        !returnField ||
        !departureField ||
        !routePair ||
        !message ||
        !fromInput ||
        !toInput ||
        !departureInput ||
        !returnInput ||
        !passengersInput ||
        !cabinInput
    ) {
        return;
    }

    var tabs = form.querySelectorAll(".booking-tab");
    var maxSegments = 6;
    var tripType = "round-trip";
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var activeRecognition = null;

    var TRIP_PARAM = {
        "round-trip": "roundtrip",
        "one-way": "oneway",
        "multi-city": "multicity"
    };

    function getSegments() {
        return segmentList.querySelectorAll(".flight-segment");
    }

    function clearValidation() {
        message.hidden = true;
        message.textContent = "";
        form.querySelectorAll(".is-invalid").forEach(function (input) {
            input.classList.remove("is-invalid");
        });
    }

    function showMessage(text) {
        message.textContent = text;
        message.hidden = !text;
    }

    function markInvalid(input) {
        if (input) {
            input.classList.add("is-invalid");
        }
    }

    function setTrip(type) {
        tripType = type;
        form.classList.toggle("is-round-trip", type === "round-trip");
        form.classList.toggle("is-one-way", type === "one-way");
        form.classList.toggle("is-multi-city", type === "multi-city");

        tabs.forEach(function (tab) {
            var active = tab.getAttribute("data-trip") === type;
            tab.classList.toggle("is-active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
        });

        var isMulti = type === "multi-city";
        var isRoundTrip = type === "round-trip";

        routePair.hidden = isMulti;
        departureField.hidden = isMulti;
        returnField.hidden = !isRoundTrip;
        multiPanel.hidden = !isMulti;

        departureInput.disabled = isMulti;
        returnInput.disabled = !isRoundTrip;

        if (typeof hideCitySuggestions === "function") {
            hideCitySuggestions();
        }

        clearValidation();

        document.dispatchEvent(new CustomEvent("aerova:tripTypeChange", {
            detail: { tripType: type }
        }));
    }

    function refreshSegments() {
        var items = getSegments();

        items.forEach(function (segment, index) {
            var number = index + 1;
            var fromField = segment.querySelector(".from-input");
            var toField = segment.querySelector(".to-input");
            var dateField = segment.querySelector(".segment-date");
            var fromMic = segment.querySelector('[data-voice="from"]');
            var toMic = segment.querySelector('[data-voice="to"]');
            var removeButton = segment.querySelector(".segment-remove");

            segment.querySelector(".segment-name").textContent = "Flight " + number;
            fromField.setAttribute("aria-label", "Flight " + number + " from");
            toField.setAttribute("aria-label", "Flight " + number + " to");
            dateField.setAttribute("aria-label", "Flight " + number + " departure date");
            fromMic.setAttribute("aria-label", "Voice input for flight " + number + " departure");
            toMic.setAttribute("aria-label", "Voice input for flight " + number + " destination");
            removeButton.hidden = items.length < 3;
        });

        addSegmentButton.hidden = items.length >= maxSegments;
    }

    function swapRouteValues(pair) {
        if (!pair) {
            return;
        }

        var fromField = pair.querySelector(".from-input");
        var toField = pair.querySelector(".to-input");
        if (!fromField || !toField) {
            return;
        }

        var fromValue = fromField.value;
        fromField.value = toField.value;
        toField.value = fromValue;
    }

    function stopVoice() {
        if (activeRecognition) {
            activeRecognition.onresult = null;
            activeRecognition.onerror = null;
            activeRecognition.onend = null;

            try {
                activeRecognition.stop();
            } catch (error) {
                // Recognition may already be stopped.
            }

            activeRecognition = null;
        }

        form.querySelectorAll(".mic-button.is-listening").forEach(function (button) {
            button.classList.remove("is-listening");
        });
    }

    function startVoiceInput(button) {
        if (!SpeechRecognition) {
            showMessage("Voice search is not supported in this browser. Please type your city.");
            return;
        }

        var control = button.closest(".field-control");
        var input = control ? control.querySelector(".field-input") : null;
        if (!input) {
            return;
        }

        if (button.classList.contains("is-listening")) {
            stopVoice();
            return;
        }

        stopVoice();
        clearValidation();

        var recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        activeRecognition = recognition;
        button.classList.add("is-listening");

        recognition.onresult = function (event) {
            var transcript = event.results[0] && event.results[0][0]
                ? event.results[0][0].transcript
                : "";

            if (transcript) {
                input.value = transcript.trim();
                input.classList.remove("is-invalid");
            }
        };

        recognition.onerror = function () {
            showMessage("Unable to capture voice input. Please try again.");
        };

        recognition.onend = function () {
            button.classList.remove("is-listening");
            if (activeRecognition === recognition) {
                activeRecognition = null;
            }
        };

        try {
            recognition.start();
        } catch (error) {
            button.classList.remove("is-listening");
            activeRecognition = null;
            showMessage("Unable to start voice search. Please try again.");
        }
    }

    function validateSharedOptions() {
        if (!passengersInput.value) {
            markInvalid(passengersInput);
            showMessage("Please select the number of passengers.");
            passengersInput.focus();
            return false;
        }

        if (!cabinInput.value) {
            markInvalid(cabinInput);
            showMessage("Please select a cabin class.");
            cabinInput.focus();
            return false;
        }

        return true;
    }

    function collectMultiCitySegments() {
        return Array.prototype.map.call(getSegments(), function (segment) {
            return {
                from: segment.querySelector(".from-input").value.trim(),
                to: segment.querySelector(".to-input").value.trim(),
                departureDate: segment.querySelector(".segment-date").value.trim()
            };
        });
    }

    function validateMultiCity() {
        var items = getSegments();
        var firstInvalid = null;

        for (var i = 0; i < items.length; i += 1) {
            var segment = items[i];
            var from = segment.querySelector(".from-input");
            var to = segment.querySelector(".to-input");
            var date = segment.querySelector(".segment-date");
            var fromValue = from.value.trim();
            var toValue = to.value.trim();
            var dateValue = date.value.trim();

            from.value = fromValue;
            to.value = toValue;

            if (!fromValue) {
                markInvalid(from);
                if (!firstInvalid) {
                    firstInvalid = from;
                }
            }

            if (!toValue) {
                markInvalid(to);
                if (!firstInvalid) {
                    firstInvalid = to;
                }
            }

            if (!dateValue) {
                markInvalid(date);
                if (!firstInvalid) {
                    firstInvalid = date;
                }
            }
        }

        if (firstInvalid) {
            showMessage("Please complete From, To and Departure Date for every flight.");
            firstInvalid.focus();
            return null;
        }

        if (!validateSharedOptions()) {
            return null;
        }

        return {
            tripType: "multicity",
            passengers: passengersInput.value,
            cabinClass: cabinInput.value,
            segments: collectMultiCitySegments()
        };
    }

    function validateSimpleTrip() {
        var fromValue = fromInput.value.trim();
        var toValue = toInput.value.trim();
        var departureValue = departureInput.value.trim();
        var returnValue = returnInput.value.trim();

        fromInput.value = fromValue;
        toInput.value = toValue;

        if (!fromValue) {
            markInvalid(fromInput);
            showMessage("Please enter a departure city or airport.");
            fromInput.focus();
            return null;
        }

        if (!toValue) {
            markInvalid(toInput);
            showMessage("Please enter a destination city or airport.");
            toInput.focus();
            return null;
        }

        if (!departureValue) {
            markInvalid(departureInput);
            showMessage("Please select a departure date.");
            departureInput.focus();
            return null;
        }

        if (tripType === "round-trip" && !returnValue) {
            markInvalid(returnInput);
            showMessage("Please select a return date.");
            returnInput.focus();
            return null;
        }

        if (tripType === "round-trip" && returnValue && returnValue < departureValue) {
            markInvalid(returnInput);
            showMessage("Return date must be on or after the departure date.");
            returnInput.focus();
            return null;
        }

        if (!validateSharedOptions()) {
            return null;
        }

        var data = {
            tripType: TRIP_PARAM[tripType],
            from: fromValue,
            to: toValue,
            departureDate: departureValue,
            passengers: passengersInput.value,
            cabinClass: cabinInput.value
        };

        if (tripType === "round-trip") {
            data.returnDate = returnValue;
        }

        return data;
    }

    function validate() {
        clearValidation();
        stopVoice();

        if (tripType === "multi-city") {
            return validateMultiCity();
        }

        return validateSimpleTrip();
    }

    function buildResultsUrl(data) {
        var params = new URLSearchParams();
        params.set("tripType", data.tripType);
        params.set("passengers", data.passengers);
        params.set("cabinClass", data.cabinClass);

        if (data.tripType === "multicity") {
            params.set("segments", String(data.segments.length));

            data.segments.forEach(function (segment, index) {
                var number = index + 1;
                params.set("from" + number, segment.from);
                params.set("to" + number, segment.to);
                params.set("departureDate" + number, segment.departureDate);
            });

            params.set("segmentsJson", JSON.stringify(data.segments));
        } else {
            params.set("from", data.from);
            params.set("to", data.to);
            params.set("departureDate", data.departureDate);

            if (data.returnDate) {
                params.set("returnDate", data.returnDate);
            }
        }

        return "flight-results.html?" + params.toString();
    }

    function navigateToResults(data) {
        var resultsUrl = buildResultsUrl(data);

        window.aerovaBookingSearch = data;
        window.aerovaBookingResultsUrl = resultsUrl;

        try {
            sessionStorage.setItem("aerovaBookingSearch", JSON.stringify(data));
            sessionStorage.setItem("aerovaBookingResultsUrl", resultsUrl);
        } catch (error) {
            // Storage may be unavailable; in-memory values remain ready.
        }

        window.location.href = resultsUrl;
    }

    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            setTrip(tab.getAttribute("data-trip"));
        });
    });

    var CITY_SUGGESTIONS = [
        "Baku",
        "London",
        "Paris",
        "Istanbul",
        "Dubai",
        "Berlin",
        "Barcelona",
        "Rome",
        "Milan",
        "New York",
        "Tokyo",
        "Singapore"
    ];

    var activeSuggestionInput = null;

    function isCityInput(element) {
        return element &&
            (element.classList.contains("from-input") || element.classList.contains("to-input"));
    }

    function getSuggestionsList(input) {
        var control = input.closest(".field-control");
        if (!control) {
            return null;
        }

        var list = control.querySelector(".city-suggestions");
        if (!list) {
            list = document.createElement("ul");
            list.className = "city-suggestions";
            list.hidden = true;
            list.setAttribute("role", "listbox");
            control.appendChild(list);
        }

        return list;
    }

    function hideCitySuggestions(input) {
        if (input) {
            var list = input.closest(".field-control");
            list = list ? list.querySelector(".city-suggestions") : null;
            if (list) {
                list.hidden = true;
                list.innerHTML = "";
            }

            if (activeSuggestionInput === input) {
                activeSuggestionInput = null;
            }

            return;
        }

        form.querySelectorAll(".city-suggestions").forEach(function (suggestions) {
            suggestions.hidden = true;
            suggestions.innerHTML = "";
        });
        activeSuggestionInput = null;
    }

    function filterCities(query) {
        var normalized = String(query || "").trim().toLowerCase();
        if (!normalized) {
            return [];
        }

        return CITY_SUGGESTIONS.filter(function (city) {
            return city.toLowerCase().indexOf(normalized) === 0;
        });
    }

    function renderCitySuggestions(input, cities) {
        var list = getSuggestionsList(input);
        if (!list) {
            return;
        }

        list.innerHTML = "";

        if (!cities.length) {
            list.hidden = true;
            activeSuggestionInput = null;
            return;
        }

        cities.forEach(function (city) {
            var item = document.createElement("li");
            var button = document.createElement("button");
            button.type = "button";
            button.className = "city-suggestion";
            button.setAttribute("role", "option");
            button.textContent = city;
            item.appendChild(button);
            list.appendChild(item);
        });

        list.hidden = false;
        activeSuggestionInput = input;
    }

    function showCitySuggestions(input) {
        if (!isCityInput(input)) {
            return;
        }

        hideCitySuggestions();
        renderCitySuggestions(input, filterCities(input.value));
    }

    function selectCitySuggestion(input, city) {
        input.value = city;
        input.classList.remove("is-invalid");
        hideCitySuggestions(input);
        input.focus();
    }

    form.addEventListener("mousedown", function (event) {
        var suggestion = event.target.closest(".city-suggestion");
        if (suggestion && form.contains(suggestion)) {
            event.preventDefault();
        }
    });

    form.addEventListener("click", function (event) {
        var suggestion = event.target.closest(".city-suggestion");
        if (suggestion && form.contains(suggestion)) {
            var suggestionInput = suggestion.closest(".field-control");
            suggestionInput = suggestionInput ? suggestionInput.querySelector(".from-input, .to-input") : null;
            if (suggestionInput) {
                selectCitySuggestion(suggestionInput, suggestion.textContent);
            }
            return;
        }

        var swap = event.target.closest(".swap-button");
        if (swap && form.contains(swap) && tripType !== "multi-city") {
            hideCitySuggestions();
            swapRouteValues(swap.closest(".route-pair"));
            return;
        }

        var remove = event.target.closest(".segment-remove");
        if (remove && segmentList.contains(remove) && getSegments().length > 2) {
            hideCitySuggestions();
            remove.closest(".flight-segment").remove();
            refreshSegments();
            return;
        }

        var mic = event.target.closest(".mic-button");
        if (mic && form.contains(mic)) {
            hideCitySuggestions();
            startVoiceInput(mic);
        }
    });

    form.addEventListener("input", function (event) {
        if (isCityInput(event.target)) {
            showCitySuggestions(event.target);
        }
    });

    form.addEventListener("focusin", function (event) {
        if (isCityInput(event.target) && event.target.value.trim()) {
            showCitySuggestions(event.target);
        }
    });

    document.addEventListener("click", function (event) {
        if (!event.target.closest(".field-control")) {
            hideCitySuggestions();
        }
    });

    form.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            hideCitySuggestions();
        }
    });

    addSegmentButton.addEventListener("click", function () {
        if (getSegments().length >= maxSegments) {
            return;
        }

        hideCitySuggestions();

        var clone = getSegments()[0].cloneNode(true);
        clone.querySelectorAll("input").forEach(function (input) {
            input.value = "";
            input.classList.remove("is-invalid");
        });
        clone.querySelectorAll(".city-suggestions").forEach(function (list) {
            list.remove();
        });
        segmentList.appendChild(clone);
        refreshSegments();
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        hideCitySuggestions();

        var data = validate();
        if (!data) {
            return;
        }

        navigateToResults(data);
    });

    function applyDestinationFromQuery() {
        var params = new URLSearchParams(window.location.search);
        var destination = params.get("to");

        if (!destination) {
            return;
        }

        toInput.value = destination.trim();
        toInput.classList.remove("is-invalid");
    }

    refreshSegments();
    setTrip("round-trip");
    applyDestinationFromQuery();
})();

(function () {
    var STORAGE_KEY = "aerovaPriceCalendar";
    var CALENDAR_CITIES = [
        "Baku",
        "London",
        "Paris",
        "Istanbul",
        "Dubai",
        "Berlin",
        "Barcelona",
        "Rome",
        "Milan",
        "New York",
        "Tokyo",
        "Singapore"
    ];

    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var calendarSection = document.getElementById("price-calendar");
    var calendarBody = document.getElementById("price-calendar-body");
    var calendarToggle = document.getElementById("price-calendar-toggle");
    var calendarFrom = document.getElementById("calendar-from");
    var calendarTo = document.getElementById("calendar-to");
    var calendarGrid = document.getElementById("price-calendar-grid");
    var monthLabel = document.getElementById("calendar-month-label");
    var prevMonthButton = document.getElementById("calendar-prev-month");
    var nextMonthButton = document.getElementById("calendar-next-month");
    var calendarNote = document.getElementById("price-calendar-note");
    var calendarSubtitle = document.getElementById("price-calendar-subtitle");
    var modePanel = document.getElementById("price-calendar-mode");
    var modeDepartureButton = document.getElementById("calendar-mode-departure");
    var modeReturnButton = document.getElementById("calendar-mode-return");
    var summaryReturnBlock = document.getElementById("summary-return-block");
    var summaryDepartureRoute = document.getElementById("summary-departure-route");
    var summaryDepartureDate = document.getElementById("summary-departure-date");
    var summaryDeparturePrice = document.getElementById("summary-departure-price");
    var summaryReturnRoute = document.getElementById("summary-return-route");
    var summaryReturnDate = document.getElementById("summary-return-date");
    var summaryReturnPrice = document.getElementById("summary-return-price");
    var summaryTotalPrice = document.getElementById("summary-total-price");
    var bookingForm = document.getElementById("booking-form");
    var bookingFrom = document.getElementById("booking-from");
    var bookingTo = document.getElementById("booking-to");
    var bookingDeparture = document.getElementById("booking-departure");
    var bookingReturn = document.getElementById("booking-return");

    if (
        !calendarSection ||
        !calendarBody ||
        !calendarToggle ||
        !calendarFrom ||
        !calendarTo ||
        !calendarGrid ||
        !monthLabel ||
        !prevMonthButton ||
        !nextMonthButton ||
        !modePanel ||
        !modeDepartureButton ||
        !modeReturnButton ||
        !summaryReturnBlock ||
        !summaryDepartureRoute ||
        !summaryDepartureDate ||
        !summaryDeparturePrice ||
        !summaryReturnRoute ||
        !summaryReturnDate ||
        !summaryReturnPrice ||
        !summaryTotalPrice ||
        !bookingFrom ||
        !bookingTo ||
        !bookingDeparture ||
        !bookingReturn
    ) {
        return;
    }

    var viewDate = new Date(2026, 9, 1);
    var selectionMode = "departure";
    var tripType = "round-trip";
    var departureDate = bookingDeparture.value || "";
    var departurePrice = null;
    var returnDate = bookingReturn.value || "";
    var returnPrice = null;
    var syncing = false;

    function pad(value) {
        return String(value).length < 2 ? "0" + value : String(value);
    }

    function toISODate(date) {
        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
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

        if (!year || !month || !day) {
            return null;
        }

        return new Date(year, month - 1, day);
    }

    function formatDisplayDate(isoValue) {
        var date = parseISODate(isoValue);
        if (!date) {
            return "Select a date";
        }

        return date.getDate() + " " + MONTH_NAMES[date.getMonth()] + " " + date.getFullYear();
    }

    function normalizeCity(value) {
        return String(value || "").trim().toLowerCase();
    }

    function findCityMatch(value) {
        var normalized = normalizeCity(value);
        if (!normalized) {
            return "";
        }

        for (var i = 0; i < CALENDAR_CITIES.length; i += 1) {
            if (normalizeCity(CALENDAR_CITIES[i]) === normalized) {
                return CALENDAR_CITIES[i];
            }
        }

        for (var j = 0; j < CALENDAR_CITIES.length; j += 1) {
            if (normalizeCity(CALENDAR_CITIES[j]).indexOf(normalized) === 0) {
                return CALENDAR_CITIES[j];
            }
        }

        return "";
    }

    function hashString(value) {
        var hash = 0;
        var text = String(value || "");
        for (var i = 0; i < text.length; i += 1) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    function getBaseFareForRoute(fromCity, toCity) {
        var routeKey = normalizeCity(fromCity) + "|" + normalizeCity(toCity);
        var bases = {
            "baku|london": 420,
            "baku|paris": 390,
            "baku|dubai": 245,
            "baku|istanbul": 200,
            "london|baku": 440,
            "paris|baku": 405,
            "dubai|baku": 260,
            "istanbul|baku": 215
        };

        if (bases[routeKey]) {
            return bases[routeKey];
        }

        return 320 + (hashString(routeKey) % 180);
    }

    function getDayFare(fromCity, toCity, date) {
        if (!fromCity || !toCity || normalizeCity(fromCity) === normalizeCity(toCity)) {
            return null;
        }

        var day = date.getDate();
        var weekday = date.getDay();
        var seed = hashString(normalizeCity(fromCity) + "|" + normalizeCity(toCity) + "|" + toISODate(date));

        if (seed % 11 === 0 || (weekday === 2 && seed % 5 === 0)) {
            return null;
        }

        var base = getBaseFareForRoute(fromCity, toCity);
        var wave = Math.round(Math.sin((day / 31) * Math.PI * 2) * 35);
        var weekendLift = (weekday === 5 || weekday === 0) ? 45 : 0;
        var midweekDip = (weekday === 2 || weekday === 3) ? -30 : 0;
        var jitter = (seed % 70) - 25;

        if (normalizeCity(fromCity) === "baku" && normalizeCity(toCity) === "london" && date.getFullYear() === 2026 && date.getMonth() === 9) {
            var octoberOutbound = {
                10: 420,
                11: 395,
                12: 450,
                13: 380,
                14: 510
            };
            if (octoberOutbound[day] != null) {
                return octoberOutbound[day];
            }
        }

        if (normalizeCity(fromCity) === "london" && normalizeCity(toCity) === "baku" && date.getFullYear() === 2026 && date.getMonth() === 9) {
            var octoberReturn = {
                18: 390,
                19: 405,
                20: 370,
                21: 420,
                22: 455
            };
            if (octoberReturn[day] != null) {
                return octoberReturn[day];
            }
        }

        var fare = base + wave + weekendLift + midweekDip + jitter;
        return Math.max(165, Math.round(fare / 5) * 5);
    }

    function formatFare(amount) {
        if (amount == null || isNaN(amount)) {
            return "—";
        }
        return "$" + amount;
    }

    function getOutboundCities() {
        return {
            from: calendarFrom.value,
            to: calendarTo.value
        };
    }

    function getActiveRouteCities() {
        var outbound = getOutboundCities();
        if (selectionMode === "return") {
            return {
                from: outbound.to,
                to: outbound.from
            };
        }
        return outbound;
    }

    function resolveFareForIso(fromCity, toCity, isoValue) {
        var date = parseISODate(isoValue);
        if (!date) {
            return null;
        }
        return getDayFare(fromCity, toCity, date);
    }

    function populateCitySelects() {
        var options = CALENDAR_CITIES.map(function (city) {
            return '<option value="' + city + '">' + city + "</option>";
        }).join("");

        calendarFrom.innerHTML = options;
        calendarTo.innerHTML = options;
    }

    function syncSelectsFromBooking() {
        var fromMatch = findCityMatch(bookingFrom.value) || "Baku";
        var toMatch = findCityMatch(bookingTo.value) || "London";

        if (fromMatch === toMatch) {
            toMatch = fromMatch === "London" ? "Paris" : "London";
        }

        syncing = true;
        calendarFrom.value = fromMatch;
        calendarTo.value = toMatch;
        syncing = false;
    }

    function syncBookingFromCalendar() {
        if (syncing) {
            return;
        }

        syncing = true;
        if (calendarFrom.value) {
            bookingFrom.value = calendarFrom.value;
            bookingFrom.classList.remove("is-invalid");
        }
        if (calendarTo.value) {
            bookingTo.value = calendarTo.value;
            bookingTo.classList.remove("is-invalid");
        }
        syncing = false;
    }

    function persistSelection() {
        var outbound = getOutboundCities();
        var payload = {
            tripType: tripType,
            selectionMode: selectionMode,
            from: outbound.from,
            to: outbound.to,
            departureDate: departureDate || "",
            departurePrice: departurePrice,
            returnDate: tripType === "round-trip" ? (returnDate || "") : "",
            returnPrice: tripType === "round-trip" ? returnPrice : null
        };

        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
            // Storage may be unavailable.
        }
    }

    function restoreSelection() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return;
            }

            var saved = JSON.parse(raw);
            if (!saved || typeof saved !== "object") {
                return;
            }

            if (saved.departureDate) {
                departureDate = saved.departureDate;
                bookingDeparture.value = saved.departureDate;
            }
            if (saved.departurePrice != null) {
                departurePrice = Number(saved.departurePrice);
            }
            if (saved.returnDate && tripType === "round-trip") {
                returnDate = saved.returnDate;
                bookingReturn.value = saved.returnDate;
            }
            if (saved.returnPrice != null && tripType === "round-trip") {
                returnPrice = Number(saved.returnPrice);
            }
            if (saved.selectionMode === "return" || saved.selectionMode === "departure") {
                selectionMode = saved.selectionMode;
            }
        } catch (error) {
            // Ignore invalid stored data.
        }
    }

    function clearReturnSelection() {
        returnDate = "";
        returnPrice = null;
        if (!syncing) {
            syncing = true;
            bookingReturn.value = "";
            syncing = false;
        }
    }

    function ensureReturnStillValid() {
        if (!returnDate || !departureDate) {
            return;
        }

        if (returnDate < departureDate) {
            clearReturnSelection();
        }
    }

    function refreshDeparturePrice() {
        if (!departureDate) {
            departurePrice = null;
            return;
        }

        var outbound = getOutboundCities();
        departurePrice = resolveFareForIso(outbound.from, outbound.to, departureDate);
    }

    function refreshReturnPrice() {
        if (!returnDate || tripType !== "round-trip") {
            returnPrice = null;
            return;
        }

        var outbound = getOutboundCities();
        returnPrice = resolveFareForIso(outbound.to, outbound.from, returnDate);
    }

    function setSelectionMode(mode) {
        if (mode !== "departure" && mode !== "return") {
            return;
        }

        if (mode === "return" && tripType !== "round-trip") {
            mode = "departure";
        }

        selectionMode = mode;
        modeDepartureButton.classList.toggle("is-active", selectionMode === "departure");
        modeReturnButton.classList.toggle("is-active", selectionMode === "return");
        modeDepartureButton.setAttribute("aria-selected", selectionMode === "departure" ? "true" : "false");
        modeReturnButton.setAttribute("aria-selected", selectionMode === "return" ? "true" : "false");

        var focusDate = selectionMode === "return" ? returnDate : departureDate;
        var parsed = parseISODate(focusDate);
        if (parsed) {
            viewDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
        }

        persistSelection();
        renderCalendar();
    }

    function applyTripType(type) {
        tripType = type || "round-trip";
        var isMulti = tripType === "multi-city";
        var isRoundTrip = tripType === "round-trip";

        calendarSection.hidden = isMulti;
        modePanel.hidden = !isRoundTrip;
        summaryReturnBlock.hidden = !isRoundTrip;

        if (!isRoundTrip) {
            selectionMode = "departure";
            clearReturnSelection();
        } else if (!departureDate) {
            selectionMode = "departure";
        }

        modeDepartureButton.classList.toggle("is-active", selectionMode === "departure");
        modeReturnButton.classList.toggle("is-active", selectionMode === "return");
        modeDepartureButton.setAttribute("aria-selected", selectionMode === "departure" ? "true" : "false");
        modeReturnButton.setAttribute("aria-selected", selectionMode === "return" ? "true" : "false");

        ensureReturnStillValid();
        refreshDeparturePrice();
        refreshReturnPrice();
        persistSelection();
        renderCalendar();
    }

    function updateMonthLabel() {
        monthLabel.textContent = MONTH_NAMES[viewDate.getMonth()] + " " + viewDate.getFullYear();
    }

    function updateCopy() {
        var outbound = getOutboundCities();
        var routeLabel = outbound.from + " → " + outbound.to;
        var returnRouteLabel = outbound.to + " → " + outbound.from;

        if (calendarSubtitle) {
            if (tripType === "round-trip") {
                if (selectionMode === "return") {
                    calendarSubtitle.textContent = "Return fares for " + returnRouteLabel + ". Choose a return date on or after your departure.";
                } else {
                    calendarSubtitle.textContent = "Departure fares for " + routeLabel + ". After you pick a departure date, select your return.";
                }
            } else {
                calendarSubtitle.textContent = "One-way starting fares for " + routeLabel + ". Click a date to set your departure date.";
            }
        }

        if (!calendarNote) {
            return;
        }

        if (selectionMode === "return") {
            if (returnDate && returnPrice != null) {
                calendarNote.textContent = "Selected return " + returnDate + " from " + formatFare(returnPrice) + ".";
            } else if (!departureDate) {
                calendarNote.textContent = "Select a departure date first, then choose your return.";
            } else {
                calendarNote.textContent = "Showing return fares for " + returnRouteLabel + ". Click a date to set your return date.";
            }
            return;
        }

        if (departureDate && departurePrice != null) {
            calendarNote.textContent = "Selected departure " + departureDate + " from " + formatFare(departurePrice) + ".";
            return;
        }

        calendarNote.textContent = "Click a date to set your departure date.";
    }

    function updateSummary() {
        var outbound = getOutboundCities();

        summaryDepartureRoute.textContent = outbound.from + " → " + outbound.to;
        summaryDepartureDate.textContent = departureDate ? formatDisplayDate(departureDate) : "Select a date";
        summaryDeparturePrice.textContent = formatFare(departurePrice);

        if (tripType === "round-trip") {
            summaryReturnBlock.hidden = false;
            summaryReturnRoute.textContent = outbound.to + " → " + outbound.from;
            summaryReturnDate.textContent = returnDate ? formatDisplayDate(returnDate) : "Select a date";
            summaryReturnPrice.textContent = formatFare(returnPrice);

            if (departurePrice != null && returnPrice != null) {
                summaryTotalPrice.textContent = formatFare(departurePrice + returnPrice);
            } else {
                summaryTotalPrice.textContent = "—";
            }
            return;
        }

        summaryReturnBlock.hidden = true;
        summaryTotalPrice.textContent = formatFare(departurePrice);
    }

    function renderCalendar() {
        var year = viewDate.getFullYear();
        var month = viewDate.getMonth();
        var firstDay = new Date(year, month, 1);
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var startOffset = (firstDay.getDay() + 6) % 7;
        var route = getActiveRouteCities();
        var activeSelected = selectionMode === "return" ? returnDate : departureDate;
        var html = "";
        var day;

        for (var i = 0; i < startOffset; i += 1) {
            html += '<button class="price-calendar-day is-outside" type="button" tabindex="-1" disabled aria-hidden="true"></button>';
        }

        for (day = 1; day <= daysInMonth; day += 1) {
            var date = new Date(year, month, day);
            var iso = toISODate(date);
            var fare = getDayFare(route.from, route.to, date);
            var beforeDeparture = selectionMode === "return" && departureDate && iso < departureDate;
            var unavailable = fare == null || beforeDeparture;
            var classes = ["price-calendar-day"];
            var label = "Date " + iso;

            if (unavailable) {
                classes.push("is-unavailable");
                label += beforeDeparture ? ", before departure" : ", no flights";
            } else {
                label += selectionMode === "return"
                    ? ", return fare from " + formatFare(fare)
                    : ", departure fare from " + formatFare(fare);
            }

            if (activeSelected && iso === activeSelected) {
                classes.push("is-selected");
                label += ", selected";
            }

            html +=
                '<button class="' + classes.join(" ") + '" type="button"' +
                    ' data-date="' + iso + '"' +
                    (unavailable ? " disabled" : "") +
                    ' aria-label="' + label + '"' +
                ">" +
                    '<span class="price-calendar-day-number">' + day + "</span>" +
                    '<span class="price-calendar-day-price">' +
                        (unavailable ? "—" : formatFare(fare)) +
                    "</span>" +
                "</button>";
        }

        calendarGrid.innerHTML = html;
        updateMonthLabel();
        updateCopy();
        updateSummary();
    }

    function selectDepartureDate(isoDate) {
        var outbound = getOutboundCities();
        var fare = resolveFareForIso(outbound.from, outbound.to, isoDate);
        if (fare == null) {
            return;
        }

        departureDate = isoDate;
        departurePrice = fare;
        bookingDeparture.value = isoDate;
        bookingDeparture.classList.remove("is-invalid");
        syncBookingFromCalendar();
        ensureReturnStillValid();
        refreshReturnPrice();

        if (tripType === "round-trip") {
            selectionMode = "return";
            modeDepartureButton.classList.remove("is-active");
            modeReturnButton.classList.add("is-active");
            modeDepartureButton.setAttribute("aria-selected", "false");
            modeReturnButton.setAttribute("aria-selected", "true");

            var parsed = parseISODate(returnDate || departureDate);
            if (parsed) {
                viewDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
            }
        }

        persistSelection();
        renderCalendar();
    }

    function selectReturnDate(isoDate) {
        if (!departureDate || isoDate < departureDate) {
            return;
        }

        var outbound = getOutboundCities();
        var fare = resolveFareForIso(outbound.to, outbound.from, isoDate);
        if (fare == null) {
            return;
        }

        returnDate = isoDate;
        returnPrice = fare;
        bookingReturn.value = isoDate;
        bookingReturn.classList.remove("is-invalid");
        syncBookingFromCalendar();
        persistSelection();
        renderCalendar();
    }

    function selectDate(isoDate) {
        if (selectionMode === "return") {
            selectReturnDate(isoDate);
            return;
        }
        selectDepartureDate(isoDate);
    }

    function shiftMonth(delta) {
        viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
        renderCalendar();
    }

    function firstOtherCity(currentCity) {
        for (var i = 0; i < CALENDAR_CITIES.length; i += 1) {
            if (CALENDAR_CITIES[i] !== currentCity) {
                return CALENDAR_CITIES[i];
            }
        }
        return "";
    }

    function handleRouteChange() {
        syncBookingFromCalendar();
        refreshDeparturePrice();
        ensureReturnStillValid();
        refreshReturnPrice();
        persistSelection();
        renderCalendar();
    }

    function detectInitialTripType() {
        if (bookingForm) {
            if (bookingForm.classList.contains("is-one-way")) {
                return "one-way";
            }
            if (bookingForm.classList.contains("is-multi-city")) {
                return "multi-city";
            }
        }
        return "round-trip";
    }

    function bindCalendar() {
        calendarToggle.addEventListener("click", function () {
            var collapsed = calendarSection.classList.toggle("is-collapsed");
            calendarToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
        });

        modeDepartureButton.addEventListener("click", function () {
            setSelectionMode("departure");
        });

        modeReturnButton.addEventListener("click", function () {
            if (!departureDate) {
                setSelectionMode("departure");
                if (calendarNote) {
                    calendarNote.textContent = "Select a departure date first, then choose your return.";
                }
                return;
            }
            setSelectionMode("return");
        });

        calendarFrom.addEventListener("change", function () {
            if (calendarFrom.value === calendarTo.value) {
                calendarTo.value = firstOtherCity(calendarFrom.value);
            }
            handleRouteChange();
        });

        calendarTo.addEventListener("change", function () {
            if (calendarTo.value === calendarFrom.value) {
                calendarFrom.value = firstOtherCity(calendarTo.value);
            }
            handleRouteChange();
        });

        prevMonthButton.addEventListener("click", function () {
            shiftMonth(-1);
        });

        nextMonthButton.addEventListener("click", function () {
            shiftMonth(1);
        });

        calendarGrid.addEventListener("click", function (event) {
            var button = event.target.closest(".price-calendar-day");
            if (!button || button.disabled || button.classList.contains("is-outside")) {
                return;
            }

            var isoDate = button.getAttribute("data-date");
            if (isoDate) {
                selectDate(isoDate);
            }
        });

        function onBookingCityEdit() {
            if (syncing) {
                return;
            }
            syncSelectsFromBooking();
            handleRouteChange();
        }

        bookingFrom.addEventListener("change", onBookingCityEdit);
        bookingTo.addEventListener("change", onBookingCityEdit);
        bookingFrom.addEventListener("blur", onBookingCityEdit);
        bookingTo.addEventListener("blur", onBookingCityEdit);

        bookingDeparture.addEventListener("change", function () {
            if (syncing) {
                return;
            }

            departureDate = bookingDeparture.value || "";
            refreshDeparturePrice();
            ensureReturnStillValid();
            refreshReturnPrice();

            var parsed = parseISODate(departureDate);
            if (parsed) {
                viewDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
            }

            persistSelection();
            renderCalendar();
        });

        bookingReturn.addEventListener("change", function () {
            if (syncing) {
                return;
            }

            var nextReturn = bookingReturn.value || "";
            if (nextReturn && departureDate && nextReturn < departureDate) {
                clearReturnSelection();
                persistSelection();
                renderCalendar();
                return;
            }

            returnDate = nextReturn;
            refreshReturnPrice();
            persistSelection();
            renderCalendar();
        });

        document.addEventListener("aerova:tripTypeChange", function (event) {
            var nextType = event && event.detail ? event.detail.tripType : "round-trip";
            applyTripType(nextType);
        });
    }

    function initCalendar() {
        populateCitySelects();
        tripType = detectInitialTripType();
        restoreSelection();

        if (!departureDate && bookingDeparture.value) {
            departureDate = bookingDeparture.value;
        }
        if (!returnDate && bookingReturn.value && tripType === "round-trip") {
            returnDate = bookingReturn.value;
        }

        var focusDate = parseISODate(selectionMode === "return" && returnDate ? returnDate : departureDate);
        if (focusDate) {
            viewDate = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
        } else {
            viewDate = new Date(2026, 9, 1);
        }

        syncSelectsFromBooking();

        if (!bookingFrom.value) {
            bookingFrom.value = calendarFrom.value;
        }
        if (!bookingTo.value) {
            bookingTo.value = calendarTo.value;
        }

        refreshDeparturePrice();
        ensureReturnStillValid();
        refreshReturnPrice();

        if (window.innerWidth <= 720) {
            calendarSection.classList.add("is-collapsed");
            calendarToggle.setAttribute("aria-expanded", "false");
        }

        bindCalendar();
        applyTripType(tripType);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCalendar);
    } else {
        initCalendar();
    }
})();
