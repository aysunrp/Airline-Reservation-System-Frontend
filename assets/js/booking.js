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
    var addSegment = document.getElementById("add-segment");
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

    if (!form || !multiPanel || !segmentList || !addSegment || !returnField || !departureField || !routePair || !message) {
        return;
    }

    var tabs = form.querySelectorAll(".booking-tab");
    var maxSegments = 6;
    var tripType = "round-trip";
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var activeRecognition = null;

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

        routePair.hidden = type === "multi-city";
        departureField.hidden = type === "multi-city";
        returnField.hidden = type !== "round-trip";
        multiPanel.hidden = type !== "multi-city";
        clearValidation();
    }

    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            setTrip(tab.getAttribute("data-trip"));
        });
    });

    function segments() {
        return segmentList.querySelectorAll(".flight-segment");
    }

    function refreshSegments() {
        var items = segments();
        items.forEach(function (segment, index) {
            var number = index + 1;
            segment.querySelector(".segment-name").textContent = "Flight " + number;
            segment.querySelector(".from-input").setAttribute("aria-label", "Flight " + number + " from");
            segment.querySelector(".to-input").setAttribute("aria-label", "Flight " + number + " to");
            segment.querySelector(".segment-date").setAttribute("aria-label", "Flight " + number + " departure");
            segment.querySelector('[data-voice="from"]').setAttribute("aria-label", "Voice input for flight " + number + " departure");
            segment.querySelector('[data-voice="to"]').setAttribute("aria-label", "Voice input for flight " + number + " destination");
            segment.querySelector(".segment-remove").hidden = items.length < 3;
        });
        addSegment.hidden = items.length >= maxSegments;
    }

    form.addEventListener("click", function (event) {
        var swap = event.target.closest(".swap-button");
        if (swap && form.contains(swap) && tripType !== "multi-city") {
            var pair = swap.closest(".route-pair");
            var fromField = pair.querySelector(".from-input");
            var toField = pair.querySelector(".to-input");
            var fromValue = fromField.value;
            fromField.value = toField.value;
            toField.value = fromValue;
            return;
        }

        var remove = event.target.closest(".segment-remove");
        if (remove && segmentList.contains(remove) && segments().length > 2) {
            remove.closest(".flight-segment").remove();
            refreshSegments();
            return;
        }

        var mic = event.target.closest(".mic-button");
        if (mic && form.contains(mic)) {
            startVoiceInput(mic);
        }
    });

    addSegment.addEventListener("click", function () {
        if (segments().length >= maxSegments) {
            return;
        }

        var clone = segments()[0].cloneNode(true);
        clone.querySelectorAll("input").forEach(function (input) {
            input.value = "";
            input.classList.remove("is-invalid");
        });
        segmentList.appendChild(clone);
        refreshSegments();
    });

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

    function validate() {
        clearValidation();

        if (tripType === "multi-city") {
            var invalidSegment = null;
            var items = segments();

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

                if (!fromValue || !toValue || !dateValue) {
                    if (!fromValue) {
                        markInvalid(from);
                    }
                    if (!toValue) {
                        markInvalid(to);
                    }
                    if (!dateValue) {
                        markInvalid(date);
                    }
                    if (!invalidSegment) {
                        invalidSegment = fromValue ? (toValue ? date : to) : from;
                    }
                }
            }

            if (invalidSegment) {
                showMessage("Please complete From, To and Departure Date for every flight.");
                invalidSegment.focus();
                return null;
            }

            return {
                trip: "multi-city",
                passengers: passengersInput.value,
                cabin: cabinInput.value,
                segments: Array.prototype.map.call(items, function (segment) {
                    return {
                        from: segment.querySelector(".from-input").value.trim(),
                        to: segment.querySelector(".to-input").value.trim(),
                        departure: segment.querySelector(".segment-date").value
                    };
                })
            };
        }

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

        return {
            trip: tripType,
            from: fromValue,
            to: toValue,
            departure: departureValue,
            return: tripType === "round-trip" ? returnValue : "",
            passengers: passengersInput.value,
            cabin: cabinInput.value
        };
    }

    function buildResultsUrl(data) {
        var params = new URLSearchParams();
        params.set("trip", data.trip);
        params.set("passengers", data.passengers);
        params.set("cabin", data.cabin);

        if (data.trip === "multi-city") {
            data.segments.forEach(function (segment, index) {
                var number = index + 1;
                params.set("from" + number, segment.from);
                params.set("to" + number, segment.to);
                params.set("departure" + number, segment.departure);
            });
            params.set("segments", String(data.segments.length));
        } else {
            params.set("from", data.from);
            params.set("to", data.to);
            params.set("departure", data.departure);
            if (data.return) {
                params.set("return", data.return);
            }
        }

        return "flight-results.html?" + params.toString();
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        var data = validate();
        if (!data) {
            return;
        }

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
    });

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
            showMessage("Voice search is not supported in this browser.");
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
            var transcript = event.results[0] && event.results[0][0] ? event.results[0][0].transcript : "";
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

    refreshSegments();
})();
