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

        clearValidation();
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

    form.addEventListener("click", function (event) {
        var swap = event.target.closest(".swap-button");
        if (swap && form.contains(swap) && tripType !== "multi-city") {
            swapRouteValues(swap.closest(".route-pair"));
            return;
        }

        var remove = event.target.closest(".segment-remove");
        if (remove && segmentList.contains(remove) && getSegments().length > 2) {
            remove.closest(".flight-segment").remove();
            refreshSegments();
            return;
        }

        var mic = event.target.closest(".mic-button");
        if (mic && form.contains(mic)) {
            startVoiceInput(mic);
        }
    });

    addSegmentButton.addEventListener("click", function () {
        if (getSegments().length >= maxSegments) {
            return;
        }

        var clone = getSegments()[0].cloneNode(true);
        clone.querySelectorAll("input").forEach(function (input) {
            input.value = "";
            input.classList.remove("is-invalid");
        });
        segmentList.appendChild(clone);
        refreshSegments();
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();

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
