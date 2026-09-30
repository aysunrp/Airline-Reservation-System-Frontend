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
        "dubai", "london", "paris", "istanbul", "baku", "maldives", "male",
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
        var from = "";
        var to = "";
        var match;

        match = text.match(/\bfrom\s+([a-z][\w\s'-]*?)\s+to\s+([a-z][\w\s'-]*?)(?=\s+(?:for|on|with|\d)|,|$)/i);
        if (match) {
            return {
                from: cleanCity(match[1]),
                to: cleanCity(match[2])
            };
        }

        match = text.match(/\b([a-z][\w'-]+(?:\s+[a-z][\w'-]+)?)\s+to\s+([a-z][\w'-]+(?:\s+[a-z][\w'-]+)?)(?=\s+(?:for|on|with|\d)|,|$)/i);
        if (match) {
            return {
                from: cleanCity(match[1]),
                to: cleanCity(match[2])
            };
        }

        var first = findKnownCity(text, 0);
        if (first) {
            var second = findKnownCity(text, first.index + first.length);
            if (second) {
                return {
                    from: titleCaseCity(first.city),
                    to: titleCaseCity(second.city)
                };
            }
        }

        var leftover = text
            .replace(/\b(i|want|to|fly|from|travel|please|would|like|a|an|the|on|for|with|and)\b/gi, " ")
            .replace(/[.,;!?]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        var parts = leftover.split(" ").filter(Boolean);
        if (parts.length >= 2) {
            from = cleanCity(parts[0]);
            to = cleanCity(parts.slice(1).join(" "));
        }

        return {
            from: from,
            to: to
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

    function clearMessage() {
        if (message) {
            message.hidden = true;
            message.textContent = "";
        }

        input.classList.remove("is-invalid");
    }

    function showMessage(text) {
        if (!message) {
            return;
        }

        message.textContent = text;
        message.hidden = !text;
        input.classList.toggle("is-invalid", Boolean(text));
    }

    function setListening(isListening) {
        micButton.classList.toggle("is-listening", isListening);
        micButton.setAttribute("aria-label", isListening ? "Stop voice search" : "Start voice search");
        form.classList.toggle("is-listening", isListening);

        if (status) {
            status.hidden = !isListening;
        }
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

        setListening(false);
    }

    function startVoice() {
        if (!SpeechRecognition) {
            showMessage("Voice search is not supported in this browser. Please type your request.");
            return;
        }

        if (micButton.classList.contains("is-listening")) {
            stopVoice();
            return;
        }

        stopVoice();
        clearMessage();

        var recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        activeRecognition = recognition;
        setListening(true);

        recognition.onresult = function (event) {
            var transcript = "";
            for (var i = 0; i < event.results.length; i += 1) {
                transcript += event.results[i][0].transcript;
            }

            if (transcript) {
                input.value = transcript.trim();
            }
        };

        recognition.onerror = function () {
            showMessage("Unable to capture voice input. Please try again or type your request.");
        };

        recognition.onend = function () {
            setListening(false);
            if (activeRecognition === recognition) {
                activeRecognition = null;
            }
        };

        try {
            recognition.start();
        } catch (error) {
            setListening(false);
            activeRecognition = null;
            showMessage("Unable to start voice search. Please try again or type your request.");
        }
    }

    micButton.addEventListener("click", startVoice);

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        stopVoice();
        clearMessage();

        var query = input.value.trim();
        input.value = query;

        if (!query) {
            showMessage("Please say or type where you would like to fly.");
            input.focus();
            return;
        }

        var parsed = parseVoiceQuery(query);

        if (!parsed.from) {
            showMessage("Please provide your origin.");
            input.focus();
            return;
        }

        if (!parsed.to) {
            showMessage("Please provide your destination.");
            input.focus();
            return;
        }

        if (!parsed.passengers || parsed.passengers < 1 || parsed.passengers > 9) {
            showMessage("Please provide the number of passengers.");
            input.focus();
            return;
        }

        if (!parsed.departureDate) {
            showMessage("Please provide your departure date.");
            input.focus();
            return;
        }

        var params = new URLSearchParams();
        params.set("from", parsed.from);
        params.set("to", parsed.to);
        params.set("passengers", String(parsed.passengers));
        params.set("departureDate", parsed.departureDate);

        var resultsUrl = "flight-results.html?" + params.toString();
        var data = {
            from: parsed.from,
            to: parsed.to,
            passengers: parsed.passengers,
            departureDate: parsed.departureDate,
            query: query
        };

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

    if (!form || !input || !message) {
        return;
    }

    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function showMessage(text, isError) {
        message.textContent = text;
        message.hidden = false;
        message.classList.toggle("is-error", isError);
        message.classList.toggle("is-success", !isError);
        input.setAttribute("aria-invalid", isError ? "true" : "false");
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        var email = input.value.trim();
        input.value = email;

        if (!email) {
            showMessage("Please enter your email address.", true);
            input.focus();
            return;
        }

        if (!emailPattern.test(email)) {
            showMessage("Please enter a valid email address.", true);
            input.focus();
            return;
        }

        showMessage("You're subscribed. Welcome to AEROVA.", false);
        input.value = "";
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
