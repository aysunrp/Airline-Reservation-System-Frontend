(function () {
    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return fallback;
    }

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
        toggle.setAttribute("aria-label", open ? (typeof t === "function" ? t("nav.closeMenu") : "Close menu") : (typeof t === "function" ? t("nav.openMenu") : "Open menu"));
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
    var form = document.getElementById("voice-quick-search");
    var input = document.getElementById("voice-search-input");
    var micButton = document.getElementById("voice-mic-button");
    var status = document.getElementById("voice-search-status");
    var message = document.getElementById("voice-search-message");

    if (!form || !input || !micButton) {
        return;
    }

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var activeRecognition = null;

    var MONTHS = {
        january: 1, jan: 1,
        february: 2, feb: 2,
        march: 3, mar: 3,
        april: 4, apr: 4,
        may: 5,
        june: 6, jun: 6,
        july: 7, jul: 7,
        august: 8, aug: 8,
        september: 9, sep: 9, sept: 9,
        october: 10, oct: 10,
        november: 11, nov: 11,
        december: 12, dec: 12
    };

    var KNOWN_CITIES = [
        "abu dhabi", "new york", "los angeles", "hong kong", "san francisco",
        "cape town", "kuala lumpur", "tel aviv", "rio de janeiro", "las vegas",
        "dubai", "london", "paris", "istanbul", "baku", "nakhchivan", "maldives", "male",
        "tokyo", "singapore", "doha", "moscow", "berlin", "rome", "madrid",
        "barcelona", "amsterdam", "vienna", "zurich", "geneva", "milan",
        "munich", "frankfurt", "beijing", "shanghai", "seoul", "bangkok",
        "mumbai", "delhi", "cairo", "riyadh", "jeddah", "kuwait", "manama",
        "muscat", "tehran", "athens", "lisbon", "prague", "budapest",
        "warsaw", "stockholm", "oslo", "copenhagen", "helsinki", "dublin",
        "edinburgh", "manchester", "birmingham", "toronto", "montreal",
        "vancouver", "chicago", "miami", "boston", "washington", "seattle",
        "sydney", "melbourne", "auckland", "johannesburg", "sharjah", "antalya"
    ].sort(function (a, b) {
        return b.length - a.length;
    });

    function pad(value) {
        return String(value).padStart(2, "0");
    }

    function toIsoDate(year, month, day) {
        var date = new Date(Date.UTC(year, month - 1, day));
        if (
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month - 1 ||
            date.getUTCDate() !== day
        ) {
            return "";
        }

        return year + "-" + pad(month) + "-" + pad(day);
    }

    function titleCaseCity(value) {
        return value
            .trim()
            .replace(/\s+/g, " ")
            .split(" ")
            .map(function (word) {
                if (!word) {
                    return word;
                }

                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(" ");
    }

    function cleanCity(value) {
        return titleCaseCity(
            String(value || "")
                .replace(/[.,;!?]+$/g, "")
                .replace(/\b(for|on|with|and|the|a|an)\b/gi, " ")
                .replace(/\s+/g, " ")
                .trim()
        );
    }

    function extractPassengers(text) {
        var match = text.match(/\b(\d{1,2})\s*(?:passengers?|people|persons?|travelers?|travellers?)\b/i);
        if (match) {
            return {
                value: Number(match[1]),
                match: match[0]
            };
        }

        match = text.match(/\bfor\s+(\d{1,2})\b/i);
        if (match) {
            return {
                value: Number(match[1]),
                match: match[0]
            };
        }

        return null;
    }

    function extractDate(text) {
        var monthNames = Object.keys(MONTHS).join("|");
        var match;

        match = text.match(new RegExp(
            "\\b(" + monthNames + ")\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})\\b",
            "i"
        ));
        if (match) {
            return {
                value: toIsoDate(Number(match[3]), MONTHS[match[1].toLowerCase()], Number(match[2])),
                match: match[0]
            };
        }

        match = text.match(new RegExp(
            "\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(" + monthNames + "),?\\s*(\\d{4})\\b",
            "i"
        ));
        if (match) {
            return {
                value: toIsoDate(Number(match[3]), MONTHS[match[2].toLowerCase()], Number(match[1])),
                match: match[0]
            };
        }

        match = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
        if (match) {
            return {
                value: toIsoDate(Number(match[1]), Number(match[2]), Number(match[3])),
                match: match[0]
            };
        }

        match = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);
        if (match) {
            var first = Number(match[1]);
            var second = Number(match[2]);
            var year = Number(match[3]);
            var month = first > 12 ? second : first;
            var day = first > 12 ? first : second;

            if (first <= 12 && second <= 12) {
                month = first;
                day = second;
            }

            return {
                value: toIsoDate(year, month, day),
                match: match[0]
            };
        }

        return null;
    }

    function findKnownCity(text, fromIndex) {
        var lower = text.toLowerCase();
        var start = typeof fromIndex === "number" ? fromIndex : 0;
        var best = null;

        KNOWN_CITIES.forEach(function (city) {
            var index = lower.indexOf(city, start);

            while (index !== -1) {
                var beforeOk = index === 0 || /[\s,]/.test(lower.charAt(index - 1));
                var afterOk = index + city.length >= lower.length || /[\s,]/.test(lower.charAt(index + city.length));

                if (beforeOk && afterOk) {
                    if (!best || index < best.index || (index === best.index && city.length > best.city.length)) {
                        best = {
                            city: city,
                            index: index,
                            length: city.length
                        };
                    }
                    break;
                }

                index = lower.indexOf(city, index + 1);
            }
        });

        return best;
    }

    function extractCities(text) {
        var source = String(text || "").replace(/\s+/g, " ").trim();
        var match;

        // "from Baku to London" / "Baku to London" / "Baku to London, ..."
        match = source.match(
            /(?:^|\bfrom\s+)([a-z][\w'-]+(?:\s+[a-z][\w'-]+)?)\s+to\s+([a-z][\w'-]+(?:\s+[a-z][\w'-]+)?)/i
        );
        if (match) {
            var fromCandidate = cleanCity(match[1]);
            var toCandidate = cleanCity(match[2]);

            // Ignore filler false-positives like "want to fly"
            if (
                fromCandidate &&
                toCandidate &&
                !/^(want|like|fly|travel|please)$/i.test(fromCandidate) &&
                !/^(fly|travel|go|go\s+to)$/i.test(toCandidate)
            ) {
                return {
                    from: fromCandidate,
                    to: toCandidate
                };
            }
        }

        var first = findKnownCity(source, 0);
        if (first) {
            var second = findKnownCity(source, first.index + first.length);
            if (second) {
                return {
                    from: titleCaseCity(first.city),
                    to: titleCaseCity(second.city)
                };
            }
        }

        var leftover = source
            .replace(/\b(i|want|to|fly|from|travel|please|would|like|a|an|the|on|for|with|and)\b/gi, " ")
            .replace(/[.,;!?]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        var parts = leftover.split(" ").filter(Boolean);
        if (parts.length >= 2) {
            return {
                from: cleanCity(parts[0]),
                to: cleanCity(parts.slice(1).join(" "))
            };
        }

        return {
            from: "",
            to: ""
        };
    }

    function parseVoiceQuery(rawText) {
        var text = String(rawText || "").replace(/\s+/g, " ").trim();
        var working = text;
        var passengersInfo = extractPassengers(working);
        var dateInfo = extractDate(working);

        if (passengersInfo) {
            working = working.replace(passengersInfo.match, " ");
        }

        if (dateInfo) {
            working = working.replace(dateInfo.match, " ");
        }

        working = working
            .replace(/\b(i want to|i would like to|would like to|want to|fly|travel|please)\b/gi, " ")
            .replace(/\s+/g, " ")
            .trim();

        var cities = extractCities(working);

        return {
            from: cities.from,
            to: cities.to,
            passengers: passengersInfo ? passengersInfo.value : null,
            departureDate: dateInfo && dateInfo.value ? dateInfo.value : ""
        };
    }

    var submitButton = document.getElementById("search-flights-button");
    var RECOGNITION_LANGUAGES = { az: "az-AZ", en: "en-US", ru: "ru-RU" };
    var busy = false;

    function say(key, fallback, vars) {
        if (typeof t !== "function") {
            return fallback;
        }

        var value = t(key, vars);
        return value && value !== key ? value : fallback;
    }

    function siteLanguage() {
        var i18n = window.AEROVA_I18N;
        var lang = i18n && typeof i18n.getLanguage === "function" ? i18n.getLanguage() : "en";
        return RECOGNITION_LANGUAGES[lang] ? lang : "en";
    }

    function clearMessage() {
        if (message) {
            message.hidden = true;
            message.textContent = "";
            message.classList.remove("is-info");
        }

        input.classList.remove("is-invalid");
    }

    /* A problem (red field) or, with isInfo, a hint that is not a problem. */
    function showMessage(text, isInfo) {
        if (!message) {
            return;
        }

        message.textContent = text;
        message.hidden = !text;
        message.classList.toggle("is-info", Boolean(text) && Boolean(isInfo));
        input.classList.toggle("is-invalid", Boolean(text) && !isInfo);
    }

    function showStatus(text) {
        if (status) {
            status.textContent = text || "";
            status.hidden = !text;
        }
    }

    function setListening(isListening) {
        micButton.classList.toggle("is-listening", isListening);
        micButton.setAttribute("aria-pressed", isListening ? "true" : "false");
        micButton.setAttribute("aria-label", isListening ? say("home.voiceStop", "Stop voice search") : say("home.voiceStart", "Start voice search"));
        form.classList.toggle("is-listening", isListening);
        showStatus(isListening ? say("voice.listening", "Listening… say where and when you want to fly.") : "");
    }

    function setProcessing(isProcessing) {
        busy = isProcessing;
        form.classList.toggle("is-processing", isProcessing);
        micButton.disabled = isProcessing;

        if (submitButton) {
            submitButton.disabled = isProcessing;
        }

        showStatus(isProcessing ? say("voice.processing", "Reading your request…") : "");
    }

    /* Stops listening and drops what was heard (used when the form is submitted). */
    function abortVoice() {
        if (activeRecognition) {
            activeRecognition.onresult = null;
            activeRecognition.onerror = null;
            activeRecognition.onend = null;

            try {
                activeRecognition.abort();
            } catch (error) {
                // Recognition may already be stopped.
            }

            activeRecognition = null;
        }

        setListening(false);
    }

    function recognitionErrorMessage(code) {
        switch (code) {
            case "not-allowed":
            case "service-not-allowed":
                return say("voice.denied", "Microphone access is blocked. Allow the microphone for this site in your browser, or type your request.");
            case "no-speech":
                return say("voice.heardNothing", "We did not hear anything. Try again, or type your request.");
            case "audio-capture":
                return say("voice.noMicrophone", "No microphone was found. Please type your request.");
            case "network":
                return say("voice.network", "Speech recognition needs an internet connection. Check it, or type your request.");
            case "language-not-supported":
                return say("voice.languageNotSupported", "This browser cannot recognise this language by voice. Please type your request.");
            case "aborted":
                return "";
            default:
                return say("home.voiceCaptureFail", "Unable to capture voice input. Please try again or type your request.");
        }
    }

    function startVoice() {
        if (busy) {
            return;
        }

        if (!SpeechRecognition) {
            showMessage(say("home.voiceUnsupported", "Voice search is not supported in this browser. Please type your request."));
            input.focus();
            return;
        }

        // A second click ends the recording; what was heard so far is kept (see onend).
        if (activeRecognition) {
            try {
                activeRecognition.stop();
            } catch (error) {
                abortVoice();
            }

            return;
        }

        clearMessage();

        var recognition = new SpeechRecognition();
        var transcript = "";
        var failed = false;

        // The language of the site is the language that is recognised.
        recognition.lang = RECOGNITION_LANGUAGES[siteLanguage()];
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;
        activeRecognition = recognition;
        setListening(true);

        recognition.onresult = function (event) {
            var text = "";
            for (var i = 0; i < event.results.length; i += 1) {
                text += event.results[i][0].transcript;
            }

            transcript = text.trim();
            if (transcript) {
                input.value = transcript;
            }
        };

        recognition.onerror = function (event) {
            failed = true;
            var text = recognitionErrorMessage(event && event.error);
            if (text) {
                showMessage(text);
            }
        };

        recognition.onend = function () {
            setListening(false);
            if (activeRecognition === recognition) {
                activeRecognition = null;
            }

            if (failed) {
                input.focus();
                return;
            }

            if (!transcript) {
                showMessage(say("voice.heardNothing", "We did not hear anything. Try again, or type your request."));
                input.focus();
                return;
            }

            // The text is only shown: the traveller checks it, may correct it, and presses Search.
            input.value = transcript;
            showMessage(say("voice.review", "Check the text, correct it if needed, then press Search Flights."), true);
            input.focus();
        };

        try {
            recognition.start();
        } catch (error) {
            setListening(false);
            activeRecognition = null;
            showMessage(say("home.voiceStartFail", "Unable to start voice search. Please try again or type your request."));
        }
    }

    micButton.addEventListener("click", startVoice);

    /* The sentence the API could not accept as it is, in the language of the site. */
    function issueText(issue) {
        var options = (issue.options || []).map(function (airport) {
            return airport.name + " (" + airport.code + ")";
        }).join(", ");
        var value = issue.value || "";

        if (/^unknown_/.test(issue.code) && value) {
            value = value.charAt(0).toUpperCase() + value.slice(1);
        }

        if (issue.code === "past_date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            var parts = value.split("-");
            value = Number(parts[2]) + "." + parts[1] + "." + parts[0];
        }

        return say("voice.issues." + issue.code, say("home.voiceEmpty", "Please say or type where you would like to fly."), { value: value, options: options });
    }

    function goToResults(result, query) {
        var params = new URLSearchParams();
        params.set("from", result.origin.city);
        params.set("to", result.destination.city);
        params.set("passengers", String(result.passengers || 1));

        if (result.cabinClass) {
            params.set("cabinClass", result.cabinClass);
        }

        if (result.timeOfDay) {
            params.set("timeOfDay", String(result.timeOfDay).toLowerCase());
        }

        if (result.date) {
            params.set("departureDate", result.date);
        } else {
            // A period (the cheapest flight, "next week", or no day at all): the results page searches all of it and shows each day.
            params.set("dateFrom", result.dateFrom);
            params.set("dateTo", result.dateTo);

            if (result.cheapest) {
                params.set("cheapest", "1");

                // "the cheapest flight" is shown as one flight; "the cheapest flights" keeps several.
                if (result.cheapestSingle) {
                    params.set("single", "1");
                }
            }

            if (result.defaultPeriod) {
                params.set("defaultPeriod", "1");
            }
        }

        params.set("voice", "1");

        var resultsUrl = "flight-results.html?" + params.toString();
        var data = {
            from: result.origin.city,
            to: result.destination.city,
            query: query,
            passengers: result.passengers || 1
        };

        if (result.date) {
            data.departureDate = result.date;
        }

        if (result.cabinClass) {
            data.cabinClass = result.cabinClass;
        }

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

    /* The server could not be reached: the older English-only reading in this file still gets a plain "from X to Y" through. */
    function goToResultsOffline(query) {
        var parsed = parseVoiceQuery(query);

        if (!parsed.from || !parsed.to) {
            return false;
        }

        var params = new URLSearchParams();
        params.set("from", parsed.from);
        params.set("to", parsed.to);

        if (parsed.passengers && parsed.passengers >= 1 && parsed.passengers <= 9) {
            params.set("passengers", String(parsed.passengers));
        }

        if (parsed.departureDate) {
            params.set("departureDate", parsed.departureDate);
        }

        window.location.href = "flight-results.html?" + params.toString();
        return true;
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (busy) {
            return;
        }

        abortVoice();
        clearMessage();

        var query = input.value.trim();
        input.value = query;

        if (!query) {
            showMessage(say("home.voiceEmpty", "Please say or type where you would like to fly."));
            input.focus();
            return;
        }

        var api = window.AEROVA_API;
        if (!api || typeof api.post !== "function") {
            if (!goToResultsOffline(query)) {
                showMessage(say("voice.unreachable", "We could not reach the server to read your request. Please try again."));
            }

            return;
        }

        setProcessing(true);

        api.post("api/voice-search/interpret", { text: query, language: siteLanguage() }).then(function (result) {
            if (!result || result.status !== "ready" || !result.origin || !result.destination) {
                setProcessing(false);
                var issues = (result && result.issues) || [];
                showMessage(issues.length
                    ? issues.map(issueText).join(" ")
                    : say("home.voiceEmpty", "Please say or type where you would like to fly."));
                input.focus();
                return;
            }

            goToResults(result, query);
        }, function (error) {
            setProcessing(false);

            if (error && error.status && error.userMessage) {
                showMessage(error.userMessage);
                return;
            }

            if (!goToResultsOffline(query)) {
                showMessage(say("voice.unreachable", "We could not reach the server to read your request. Please try again."));
            }
        });
    });

    // The recording language follows the site language; a language change while listening ends that recording.
    window.addEventListener("aerova:languagechange", function () {
        abortVoice();
    });

})();

