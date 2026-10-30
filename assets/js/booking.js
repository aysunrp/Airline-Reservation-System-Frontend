function tr(key, fallback, vars) {
    if (typeof window.t === "function") {
        var value = window.t(key, vars);
        if (value && value !== key) return value;
    }
    return typeof vars === "object" && vars
        ? String(fallback).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? String(vars[k]) : "{" + k + "}"; })
        : fallback;
}

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
        toggle.setAttribute("aria-label", open ? tr("nav.closeMenu", "Close menu") : tr("nav.openMenu", "Open menu"));
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

            segment.querySelector(".segment-name").textContent = tr("booking.flightN", "Flight " + number, { n: number });
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

        // The chosen airports swap with their country and code, not just the text.
        window.AEROVA_PICKER.swap(fromField, toField);
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
            showMessage(tr("booking.voiceUnsupported", "Voice search is not supported in this browser. Please type your city."));
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
                if (window.AEROVA_PICKER && (input.classList.contains("from-input") || input.classList.contains("to-input"))) {
                    window.AEROVA_PICKER.set(input, input.value);
                }
            }
        };

        recognition.onerror = function () {
            showMessage(tr("booking.voiceCaptureFail", "Unable to capture voice input. Please try again."));
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
            showMessage(tr("booking.voiceStartFail", "Unable to start voice search. Please try again."));
        }
    }

    /*
     * Who travels: adults, children and infants. The server works the type out from each date of birth, so these numbers decide
     * how many seats are asked for (adults + children; an infant sits on an adult's lap) and how many forms the passenger page
     * shows. The limits are the server's own (GET api/booking-options/passenger-rules); until they arrive the defaults apply.
     */
    var passengerRules = { infantMaxAgeYears: 2, childMaxAgeYears: 12, maxPassengers: 9 };
    var passengerMix = { adults: 1, children: 0, infants: 0 };
    var mixTrigger = document.getElementById("booking-passengers-trigger");
    var mixPanel = document.getElementById("passenger-panel");

    function mixTotal() {
        return passengerMix.adults + passengerMix.children + passengerMix.infants;
    }

    function canChangeMix(kind, step) {
        if (step < 0) {
            // Fewer adults must still leave one adult for every infant.
            return kind === "adults" ? passengerMix.adults > 1 && passengerMix.adults > passengerMix.infants : passengerMix[kind] > 0;
        }

        if (mixTotal() >= passengerRules.maxPassengers) {
            return false;
        }

        return kind === "infants" ? passengerMix.infants < passengerMix.adults : true;
    }

    function clampMix() {
        passengerMix.adults = Math.max(1, passengerMix.adults);
        passengerMix.infants = Math.min(passengerMix.infants, passengerMix.adults);

        while (mixTotal() > passengerRules.maxPassengers) {
            if (passengerMix.infants > 0) {
                passengerMix.infants -= 1;
            } else if (passengerMix.children > 0) {
                passengerMix.children -= 1;
            } else {
                passengerMix.adults -= 1;
            }
        }
    }

    function renderMix() {
        var kinds = ["adults", "children", "infants"];
        var labels = {
            adults: tr("api.passengers.adults", "Adults"),
            children: tr("api.passengers.children", "Children"),
            infants: tr("api.passengers.infants", "Infants")
        };

        kinds.forEach(function (kind) {
            document.getElementById("passenger-count-" + kind).textContent = String(passengerMix[kind]);
            document.getElementById("passenger-title-" + kind).textContent = labels[kind];
            Array.prototype.forEach.call(mixPanel.querySelectorAll('[data-kind="' + kind + '"]'), function (button) {
                var step = Number(button.getAttribute("data-step"));
                button.disabled = !canChangeMix(kind, step);
                button.setAttribute("aria-label", tr(step < 0 ? "api.passengers.fewer" : "api.passengers.more", step < 0 ? "Fewer {kind}" : "More {kind}", { kind: labels[kind].toLowerCase() }));
            });
        });

        document.getElementById("passenger-hint-adults").textContent = tr("api.passengers.adultsHint", "{age} years and older", { age: passengerRules.childMaxAgeYears });
        document.getElementById("passenger-hint-children").textContent = tr("api.passengers.childrenHint", "{min} to {max} years", { min: passengerRules.infantMaxAgeYears, max: passengerRules.childMaxAgeYears - 1 });
        document.getElementById("passenger-hint-infants").textContent = tr("api.passengers.infantsHint", "Under {age}, on an adult's lap", { age: passengerRules.infantMaxAgeYears });
        document.getElementById("passenger-done").textContent = tr("api.passengers.done", "Done");

        var note = tr("api.passengers.limitNote", "Up to {max} travellers on one booking.", { max: passengerRules.maxPassengers });
        if (passengerMix.infants > 0 && passengerMix.infants >= passengerMix.adults) {
            note += " " + tr("api.passengers.infantsLimit", "Each infant travels on an adult's lap, so there cannot be more infants than adults.");
        }
        document.getElementById("passenger-note").textContent = note;

        document.getElementById("passenger-summary").textContent = kinds
            .filter(function (kind) { return kind === "adults" || passengerMix[kind] > 0; })
            .map(function (kind) { return labels[kind] + " " + passengerMix[kind]; })
            .join(" \u00b7 ");

        // The search asks for seats only for those who need one.
        passengersInput.value = String(passengerMix.adults + passengerMix.children);
    }

    /* The price calendar hides days whose flights have fewer free seats than the travellers need, so it follows the seat count. */
    var lastSeatCount = 1;

    function seatCount() {
        return Math.max(1, parseInt(passengersInput.value, 10) || 1);
    }

    function refreshFaresForTravellers() {
        if (seatCount() === lastSeatCount) {
            return;
        }

        lastSeatCount = seatCount();
        document.dispatchEvent(new CustomEvent("aerova:travellersChanged"));
    }

    function setMixOpen(open) {
        mixPanel.hidden = !open;
        mixTrigger.setAttribute("aria-expanded", open ? "true" : "false");
    }

    mixTrigger.addEventListener("click", function () {
        setMixOpen(mixPanel.hidden);
    });

    mixPanel.addEventListener("click", function (event) {
        var button = event.target.closest(".passenger-step");
        if (!button || button.disabled) {
            return;
        }

        var kind = button.getAttribute("data-kind");
        var step = Number(button.getAttribute("data-step"));
        if (canChangeMix(kind, step)) {
            passengerMix[kind] += step;
            clampMix();
            renderMix();
            refreshFaresForTravellers();
        }
    });

    document.getElementById("passenger-done").addEventListener("click", function () {
        setMixOpen(false);
        mixTrigger.focus();
    });

    document.addEventListener("click", function (event) {
        if (!mixPanel.hidden && !event.target.closest("#passenger-picker")) {
            setMixOpen(false);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !mixPanel.hidden) {
            setMixOpen(false);
            mixTrigger.focus();
        }
    });

    window.addEventListener("aerova:languagechange", renderMix);
    renderMix();

    if (window.AEROVA_API && typeof window.AEROVA_API.get === "function") {
        window.AEROVA_API.get("api/booking-options/passenger-rules").then(function (rules) {
            if (rules && rules.infantMaxAgeYears > 0 && rules.childMaxAgeYears > rules.infantMaxAgeYears && rules.maxPassengers >= 1) {
                passengerRules = rules;
                clampMix();
                renderMix();
                refreshFaresForTravellers();
            }
        }).catch(function () {
            // The defaults are the server's usual limits; the server checks every booking anyway.
        });
    }

    function validateSharedOptions() {
        if (!passengersInput.value) {
            markInvalid(passengersInput);
            showMessage(tr("booking.needPassengers", "Please select the number of passengers."));
            passengersInput.focus();
            return false;
        }

        if (!cabinInput.value) {
            markInvalid(cabinInput);
            showMessage(tr("booking.needCabin", "Please select a cabin class."));
            cabinInput.focus();
            return false;
        }

        return true;
    }

    function collectMultiCitySegments() {
        return Array.prototype.map.call(getSegments(), function (segment) {
            var from = window.AEROVA_PICKER.selection(segment.querySelector(".from-input"));
            var to = window.AEROVA_PICKER.selection(segment.querySelector(".to-input"));
            return {
                from: from ? from.airport.city : segment.querySelector(".from-input").value.trim(),
                to: to ? to.airport.city : segment.querySelector(".to-input").value.trim(),
                fromCode: from ? from.airport.code : "",
                toCode: to ? to.airport.code : "",
                fromAirportId: from ? from.airport.id : null,
                toAirportId: to ? to.airport.id : null,
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

            var fromChoice = window.AEROVA_PICKER.selection(from);
            var toChoice = window.AEROVA_PICKER.selection(to);
            if (fromValue && !fromChoice) { markInvalid(from); firstInvalid = firstInvalid || from; }
            if (toValue && !toChoice) { markInvalid(to); firstInvalid = firstInvalid || to; }
            if (fromChoice && toChoice && fromChoice.airport.code === toChoice.airport.code) {
                markInvalid(to);
                firstInvalid = firstInvalid || to;
                showMessage(tr("booking.sameCity", "The departure and the destination are the same. Please choose two different cities."));
                to.focus();
                return null;
            }
        }

        if (firstInvalid) {
            showMessage(tr("booking.completeMulti", "Please complete From, To and Departure Date for every flight."));
            firstInvalid.focus();
            return null;
        }

        // Each flight is on the same day as the one before it or later.
        for (var next = 1; next < items.length; next += 1) {
            var previousDate = items[next - 1].querySelector(".segment-date").value.trim();
            var thisDate = items[next].querySelector(".segment-date");

            if (thisDate.value.trim() < previousDate) {
                markInvalid(thisDate);
                showMessage(tr("api.journey.multiDates", "Each flight must be on or after the date of the flight before it."));
                thisDate.focus();
                return null;
            }
        }

        if (!validateSharedOptions()) {
            return null;
        }

        return {
            tripType: "multicity",
            passengers: passengersInput.value,
            adults: String(passengerMix.adults),
            children: String(passengerMix.children),
            infants: String(passengerMix.infants),
            cabinClass: cabinInput.value,
            segments: collectMultiCitySegments()
        };
    }

    function openPriceCalendar(mode) {
        document.dispatchEvent(new CustomEvent("aerova:openPriceCalendar", {
            detail: { mode: mode || "departure" }
        }));
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
            showMessage(tr("booking.needFrom", "Please enter a departure city or airport."));
            fromInput.focus();
            return null;
        }

        if (!toValue) {
            markInvalid(toInput);
            showMessage(tr("booking.needTo", "Please enter a destination city or airport."));
            toInput.focus();
            return null;
        }

        // Each side must be an airport of the catalog (picked from the list, or text that is exactly one): its country and code come from there.
        var fromChoice = window.AEROVA_PICKER.selection(fromInput);
        var toChoice = window.AEROVA_PICKER.selection(toInput);

        if (!fromChoice) {
            markInvalid(fromInput);
            showMessage(tr("picker.chooseFromList", "Please choose the departure from the list."));
            fromInput.focus();
            return null;
        }

        if (!toChoice) {
            markInvalid(toInput);
            showMessage(tr("picker.chooseFromList", "Please choose the destination from the list."));
            toInput.focus();
            return null;
        }

        if (fromChoice.airport.code === toChoice.airport.code) {
            markInvalid(toInput);
            showMessage(tr("booking.sameCity", "The departure and the destination are the same. Please choose two different cities."));
            toInput.focus();
            return null;
        }

        if (!departureValue) {
            markInvalid(departureInput);
            showMessage(tr("booking.needDeparture", "Please select a departure date."));
            openPriceCalendar("departure");
            return null;
        }

        if (tripType === "round-trip" && !returnValue) {
            markInvalid(returnInput);
            showMessage(tr("booking.needReturn", "Please select a return date."));
            openPriceCalendar("return");
            return null;
        }

        if (tripType === "round-trip" && returnValue && returnValue < departureValue) {
            markInvalid(returnInput);
            showMessage(tr("booking.returnAfter", "Return date must be on or after the departure date."));
            openPriceCalendar("return");
            return null;
        }

        if (!validateSharedOptions()) {
            return null;
        }

        var data = {
            tripType: TRIP_PARAM[tripType],
            from: fromChoice.airport.city,
            to: toChoice.airport.city,
            fromCode: fromChoice.airport.code,
            toCode: toChoice.airport.code,
            fromAirportId: fromChoice.airport.id,
            toAirportId: toChoice.airport.id,
            departureDate: departureValue,
            passengers: passengersInput.value,
            adults: String(passengerMix.adults),
            children: String(passengerMix.children),
            infants: String(passengerMix.infants),
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
        params.set("adults", data.adults);
        params.set("children", data.children);
        params.set("infants", data.infants);
        params.set("cabinClass", data.cabinClass);

        if (data.tripType === "multicity") {
            params.set("segments", String(data.segments.length));

            data.segments.forEach(function (segment, index) {
                var number = index + 1;
                params.set("from" + number, segment.from);
                params.set("to" + number, segment.to);
                if (segment.fromCode) params.set("fromCode" + number, segment.fromCode);
                if (segment.toCode) params.set("toCode" + number, segment.toCode);
                params.set("departureDate" + number, segment.departureDate);
            });

            params.set("segmentsJson", JSON.stringify(data.segments));
        } else {
            params.set("from", data.from);
            params.set("to", data.to);
            // The airports themselves: the results search by these codes (and keep the database ids), not by the text.
            if (data.fromCode) params.set("fromCode", data.fromCode);
            if (data.toCode) params.set("toCode", data.toCode);
            if (data.fromAirportId) params.set("fromAirportId", String(data.fromAirportId));
            if (data.toAirportId) params.set("toAirportId", String(data.toAirportId));
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

    /* The departure and destination fields are the airport picker (assets/js/airport-picker.js): every choice is an airport of the backend catalog. */
    window.AEROVA_PICKER.bind(form);

    function hideCitySuggestions() {
        window.AEROVA_PICKER.close();
    }

    form.addEventListener("click", function (event) {
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
        clone.querySelectorAll(".airport-meta").forEach(function (meta) {
            meta.remove();
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

        if (data.tripType === "multicity" || !data.fromCode || !data.toCode) {
            navigateToResults(data);
            return;
        }

        // A route must exist between the two airports before a booking is started; if it cannot be checked the results page says what is there.
        window.AEROVA_PICKER.checkRoute(data.fromCode, data.toCode).then(function (exists) {
            if (exists === false) {
                markInvalid(toInput);
                showMessage(tr("picker.noRoute", "There are no scheduled flights between {from} and {to} yet.", { from: data.from, to: data.to }));
                return;
            }
            navigateToResults(data);
        });
    });

    /* A link may name the destination (and the departure): booking.html?to=London&toCode=LHR. The airport comes from the catalog; the departure
       starts as AEROVA's home base (Baku, GYD) unless the link or the traveller chose another. Nothing is searched until the traveller presses search. */
    function applyPrefill() {
        var params = new URLSearchParams(window.location.search);
        var picker = window.AEROVA_PICKER;
        var wantedFrom = params.get("fromCode") || params.get("from");
        var wantedTo = params.get("toCode") || params.get("to");

        picker.load().then(function () {
            if (wantedTo) {
                return picker.set(toInput, wantedTo.trim());
            }
        }).then(function () {
            if (wantedFrom) {
                return picker.set(fromInput, wantedFrom.trim());
            }
            if (!fromInput.value.trim()) {
                return picker.hub().then(function (hub) { if (hub) return picker.set(fromInput, hub); });
            }
        });
    }

    refreshSegments();
    setTrip("round-trip");
    applyPrefill();
})();

(function () {
    var STORAGE_KEY = "aerovaPriceCalendar";
    /* Cities with an airport, from the backend; the calendar needs them before it can show anything. */
    var CALENDAR_CITIES = [];
    var calendarAirports = [];

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

    var viewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
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

    function translatedMonth(index) {
        var key = "common.months." + String(index + 1);
        var value = tr(key, MONTH_NAMES[index]);
        return value && value !== key ? value : MONTH_NAMES[index];
    }

    function formatDisplayDate(isoValue) {
        var date = parseISODate(isoValue);
        if (!date) {
            return tr("booking.selectADate", "Select a date");
        }

        return date.getDate() + " " + translatedMonth(date.getMonth()) + " " + date.getFullYear();
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

    /*
     * Lowest fares come from GET api/flights/lowest-fares, one request per route and month, kept here once they arrived.
     * A day without a flight has no entry; a month that is still loading or failed shows no prices (and says so below the grid).
     */
    var fareMonths = {};

    /* Seats the travellers need (adults + children), as the passenger picker keeps them; lowest fares only count flights with that many free seats. */
    function seatCount() {
        var input = document.getElementById("booking-passengers");
        return Math.max(1, parseInt(input && input.value, 10) || 1);
    }

    function monthKey(fromCity, toCity, year, month) {
        return normalizeCity(fromCity) + "|" + normalizeCity(toCity) + "|" + year + "-" + pad(month + 1) + "|" + seatCount();
    }

    function cityCode(city) {
        var airport = window.AEROVA_AIRPORTS.find(calendarAirports, city);
        return airport ? airport.code : "";
    }

    function loadFareMonth(fromCity, toCity, year, month, onDone) {
        var key = monthKey(fromCity, toCity, year, month);
        var entry = fareMonths[key];

        // A month that failed stays failed until the traveller asks again; retrying on every repaint would never stop.
        if (entry) {
            return entry;
        }

        var originCode = cityCode(fromCity);
        var destinationCode = cityCode(toCity);
        entry = fareMonths[key] = { status: "loading", days: {}, from: fromCity, to: toCity, year: year, month: month };

        if (!originCode || !destinationCode) {
            entry.status = "ready";
            return entry;
        }

        var first = new Date(year, month, 1);
        var last = new Date(year, month + 1, 0);
        var query = "api/flights/lowest-fares?originCode=" + encodeURIComponent(originCode) +
            "&destinationCode=" + encodeURIComponent(destinationCode) +
            "&from=" + toISODate(first) + "&to=" + toISODate(last) + "&passengers=" + seatCount();

        window.AEROVA_API.get(query).then(function (days) {
            (days || []).forEach(function (day) {
                entry.days[day.date] = Number(day.lowestFare);
            });
            entry.status = "ready";
        }).catch(function (error) {
            entry.status = "error";
            entry.message = error && error.userMessage ? error.userMessage : tr("api.errors.generic", "Something went wrong. Please try again.");
        }).then(function () {
            refreshDeparturePrice();
            refreshReturnPrice();
            renderCalendar();
            if (onDone) onDone(entry);
        });

        return entry;
    }

    function getDayFare(fromCity, toCity, date) {
        if (!fromCity || !toCity || normalizeCity(fromCity) === normalizeCity(toCity)) {
            return null;
        }

        var entry = loadFareMonth(fromCity, toCity, date.getFullYear(), date.getMonth());
        var fare = entry.days[toISODate(date)];
        return fare == null ? null : fare;
    }

    function retryFareMonth(fromCity, toCity, year, month) {
        delete fareMonths[monthKey(fromCity, toCity, year, month)];
        renderCalendar();
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
        syncing = true;
        bookingReturn.value = "";
        syncing = false;
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
        var isOneWay = tripType === "one-way";

        calendarSection.hidden = isMulti;
        modePanel.hidden = isMulti;
        modeReturnButton.hidden = !isRoundTrip;
        summaryReturnBlock.hidden = !isRoundTrip;

        if (isOneWay || isMulti) {
            selectionMode = "departure";
            clearReturnSelection();
        } else if (!departureDate) {
            selectionMode = "departure";
        } else if (!returnDate) {
            selectionMode = "return";
        }

        modeDepartureButton.classList.toggle("is-active", selectionMode === "departure");
        modeReturnButton.classList.toggle("is-active", selectionMode === "return");
        modeDepartureButton.setAttribute("aria-selected", selectionMode === "departure" ? "true" : "false");
        modeReturnButton.setAttribute("aria-selected", selectionMode === "return" ? "true" : "false");

        ensureReturnStillValid();
        refreshDeparturePrice();
        refreshReturnPrice();
        syncFormDateFields();
        persistSelection();
        renderCalendar();
    }

    function syncFormDateFields() {
        syncing = true;
        bookingDeparture.value = departureDate || "";
        bookingReturn.value = tripType === "round-trip" ? (returnDate || "") : "";
        syncing = false;
    }

    function openCalendar(mode) {
        if (calendarSection.hidden) {
            return;
        }

        calendarSection.classList.remove("is-collapsed");
        calendarToggle.setAttribute("aria-expanded", "true");

        if (mode === "return" && tripType === "round-trip") {
            if (!departureDate) {
                setSelectionMode("departure");
            } else {
                setSelectionMode("return");
            }
        } else {
            setSelectionMode("departure");
        }

        try {
            calendarSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (error) {
            calendarSection.scrollIntoView(true);
        }
    }

    function updateMonthLabel() {
        monthLabel.textContent = translatedMonth(viewDate.getMonth()) + " " + viewDate.getFullYear();
    }

    function updateCopy() {
        var outbound = getOutboundCities();
        var routeLabel = outbound.from + " → " + outbound.to;
        var returnRouteLabel = outbound.to + " → " + outbound.from;

        if (calendarSubtitle) {
            if (tripType === "round-trip") {
                if (selectionMode === "return") {
                    calendarSubtitle.textContent = tr("booking.returnFares", "Return fares for " + returnRouteLabel + ". Choose a return date on or after your departure.", { route: returnRouteLabel });
                } else {
                    calendarSubtitle.textContent = tr("booking.depFaresRound", "Departure fares for " + routeLabel + ". After you pick a departure date, select your return.", { route: routeLabel });
                }
            } else {
                calendarSubtitle.textContent = tr("booking.oneWayFares", "One-way starting fares for " + routeLabel + ". Click a date to set your departure date.", { route: routeLabel });
            }
        }

        if (!calendarNote) {
            return;
        }

        if (selectionMode === "return") {
            if (returnDate && returnPrice != null) {
                calendarNote.textContent = tr("booking.selectedReturn", "Selected return " + returnDate + " from " + formatFare(returnPrice) + ".", { date: returnDate, price: formatFare(returnPrice) });
            } else if (!departureDate) {
                calendarNote.textContent = tr("booking.selectDepFirst", "Select a departure date first, then choose your return.");
            } else {
                calendarNote.textContent = tr("booking.showReturnFares", "Showing return fares for " + returnRouteLabel + ". Click a date to set your return date.", { route: returnRouteLabel });
            }
            return;
        }

        if (departureDate && departurePrice != null) {
            calendarNote.textContent = tr("booking.selectedDep", "Selected departure " + departureDate + " from " + formatFare(departurePrice) + ".", { date: departureDate, price: formatFare(departurePrice) });
            return;
        }

        calendarNote.textContent = tr("booking.clickDeparture", "Click a date to set your departure date.");
    }

    function updateSummary() {
        var outbound = getOutboundCities();
        var emptyDeparture = tr("booking.selectDeparture", "Select a departure date");
        var emptyReturn = tr("booking.selectReturn", "Select a return date");

        summaryDepartureRoute.textContent = (outbound.from && outbound.to)
            ? outbound.from + " → " + outbound.to
            : "—";
        summaryDepartureDate.textContent = departureDate ? formatDisplayDate(departureDate) : emptyDeparture;
        summaryDeparturePrice.textContent = formatFare(departurePrice);

        if (tripType === "round-trip") {
            summaryReturnBlock.hidden = false;
            summaryReturnRoute.textContent = (outbound.from && outbound.to)
                ? outbound.to + " → " + outbound.from
                : "—";
            summaryReturnDate.textContent = returnDate ? formatDisplayDate(returnDate) : emptyReturn;
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
            var isDeparture = departureDate && iso === departureDate;
            var isReturn = tripType === "round-trip" && returnDate && iso === returnDate;
            var inRange = tripType === "round-trip" && departureDate && returnDate && iso > departureDate && iso < returnDate;

            if (unavailable) {
                classes.push("is-unavailable");
                label += beforeDeparture ? ", before departure" : ", no flights";
            } else {
                label += selectionMode === "return"
                    ? ", return fare from " + formatFare(fare)
                    : ", departure fare from " + formatFare(fare);
            }

            if (inRange) {
                classes.push("is-in-range");
            }

            if (isDeparture) {
                classes.push("is-selected", "is-range-start");
                label += ", departure selected";
            }

            if (isReturn) {
                classes.push("is-selected", "is-range-end");
                label += ", return selected";
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
        showFareStatus(route, year, month);
        updateSummary();
        syncFormDateFields();
    }

    function showFareStatus(route, year, month) {
        if (!calendarNote || !route.from || !route.to) {
            return;
        }

        var entry = fareMonths[monthKey(route.from, route.to, year, month)];
        if (!entry || entry.status === "ready") {
            return;
        }

        if (entry.status === "loading") {
            calendarNote.textContent = tr("api.calendar.loading", "Loading fares...");
            return;
        }

        calendarNote.innerHTML = "";
        calendarNote.appendChild(document.createTextNode(entry.message + " "));
        var retry = document.createElement("button");
        retry.type = "button";
        retry.className = "price-calendar-retry";
        retry.textContent = tr("api.options.retry", "Try again");
        retry.addEventListener("click", function () {
            retryFareMonth(route.from, route.to, year, month);
        });
        calendarNote.appendChild(retry);
    }

    function selectDepartureDate(isoDate) {
        var outbound = getOutboundCities();
        var fare = resolveFareForIso(outbound.from, outbound.to, isoDate);
        if (fare == null) {
            return;
        }

        departureDate = isoDate;
        departurePrice = fare;
        syncing = true;
        bookingDeparture.value = isoDate;
        bookingDeparture.classList.remove("is-invalid");
        syncing = false;
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
        syncing = true;
        bookingReturn.value = isoDate;
        bookingReturn.classList.remove("is-invalid");
        syncing = false;
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
                    calendarNote.textContent = tr("booking.selectDepFirst", "Select a departure date first, then choose your return.");
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

        function bindCalendarDrivenField(input, mode) {
            if (!input) {
                return;
            }

            input.setAttribute("readonly", "readonly");
            input.classList.add("is-calendar-driven");

            input.addEventListener("mousedown", function (event) {
                event.preventDefault();
                openCalendar(mode);
            });

            input.addEventListener("click", function (event) {
                event.preventDefault();
                openCalendar(mode);
            });

            input.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                    event.preventDefault();
                    openCalendar(mode);
                }
            });
        }

        bindCalendarDrivenField(bookingDeparture, "departure");
        bindCalendarDrivenField(bookingReturn, "return");

        document.addEventListener("aerova:tripTypeChange", function (event) {
            var nextType = event && event.detail ? event.detail.tripType : "round-trip";
            applyTripType(nextType);
        });

        document.addEventListener("aerova:travellersChanged", function () {
            refreshDeparturePrice();
            refreshReturnPrice();
            renderCalendar();
        });

        document.addEventListener("aerova:openPriceCalendar", function (event) {
            var mode = event && event.detail ? event.detail.mode : "departure";
            openCalendar(mode);
        });
    }

    function startCalendar() {
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
            viewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
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

    function initCalendar() {
        window.AEROVA_AIRPORTS.load().then(function (list) {
            calendarAirports = list;
            var seen = {};
            CALENDAR_CITIES = list.map(function (airport) { return airport.city; }).filter(function (city) {
                if (seen[city]) return false;
                seen[city] = true;
                return true;
            });
            startCalendar();
        }).catch(function (error) {
            if (calendarNote) {
                calendarNote.innerHTML = "";
                calendarNote.appendChild(document.createTextNode((error && error.userMessage ? error.userMessage : tr("api.errors.generic", "Something went wrong. Please try again.")) + " "));
                var retry = document.createElement("button");
                retry.type = "button";
                retry.className = "price-calendar-retry";
                retry.textContent = tr("api.options.retry", "Try again");
                retry.addEventListener("click", initCalendar);
                calendarNote.appendChild(retry);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCalendar);
    } else {
        initCalendar();
    }

    window.addEventListener("aerova:languagechange", function () {
        if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);
        try {
            if (typeof renderCalendar === "function") renderCalendar();
        } catch (e) {}
    });
})();