(function () {
    var images = document.querySelectorAll(".destination-image");

    images.forEach(function (image) {
        function hideMissingImage() {
            image.classList.add("is-missing");
        }

        if (image.complete && image.naturalWidth === 0) {
            hideMissingImage();
        }

        image.addEventListener("error", hideMissingImage);
    });
})();

(function () {
    var form = document.getElementById("newsletter-form");
    var input = document.getElementById("newsletter-email");
    var message = document.getElementById("newsletter-message");
    var button = form ? form.querySelector(".newsletter-button") : null;

    if (!form || !input || !message || !button) {
        return;
    }

    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var busy = false;

    function say(key, fallback) {
        if (typeof t !== "function") {
            return fallback;
        }

        var value = t(key);
        return value && value !== key ? value : fallback;
    }

    function showMessage(text, kind) {
        message.textContent = text;
        message.hidden = false;
        message.classList.toggle("is-error", kind === "error");
        message.classList.toggle("is-success", kind === "success");
        input.setAttribute("aria-invalid", kind === "error" ? "true" : "false");
    }

    function setBusy(isBusy) {
        busy = isBusy;
        button.disabled = isBusy;
        input.readOnly = isBusy;
        form.setAttribute("aria-busy", isBusy ? "true" : "false");
        button.textContent = isBusy ? say("home.newsletterSending", "Sending...") : say("home.newsletterButton", "Subscribe");
    }

    function languageOfPage() {
        var i18n = window.AEROVA_I18N;
        return i18n && typeof i18n.getLanguage === "function" ? i18n.getLanguage() : "en";
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        // One request at a time: a second click or Enter while one is on its way does nothing.
        if (busy) {
            return;
        }

        var email = input.value.trim();
        input.value = email;

        if (!email) {
            showMessage(say("home.newsletterEmailRequired", "Please enter your email address."), "error");
            input.focus();
            return;
        }

        if (!emailPattern.test(email)) {
            showMessage(say("home.newsletterError", "Please enter a valid email address."), "error");
            input.focus();
            return;
        }

        var api = window.AEROVA_API;
        if (!api || typeof api.post !== "function") {
            showMessage(say("home.newsletterUnreachable", "We could not reach the server. Please try again in a moment."), "error");
            return;
        }

        setBusy(true);
        showMessage(say("home.newsletterSending", "Sending..."), "");

        api.post("api/newsletter/subscribe", { email: email, language: languageOfPage() }).then(function () {
            setBusy(false);
            input.value = "";
            // The same sentence for every address: the form does not say whether it was already on the list.
            showMessage(say("home.newsletterSuccess", "A confirmation link was sent to your email address."), "success");
        }, function (error) {
            setBusy(false);

            if (error && error.status === 400) {
                showMessage(say("home.newsletterError", "Please enter a valid email address."), "error");
            } else if (error && error.status === 429) {
                showMessage(say("home.newsletterBusy", "Too many requests. Please wait a moment and try again."), "error");
            } else if (error && error.status) {
                showMessage(say("home.newsletterUnavailable", "We cannot send the confirmation e-mail right now. Please try again later."), "error");
            } else {
                showMessage(say("home.newsletterUnreachable", "We could not reach the server. Please try again in a moment."), "error");
            }
        });
    });
})();

(function () {
    var card = document.getElementById("why-easy-booking");
    if (!card) {
        return;
    }

    function openBookingPage() {
        window.location.href = card.getAttribute("data-href") || "booking.html";
    }

    card.addEventListener("click", function () {
        openBookingPage();
    });

    card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openBookingPage();
        }
    });
})();
