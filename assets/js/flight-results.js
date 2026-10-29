(function () {
    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var CABIN_CLASSES = ["Economy", "Comfort", "Business"];

    /* Parts of the day, by the hour a flight leaves (airport time). The same ranges are used by the API: morning 05:00-11:59, afternoon 12:00-17:59, evening 18:00-23:59, night 00:00-04:59. */
    var TIME_OF_DAY = { morning: [5, 12], afternoon: [12, 18], evening: [18, 24], night: [0, 5] };
    var MAX_PERIOD_DAYS = 62;

    /* An explicit request for the one cheapest flight: only that flight is shown first, the others only when asked for. */
    function isSingleCheapest(criteria) {
        return Boolean(criteria.range && criteria.cheapest && criteria.single && !criteria.showAll);
    }

    function departsIn(part, timeValue) {
        var range = TIME_OF_DAY[part];
        var hour = Math.floor(parseDepartureMinutes(timeValue) / 60);
        return !range || (hour >= range[0] && hour < range[1]);
    }

    /*
     * Builds the segment template of a schedule from its legs and stopovers.
     * Every time is computed in UTC minutes relative to the departure day and
     * then converted back to the local time of the airport involved.
     */
    function normalizeText(value) {
        return String(value || "").trim().toLowerCase();
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /* The searches of a multi-city trip: they all travel in the link as JSON (and as from1, to1, departureDate1... too). */
    function readSegments(params) {
        var list = [];

        try {
            list = JSON.parse(params.get("segmentsJson") || "[]");
        } catch (error) {
            list = [];
        }

        if (!Array.isArray(list) || list.length < 2) {
            list = [];
            for (var number = 1; number <= 6 && params.get("from" + number); number += 1) {
                list.push({ from: params.get("from" + number), to: params.get("to" + number) || "", departureDate: params.get("departureDate" + number) || "" });
            }
        }

        return list.filter(function (item) {
            return item && typeof item.from === "string" && typeof item.to === "string" && typeof item.departureDate === "string";
        }).slice(0, 6);
    }

    /* Who travels: adults, children and infants. An older link only has the number of seats, all of them adults. */
    function readMix(params, seats) {
        var adults = parseInt(params.get("adults"), 10);
        var children = Math.max(0, parseInt(params.get("children"), 10) || 0);
        var infants = Math.max(0, parseInt(params.get("infants"), 10) || 0);

        if (!(adults >= 1) || adults + children !== seats) {
            return { adults: seats, children: 0, infants: 0 };
        }

        return { adults: adults, children: children, infants: infants };
    }

    function readSearchCriteria() {
        var params = new URLSearchParams(window.location.search);

        var criteria = {
            tripType: params.get("tripType") || "",
            from: (params.get("from") || "").trim(),
            to: (params.get("to") || "").trim(),
            departureDate: params.get("departureDate") || "",
            returnDate: params.get("returnDate") || "",
            passengers: params.get("passengers") || "1",
            cabinClass: (params.get("cabinClass") || "").trim(),
            // Which flight of the trip is being chosen. 2 on a round trip = the return flight (the link already holds the way
            // back as from/to and the return date); on a multi-city trip it counts up to the number of searches.
            leg: Math.max(1, Math.floor(Number(params.get("leg")) || 1)),
            multi: null
        };

        // Voice search: a part of the day, or a whole period (the cheapest flight, "next week", no day at all) instead of one day.
        var part = (params.get("timeOfDay") || "").toLowerCase();
        criteria.timeOfDay = TIME_OF_DAY[part] ? part : "";
        criteria.dateFrom = params.get("dateFrom") || "";
        criteria.dateTo = params.get("dateTo") || "";
        criteria.cheapest = params.get("cheapest") === "1";
        criteria.defaultPeriod = params.get("defaultPeriod") === "1";
        criteria.single = params.get("single") === "1";
        criteria.showAll = params.get("all") === "1";
        criteria.cheapestId = params.get("cheapestId") || "";
        criteria.range = !criteria.departureDate && !/multi/i.test(criteria.tripType) &&
            Boolean(parseISODate(criteria.dateFrom) && parseISODate(criteria.dateTo));

        var mix = readMix(params, Math.max(1, parseInt(criteria.passengers, 10) || 1));
        criteria.adults = mix.adults;
        criteria.children = mix.children;
        criteria.infants = mix.infants;

        if (/multi/i.test(criteria.tripType)) {
            var segments = readSegments(params);

            if (segments.length >= 2) {
                criteria.leg = Math.min(criteria.leg, segments.length);
                var segment = segments[criteria.leg - 1];
                criteria.from = segment.from.trim();
                criteria.to = segment.to.trim();
                criteria.departureDate = segment.departureDate;
                criteria.multi = { count: segments.length, segments: segments };
            }
        } else {
            criteria.leg = criteria.leg === 2 ? 2 : 1;
        }

        return criteria;
    }

    /* The flight chosen just before the one being chosen now: the outbound flight, or the earlier flight of a multi-city trip. */
    function previousFlight(criteria) {
        var journey = window.AEROVA_JOURNEY;

        if (!journey || criteria.leg < 2) {
            return null;
        }

        if (criteria.multi) {
            return journey.previous(criteria.leg);
        }

        return criteria.leg === 2 ? journey.outbound() : null;
    }

    function utcMillis(value) {
        var text = String(value || "");
        return text ? Date.parse(/(Z|[+-]\d\d:?\d\d)$/i.test(text) ? text : text + "Z") : NaN;
    }

    /* A flight of the trip must leave after the flight before it has landed (compared in UTC, whatever the airports are). */
    function leavesAfterLanding(flight, before) {
        var landed = utcMillis(before.arrivalAtUtc);
        var leaves = utcMillis(flight.departureAtUtc);

        if (!isNaN(landed) && !isNaN(leaves)) {
            return leaves > landed;
        }

        // A selection kept by an older page has local times only.
        if (before.arrivalDate && before.arrival) {
            return (flight.date + " " + flight.departure) > (before.arrivalDate + " " + before.arrival);
        }

        return true;
    }

    function formatDisplayDate(dateValue) {
        if (!dateValue) {
            return "";
        }

        var parts = dateValue.split("-");
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

        if (!year || !month || !day || month < 1 || month > 12) {
            return null;
        }

        var date = new Date(year, month - 1, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        return date;
    }

    function toISODate(date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1);
        var day = String(date.getDate());

        if (month.length < 2) {
            month = "0" + month;
        }

        if (day.length < 2) {
            day = "0" + day;
        }

        return year + "-" + month + "-" + day;
    }

    function parseDepartureMinutes(timeValue) {
        var parts = String(timeValue || "").split(":");
        var hours = Number(parts[0]);
        var minutes = Number(parts[1]);

        if (!isFinite(hours) || !isFinite(minutes)) {
            return 0;
        }

        return (hours * 60) + minutes;
    }

    function resolveCabinName(cabinValue) {
        var normalized = normalizeText(cabinValue);

        for (var i = 0; i < CABIN_CLASSES.length; i += 1) {
            if (normalizeText(CABIN_CLASSES[i]) === normalized) {
                return CABIN_CLASSES[i];
            }
        }

        return "";
    }

    function getDefaultCabin(criteria) {
        return resolveCabinName(criteria.cabinClass) || "Economy";
    }

    function getCabinPrice(flight, cabinClass) {
        if (!flight.cabinPrices) {
            return null;
        }

        var price = flight.cabinPrices[cabinClass];
        return typeof price === "number" ? price : null;
    }

    function sortFlightsChronologically(flights) {
        return flights.sort(function (a, b) {
            if (a.date < b.date) {
                return -1;
            }

            if (a.date > b.date) {
                return 1;
            }

            return parseDepartureMinutes(a.departure) - parseDepartureMinutes(b.departure);
        });
    }

    var viewState = "loading";
    var rangeInfo = { total: 0, shown: 0, lowest: 0 };
    var statusSpec = null;
    var loadToken = 0;

    function say(key, fallback, vars) {
        if (typeof t !== "function") {
            return fallback;
        }

        var value = t(key, vars);
        return value && value !== key ? value : fallback;
    }

    function setCountText(text) {
        var countElement = document.getElementById("results-count");
        if (countElement) {
            countElement.textContent = text;
        }
    }

    function paintStatus() {
        var container = document.querySelector(".flight-list");
        if (!container || !statusSpec) {
            return;
        }

        var spec = statusSpec;
        var title = say(spec.titleKey, spec.titleFallback);
        var message = spec.text || say(spec.textKey, spec.textFallback, spec.vars);

        container.innerHTML =
            '<div class="results-empty" role="' + (spec.kind === "error" ? "alert" : "status") + '">' +
                '<h2 class="results-empty-title">' + escapeHtml(title) + "</h2>" +
                '<p class="results-empty-text">' + escapeHtml(message) + "</p>" +
                (spec.retry ? '<button type="button" class="select-flight-button results-retry">' + escapeHtml(say("api.search.retry", "Try again")) + "</button>" : "") +
                (spec.action ? '<button type="button" class="select-flight-button results-action">' + escapeHtml(say(spec.action.key, spec.action.fallback)) + "</button>" : "") +
            "</div>";

        var actionButton = container.querySelector(".results-action");
        if (actionButton) {
            actionButton.addEventListener("click", spec.action.run);
        }

        var retryButton = container.querySelector(".results-retry");
        if (retryButton) {
            retryButton.addEventListener("click", loadFlights);
        }

        setCountText(spec.kind === "loading" ? say("api.search.loadingCount", "Searching...") : "");
    }

    function setStatus(spec) {
        viewState = spec.kind;
        statusSpec = spec;
        paintStatus();
    }

    /*
     * One flight from the API in the shape the cards, filters and the details page already use.
     * Times are shown where they happen: each airport's own clock, from its time zone.
     */
    function searchBody(criteria, origin, destination, selectedDate) {
        var travellers = parseInt(criteria.passengers, 10);

        return {
            legs: [{ originCode: origin.code, destinationCode: destination.code, date: toISODate(selectedDate) }],
            cabinClass: resolveCabinName(criteria.cabinClass) || null,
            passengers: isFinite(travellers) ? Math.min(9, Math.max(1, travellers)) : 1
        };
    }

    /* Loads this search from the backend. The page only ever shows what the API answered. */
    function loadFlights() {
        var criteria = searchCriteria;
        var token = ++loadToken;
        var selectedDate = parseISODate(criteria.departureDate);

        baseFlights = [];

        if (!criteria.from || !criteria.to) {
            setStatus({ kind: "notice", titleKey: "results.noResultsTitle", titleFallback: "No Flights Found", textKey: "api.search.needRoute", textFallback: "Enter where you are flying from and to." });
            return;
        }

        if (criteria.range) {
            setStatus({ kind: "loading", titleKey: "api.search.loadingTitle", titleFallback: "Searching flights", textKey: "api.search.loadingText", textFallback: "Please wait while we look for available flights." });
            loadRange(criteria, token);
            return;
        }

        if (!selectedDate) {
            setStatus({ kind: "notice", titleKey: "results.noResultsTitle", titleFallback: "No Flights Found", textKey: "api.search.needDate", textFallback: "Select a departure date to search for flights." });
            return;
        }

        setStatus({ kind: "loading", titleKey: "api.search.loadingTitle", titleFallback: "Searching flights", textKey: "api.search.loadingText", textFallback: "Please wait while we look for available flights." });

        var directory = window.AEROVA_AIRPORTS;
        var airports = [];

        directory.load().then(function (list) {
            airports = list;
            var origin = directory.find(list, criteria.from);
            var destination = directory.find(list, criteria.to);

            if (!origin || !destination) {
                var unknown = new Error("Unknown airport");
                unknown.unknownCity = !origin ? criteria.from : criteria.to;
                throw unknown;
            }

            return window.AEROVA_API.post("api/flights/search", searchBody(criteria, origin, destination, selectedDate));
        }).then(function (legs) {
            if (token !== loadToken) {
                return;
            }

            var found = (legs && legs[0] && legs[0].flights) || [];
            var pageFlights = found.map(function (dto) { return window.AEROVA_FLIGHTS.toPageFlight(dto, airports); });

            // Only the part of the day that was asked for; when nothing else is left it is said, and the other flights are not shown instead.
            var leftOutByTime = 0;
            if (criteria.timeOfDay) {
                var inPart = pageFlights.filter(function (flight) { return departsIn(criteria.timeOfDay, flight.departure); });
                leftOutByTime = pageFlights.length - inPart.length;
                pageFlights = inPart;
            }

            // Flights that leave before the flight chosen earlier has landed are not offered.
            var before = previousFlight(criteria);
            hiddenBeforeArrival = 0;

            if (before) {
                pageFlights = pageFlights.filter(function (flight) {
                    var later = leavesAfterLanding(flight, before);
                    if (!later) {
                        hiddenBeforeArrival++;
                    }
                    return later;
                });
            }

            baseFlights = sortFlightsChronologically(pageFlights);

            if (!pageFlights.length && leftOutByTime > 0) {
                setStatus({
                    kind: "notice", titleKey: "results.noResultsTitle", titleFallback: "No Flights Found",
                    textKey: "voice.results.noneOnDate", textFallback: "There are no {part} flights on {date}.",
                    vars: { part: say("voice.results.partName." + criteria.timeOfDay, criteria.timeOfDay), date: formatDisplayDate(criteria.departureDate) },
                    action: { key: "voice.results.showAllTimes", fallback: "Show all times of day", run: showAllTimes }
                });
                return;
            }

            // The note about the outbound flight also says how many flights were left out, so it is drawn again now.
            paintOutboundNote(criteria);
            viewState = "ready";
            statusSpec = null;
            refreshResults();
        }).catch(function (error) {
            showLoadError(error, token);
        });
    }

    function showLoadError(error, token) {
        if (token !== loadToken) {
            return;
        }

        baseFlights = [];

        if (error && error.unknownCity) {
            setStatus({ kind: "notice", titleKey: "results.noResultsTitle", titleFallback: "No Flights Found", textKey: "api.search.unknownAirport", textFallback: "We do not fly from or to \"" + error.unknownCity + "\" yet. Please choose another city.", vars: { city: error.unknownCity } });
            return;
        }

        var isApiError = window.AEROVA_API && error instanceof window.AEROVA_API.ApiError;
        if (!isApiError && window.console) {
            window.console.error(error);
        }

        setStatus({ kind: "error", titleKey: "api.search.errorTitle", titleFallback: "We could not load flights", text: isApiError ? error.userMessage : say("api.errors.generic", "Something went wrong. Please try again."), retry: true });
    }

    function reloadWith(change) {
        var params = new URLSearchParams(window.location.search);
        change(params);
        window.location.search = params.toString();
    }

    function showAllTimes() {
        reloadWith(function (params) { params.delete("timeOfDay"); });
    }

    function expandPeriod() {
        reloadWith(function (params) {
            var end = parseISODate(params.get("dateFrom"));
            end.setDate(end.getDate() + MAX_PERIOD_DAYS - 1);
            params.set("dateTo", toISODate(end));
        });
    }

    /*
     * A search over a period (the cheapest flight, "next week", no day said): the API lists the real bookable flights of the whole period,
     * cheapest or earliest first, and every card shows its own date. Nothing is searched outside the period that was asked for.
     */
    function loadRange(criteria, token) {
        var directory = window.AEROVA_AIRPORTS;
        var airports = [];

        directory.load().then(function (list) {
            airports = list;
            var origin = directory.find(list, criteria.from);
            var destination = directory.find(list, criteria.to);

            if (!origin || !destination) {
                var unknown = new Error("Unknown airport");
                unknown.unknownCity = !origin ? criteria.from : criteria.to;
                throw unknown;
            }

            var travellers = parseInt(criteria.passengers, 10);

            return window.AEROVA_API.post("api/flights/search-range", {
                originCode: origin.code,
                destinationCode: destination.code,
                from: criteria.dateFrom,
                to: criteria.dateTo,
                cabinClass: resolveCabinName(criteria.cabinClass) || null,
                passengers: isFinite(travellers) ? Math.min(9, Math.max(1, travellers)) : 1,
                timeOfDay: criteria.timeOfDay ? criteria.timeOfDay.charAt(0).toUpperCase() + criteria.timeOfDay.slice(1) : null,
                sortBy: criteria.cheapest ? "price" : "departure",
                // "The cheapest flight": the API compares the whole period first and returns every flight at the lowest fare, and no dearer one.
                lowestOnly: isSingleCheapest(criteria)
            });
        }).then(function (result) {
            if (token !== loadToken) {
                return;
            }

            var pageFlights = ((result && result.flights) || []).map(function (dto) { return window.AEROVA_FLIGHTS.toPageFlight(dto, airports); });
            // After "view other flights" the flight that was already shown is not listed again.
            if (criteria.showAll && criteria.cheapestId) {
                var already = criteria.cheapestId.split(",");
                pageFlights = pageFlights.filter(function (flight) { return already.indexOf(String(flight.id)) === -1; });
            }

            rangeInfo = { total: (result && result.totalFound) || pageFlights.length, shown: pageFlights.length, lowest: (result && result.lowestPriceCount) || 0 };
            baseFlights = pageFlights;

            if (!pageFlights.length) {
                setStatus({
                    kind: "notice", titleKey: "results.noResultsTitle", titleFallback: "No Flights Found",
                    textKey: criteria.timeOfDay ? "voice.results.noneInPeriodTime" : "voice.results.noneInPeriod",
                    textFallback: "There are no flights from {origin} to {destination} between {from} and {to}.",
                    vars: {
                        origin: criteria.from, destination: criteria.to, from: formatDisplayDate(criteria.dateFrom), to: formatDisplayDate(criteria.dateTo),
                        part: say("voice.results.partName." + criteria.timeOfDay, criteria.timeOfDay)
                    },
                    action: periodDays(criteria) < MAX_PERIOD_DAYS ? { key: "voice.results.expand", fallback: "Search up to 62 days", run: expandPeriod } : null
                });
                paintVoiceNote(criteria);
                return;
            }

            var sortSelect = document.getElementById("sort-by-select");
            if (sortSelect) {
                sortSelect.value = criteria.cheapest ? "cheapest" : "earliest";
            }

            viewState = "ready";
            statusSpec = null;
            paintVoiceNote(criteria);
            refreshResults();
        }).catch(function (error) {
            showLoadError(error, token);
        });
    }

    /* While choosing a later flight, remind the traveller of the flight and seats already chosen before it. */
    function paintOutboundNote(criteria) {
        var meta = document.querySelector(".results-meta");
        var note = document.getElementById("journey-note");

        if (!meta) {
            return;
        }

        var before = previousFlight(criteria);

        if (!before) {
            if (note) {
                note.hidden = true;
            }
            return;
        }

        if (!note) {
            note = document.createElement("p");
            note.id = "journey-note";
            note.className = "results-meta results-journey-note";
            meta.parentNode.insertBefore(note, meta.nextSibling);
        }

        var seats = (before.selectedSeats || []).join(", ");
        var vars = {
            n: criteria.leg - 1,
            flight: before.flightNumber,
            route: before.from + " \u2192 " + before.to,
            date: formatDisplayDate(before.departureDate),
            cabin: before.cabinClass,
            seats: seats ? ", " + seats : ""
        };

        note.textContent = criteria.multi
            ? say("api.journey.previousChosen", "Flight {n}: {flight}, {route}, {date}, {cabin}{seats}", vars)
            : say("api.journey.outboundChosen", "Outbound: {flight}, {route}, {date}, {cabin}{seats}", vars);

        if (hiddenBeforeArrival > 0) {
            note.textContent += " \u00b7 " + (criteria.multi
                ? say("api.journey.hiddenBeforePrevious", "{count} earlier flight(s) are not shown because they leave before your previous flight lands.", { count: hiddenBeforeArrival })
                : say("api.journey.hiddenBeforeArrival", "{count} earlier flight(s) are not shown because they leave before your outbound flight lands.", { count: hiddenBeforeArrival }));
        }

        note.hidden = false;
    }

    function updateResultsHeader(criteria) {
        var routeElement = document.querySelector(".results-route");
        var metaElement = document.querySelector(".results-meta");
        var eyebrowElement = document.querySelector(".results-eyebrow");
        var selectedDate = parseISODate(criteria.departureDate);

        if (eyebrowElement) {
            eyebrowElement.textContent = (typeof t === "function" ? t("results.eyebrow") : "Available Flights");

            if (criteria.multi) {
                eyebrowElement.textContent = say("api.journey.chooseLeg", "Choose flight {n} of {total}", { n: criteria.leg, total: criteria.multi.count });
            } else if (criteria.leg === 2) {
                eyebrowElement.textContent = say("api.journey.chooseReturn", "Choose your return flight");
            } else if (/round/i.test(criteria.tripType || "") && criteria.returnDate) {
                eyebrowElement.textContent = say("api.journey.chooseOutbound", "Choose your outbound flight");
            }
        }

        paintOutboundNote(criteria);

        if (routeElement) {
            var fromLabel = criteria.from || "Origin";
            var toLabel = criteria.to || "Destination";
            routeElement.textContent = fromLabel + " → " + toLabel;
        }

        if (metaElement) {
            if (criteria.range) {
                var span = { from: formatDisplayDate(criteria.dateFrom), to: formatDisplayDate(criteria.dateTo) };
                if (isSingleCheapest(criteria)) {
                    metaElement.textContent = say("voice.results.singleHeading", "Cheapest flight found between {from} and {to}", span);
                } else if (criteria.cheapest && criteria.single) {
                    metaElement.textContent = say("voice.results.otherHeading", "Other flights between {from} and {to}, cheapest first", span);
                } else {
                    metaElement.textContent = criteria.cheapest
                        ? say("voice.results.cheapestHeading", "Cheapest flights between {from} and {to}", span)
                        : say("voice.results.periodHeading", "Flights between {from} and {to}", span);
                }
            } else if (selectedDate) {
                metaElement.textContent = formatDisplayDate(toISODate(selectedDate));
            } else {
                metaElement.textContent = (typeof t === "function" ? t("results.availableNext30") : "Available flights in the next 30 days");
            }

            if (criteria.timeOfDay) {
                metaElement.textContent += " \u00b7 " + say("voice.results." + criteria.timeOfDay, criteria.timeOfDay);
            }
        }

        paintVoiceNote(criteria);
    }

    function periodDays(criteria) {
        var from = parseISODate(criteria.dateFrom);
        var to = parseISODate(criteria.dateTo);
        return from && to ? Math.round((to - from) / 86400000) + 1 : 0;
    }

    /* What a voice search needs to say about its results: how the period was chosen, what "cheapest" covers, and when the list is cut short. */
    function paintVoiceNote(criteria) {
        paintVoiceNoteText(criteria);
        paintOthersButton(criteria);
    }

    /* The action that shows the other flights of a single-cheapest search; they are not shown unless it is used. */
    function paintOthersButton(criteria) {
        var meta = document.querySelector(".results-meta");
        var button = document.getElementById("voice-others");
        var show = isSingleCheapest(criteria) && viewState === "ready" && rangeInfo.total > baseFlights.length && baseFlights.length > 0;

        if (!show) {
            if (button) {
                button.remove();
            }
            return;
        }

        if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.id = "voice-others";
            button.className = "select-flight-button voice-others-button";
            button.addEventListener("click", function () {
                var shownId = baseFlights.map(function (flight) { return String(flight.id); }).join(",");
                reloadWith(function (params) {
                    params.set("all", "1");
                    params.set("cheapestId", shownId);
                });
            });
            var anchor = document.getElementById("voice-note") || meta;
            anchor.parentNode.insertBefore(button, anchor.nextSibling);
        }

        button.textContent = say("voice.results.otherFlights", "View other flights");
    }

    function paintVoiceNoteText(criteria) {
        var meta = document.querySelector(".results-meta");
        var note = document.getElementById("voice-note");

        if (!meta) {
            return;
        }

        var lines = [];

        var single = isSingleCheapest(criteria);

        if (single) {
            if (viewState === "ready" && baseFlights.length) {
                var shown = baseFlights[0];
                var each = getCabinPrice(shown, getDefaultCabin(criteria));
                var travellers = Math.max(1, parseInt(criteria.passengers, 10) || 1);

                lines.push(say("voice.results.singleNote", "This is the lowest fare found in the {days} days searched ({from} to {to}). Other dates were not searched.",
                    { days: periodDays(criteria), from: formatDisplayDate(criteria.dateFrom), to: formatDisplayDate(criteria.dateTo) }));

                if (travellers > 1 && typeof each === "number") {
                    lines.push(say("voice.results.singleTotal", "Fare for {count} passengers: ${total} (${each} each).", { count: travellers, total: each * travellers, each: each }));
                }

                if (baseFlights.length > 1) {
                    lines.push(say("voice.results.singleTie", "{count} flights share this lowest price.", { count: baseFlights.length }));
                }
            }
        } else if (criteria.range && criteria.cheapest) {
            lines.push(say("voice.results.cheapestNote", "These are the cheapest fares found in this period. Other dates may have different fares."));
        }

        if (criteria.range && criteria.defaultPeriod) {
            lines.push(say("voice.results.defaultPeriodNote", "No date was given, so departures over the next {days} days are shown.", { days: periodDays(criteria) }));
        }

        if (criteria.range && !single && viewState === "ready" && rangeInfo.total > rangeInfo.shown) {
            lines.push(say("voice.results.truncated", "Showing the {shown} cheapest of {total} flights.", { shown: rangeInfo.shown, total: rangeInfo.total }));
        }

        if (!lines.length) {
            if (note) {
                note.hidden = true;
            }
            return;
        }

        if (!note) {
            note = document.createElement("p");
            note.id = "voice-note";
            note.className = "results-meta results-journey-note";
            meta.parentNode.insertBefore(note, meta.nextSibling);
        }

        note.hidden = false;
        note.textContent = lines.join(" ");
    }

    function buildCabinOptionsMarkup(flight, selectedCabin) {
        var groupId = "cabin-group-" + (flight.instanceId || flight.id);
        var optionsMarkup = CABIN_CLASSES.map(function (cabin) {
            var isSelected = cabin === selectedCabin;
            var price = getCabinPrice(flight, cabin);
            var disabled = typeof price !== "number";
            var cabinLabel = cabin;
            if (typeof t === "function") {
                if (cabin === "Economy") cabinLabel = t("results.economy");
                else if (cabin === "Comfort") cabinLabel = t("results.comfort");
                else if (cabin === "Business") cabinLabel = t("results.business");
            }

            return (
                '<button' +
                    ' type="button"' +
                    ' class="cabin-option' + (isSelected ? " is-selected" : "") + '"' +
                    ' role="radio"' +
                    ' aria-checked="' + (isSelected ? "true" : "false") + '"' +
                    ' data-cabin="' + escapeHtml(cabin) + '"' +
                    (disabled ? " disabled" : "") +
                ">" +
                    escapeHtml(cabinLabel) +
                "</button>"
            );
        }).join("");

        var cabinLabel = typeof t === "function" ? t("results.cabinClass") : "Cabin Class";
        return (
            '<div class="cabin-selection">' +
                '<p class="cabin-selection-label" id="' + groupId + '-label">' + escapeHtml(cabinLabel) + "</p>" +
                '<div class="cabin-options" role="radiogroup" aria-labelledby="' + groupId + '-label">' +
                    optionsMarkup +
                "</div>" +
            "</div>"
        );
    }

    function arrivalDayMarker(flight) {
        if (!flight.arrivalDate || !flight.date || flight.arrivalDate <= flight.date) {
            return "";
        }

        var days = Math.round((parseISODate(flight.arrivalDate) - parseISODate(flight.date)) / 86400000);
        return days > 0 ? ' <span class="journey-next-day">+' + days + "</span>" : "";
    }

    function stopoverCodesLabel(flight) {
        if (!flight.segments || flight.segments.length < 2) {
            return "";
        }

        var codes = flight.segments.slice(1).map(function (segment) {
            return segment.from.code;
        }).join(", ");

        return " · " + (typeof t === "function" ? t("results.via", { codes: codes }) : "via " + codes);
    }

    function createFlightCard(flight, selectedCabin) {
        var price = getCabinPrice(flight, selectedCabin);
        var displayDate = formatDisplayDate(flight.date) || "Date not selected";
        var article = document.createElement("article");

        article.className = "flight-card";
        article.setAttribute("data-flight-id", String(flight.instanceId || flight.id));
        article.setAttribute("data-selected-cabin", selectedCabin);

        article.innerHTML =
            '<div class="flight-card-airline">' +
                '<p class="airline-name">' + escapeHtml(flight.airline) + "</p>" +
                '<p class="flight-number">' + escapeHtml(flight.flightNumber) + "</p>" +
            "</div>" +
            '<div class="flight-card-journey">' +
                '<p class="journey-date">' + escapeHtml(displayDate) + "</p>" +
                '<p class="journey-times">' + escapeHtml(flight.departure) + " → " + escapeHtml(flight.arrival) + arrivalDayMarker(flight) + "</p>" +
                '<p class="journey-route">' + escapeHtml(flight.from) + " → " + escapeHtml(flight.to) + "</p>" +
            "</div>" +
            '<div class="flight-card-details">' +
                '<p class="detail-item"><span class="detail-label">' + escapeHtml(typeof t === "function" ? t("results.duration") : "Duration") + '</span> ' + escapeHtml(flight.duration) + "</p>" +
                '<p class="detail-item"><span class="detail-label">' + escapeHtml(typeof t === "function" ? t("results.stops") : "Stops") + '</span> ' + escapeHtml((function () {
                    if (typeof t !== "function") return flight.stops;
                    if (flight.stops === "Non-stop") return t("results.nonstop");
                    if (flight.stops === "1 Stop") return t("results.oneStop");
                    if (flight.stopsCount > 1) return t("results.stopsCount", { count: flight.stopsCount });
                    return flight.stops;
                })() + stopoverCodesLabel(flight)) + "</p>" +
                '<p class="detail-item"><span class="detail-label">' + escapeHtml(typeof t === "function" ? t("flightDetails.aircraft") : "Aircraft") + '</span> ' + escapeHtml(flight.aircraft) + "</p>" +
                buildCabinOptionsMarkup(flight, selectedCabin) +
            "</div>" +
            '<div class="flight-card-action">' +
                '<p class="flight-price">$' + escapeHtml(String(price)) + "</p>" +
                '<div class="flight-card-buttons">' +
                    '<button class="view-details-button" type="button">' + escapeHtml(typeof t === "function" ? t("results.viewDetails") : "View Details") + '</button>' +
                    '<button class="select-flight-button" type="button">' + escapeHtml(typeof t === "function" ? t("results.selectFlight") : "Select Flight") + '</button>' +
                "</div>" +
            "</div>";

        return article;
    }

    function updateCardCabinSelection(card, flight, cabinClass) {
        var price = getCabinPrice(flight, cabinClass);
        if (typeof price !== "number") {
            return;
        }

        card.setAttribute("data-selected-cabin", cabinClass);

        var priceElement = card.querySelector(".flight-price");
        if (priceElement) {
            priceElement.textContent = "$" + String(price);
        }

        var options = card.querySelectorAll(".cabin-option");
        options.forEach(function (option) {
            var isSelected = option.getAttribute("data-cabin") === cabinClass;
            option.classList.toggle("is-selected", isSelected);
            option.setAttribute("aria-checked", isSelected ? "true" : "false");
        });
    }

    var searchCriteria = null;
    var baseFlights = [];
    // Return flights that leave before the outbound flight lands are not offered; this is how many were left out.
    var hiddenBeforeArrival = 0;
    var activeCabin = "Economy";

    function renderEmptyState(container) {
        container.innerHTML =
            '<div class="results-empty">' +
                '<h2 class="results-empty-title">' + (typeof t === "function" ? t("results.noResultsTitle") : "No Flights Found") + '</h2>' +
                '<p class="results-empty-text">' + (typeof t === "function" ? t("results.noResultsText") : "Try adjusting your filters or search criteria.") + '</p>' +
            "</div>";
    }

    function getCheckedValues(name) {
        return Array.prototype.slice
            .call(document.querySelectorAll('input[name="' + name + '"]:checked'))
            .map(function (input) {
                return input.value;
            });
    }

    function getSelectedRadioValue(name) {
        var selected = document.querySelector('input[name="' + name + '"]:checked');
        return selected ? selected.value : "";
    }

    function readFilterState() {
        var sortSelect = document.getElementById("sort-by-select");
        var priceDirection = getSelectedRadioValue("filter-price");
        var durationDirection = getSelectedRadioValue("filter-duration");
        var cabinFilter = resolveCabinName(getSelectedRadioValue("filter-cabin"));
        var sortBy = sortSelect ? sortSelect.value : "recommended";

        if (priceDirection === "asc") {
            sortBy = "price-asc";
        } else if (priceDirection === "desc") {
            sortBy = "price-desc";
        } else if (durationDirection === "asc") {
            sortBy = "duration-asc";
        } else if (durationDirection === "desc") {
            sortBy = "duration-desc";
        }

        return {
            stops: getCheckedValues("filter-stops"),
            cabin: cabinFilter,
            sortBy: sortBy
        };
    }

    function getActiveCabin(filterState) {
        if (filterState.cabin) {
            return filterState.cabin;
        }
        return getDefaultCabin(searchCriteria || {});
    }

    function applyClientFilters(flights, filterState) {
        return flights.filter(function (flight) {
            if (filterState.stops.length && filterState.stops.indexOf(flight.stops) === -1 &&
                !(flight.stopsCount >= 2 && filterState.stops.indexOf("2+") !== -1)) {
                return false;
            }

            if (filterState.cabin && typeof getCabinPrice(flight, filterState.cabin) !== "number") {
                return false;
            }

            return true;
        });
    }

    function compareRecommended(a, b, cabin) {
        var scoreA = getCabinPrice(a, cabin) + (a.durationMinutes || 0) * 0.35 + parseDepartureMinutes(a.departure) * 0.05;
        var scoreB = getCabinPrice(b, cabin) + (b.durationMinutes || 0) * 0.35 + parseDepartureMinutes(b.departure) * 0.05;
        return scoreA - scoreB;
    }

    function sortFilteredFlights(flights, filterState, cabin) {
        var sorted = flights.slice();

        sorted.sort(function (a, b) {
            var priceA = getCabinPrice(a, cabin) || 0;
            var priceB = getCabinPrice(b, cabin) || 0;

            switch (filterState.sortBy) {
                case "cheapest":
                case "price-asc":
                    return priceA - priceB || parseDepartureMinutes(a.departure) - parseDepartureMinutes(b.departure);
                case "price-desc":
                    return priceB - priceA || parseDepartureMinutes(a.departure) - parseDepartureMinutes(b.departure);
                case "fastest":
                case "duration-asc":
                    return (a.durationMinutes || 0) - (b.durationMinutes || 0) || priceA - priceB;
                case "duration-desc":
                    return (b.durationMinutes || 0) - (a.durationMinutes || 0) || priceA - priceB;
                case "earliest":
                    if (a.date !== b.date) {
                        return a.date < b.date ? -1 : 1;
                    }
                    return parseDepartureMinutes(a.departure) - parseDepartureMinutes(b.departure);
                case "recommended":
                default:
                    return compareRecommended(a, b, cabin);
            }
        });

        return sorted;
    }

    function updateResultsCount(count) {
        var countElement = document.getElementById("results-count");
        if (!countElement) {
            return;
        }

        if (count === 0) {
            countElement.textContent = typeof t === "function" ? t("results.foundNone") : "0 flights match your filters";
            return;
        }

        if (typeof t === "function") {
            countElement.textContent = count === 1 ? t("results.foundOne") : t("results.foundMany", { count: count });
        } else {
            countElement.textContent = count + (count === 1 ? " flight found" : " flights found");
        }
    }

    function refreshResults() {
        if (viewState !== "ready") {
            return;
        }

        var filterState = readFilterState();
        activeCabin = getActiveCabin(filterState);

        var filtered = applyClientFilters(baseFlights, filterState);
        var sorted = sortFilteredFlights(filtered, filterState, activeCabin);

        updateResultsCount(sorted.length);
        renderFlightCards(sorted, searchCriteria, activeCabin);
    }

    function clearFilters() {
        var sortSelect = document.getElementById("sort-by-select");
        if (sortSelect) {
            sortSelect.value = "recommended";
        }

        document.querySelectorAll('input[name="filter-price"], input[name="filter-duration"], input[name="filter-stops"]').forEach(function (input) {
            input.checked = false;
        });

        document.querySelectorAll('input[name="filter-cabin"]').forEach(function (input) {
            input.checked = resolveCabinName(input.value) === getDefaultCabin(searchCriteria || {});
        });

        refreshResults();
    }

    function bindFilterControls() {
        var panel = document.querySelector(".filters-panel");
        var toggle = document.getElementById("filters-toggle");
        var clearButton = document.getElementById("clear-filters-button");
        var sortSelect = document.getElementById("sort-by-select");

        if (toggle && panel) {
            toggle.addEventListener("click", function () {
                var isOpen = panel.classList.toggle("is-open");
                toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
            });
        }

        if (clearButton) {
            clearButton.addEventListener("click", clearFilters);
        }

        if (sortSelect) {
            sortSelect.addEventListener("change", function () {
                document.querySelectorAll('input[name="filter-price"], input[name="filter-duration"]').forEach(function (input) {
                    input.checked = false;
                });
                refreshResults();
            });
        }

        document.querySelectorAll('input[name="filter-stops"], input[name="filter-cabin"]').forEach(function (input) {
            input.addEventListener("change", refreshResults);
        });

        document.querySelectorAll('input[name="filter-price"]').forEach(function (input) {
            input.addEventListener("change", function () {
                document.querySelectorAll('input[name="filter-duration"]').forEach(function (durationInput) {
                    durationInput.checked = false;
                });
                if (sortSelect) {
                    sortSelect.value = "recommended";
                }
                refreshResults();
            });
        });

        document.querySelectorAll('input[name="filter-duration"]').forEach(function (input) {
            input.addEventListener("change", function () {
                document.querySelectorAll('input[name="filter-price"]').forEach(function (priceInput) {
                    priceInput.checked = false;
                });
                if (sortSelect) {
                    sortSelect.value = "recommended";
                }
                refreshResults();
            });
        });
    }

    function saveSelectedFlight(flight, cabinClass, criteria) {
        var price = getCabinPrice(flight, cabinClass);

        var selection = {
            id: flight.id,
            flightNumber: flight.flightNumber,
            from: flight.from,
            to: flight.to,
            departure: flight.departure,
            arrival: flight.arrival,
            duration: flight.duration,
            durationMinutes: flight.durationMinutes,
            stops: flight.stops,
            stopsCount: flight.stopsCount,
            arrivalDate: flight.arrivalDate,
            segments: flight.segments || null,
            aircraft: flight.aircraft,
            cabinClass: cabinClass,
            price: price,
            passengers: criteria.passengers,
            adults: criteria.adults,
            children: criteria.children,
            infants: criteria.infants,
            departureDate: flight.date || criteria.departureDate,
            returnDate: criteria.returnDate,
            tripType: criteria.tripType,
            leg: criteria.leg,
            departureAtUtc: flight.departureAtUtc || null,
            arrivalAtUtc: flight.arrivalAtUtc || null
        };

        // A multi-city trip carries all of its searches, so every page can open the next flight's results.
        if (criteria.multi) {
            selection.multi = criteria.multi;
        }

        // Choosing a new first flight starts a new trip; the later flights keep the ones before them.
        if (criteria.leg === 1 && window.AEROVA_JOURNEY) {
            window.AEROVA_JOURNEY.reset();
        }

        try {
            sessionStorage.setItem("aerovaSelectedFlight", JSON.stringify(selection));
        } catch (error) {
            // Storage may be unavailable; navigation still continues.
        }

        window.location.href = "seat-selection.html";
    }

    /* The details page loads the flight itself by id; only the search context travels in the link. */
    function openFlightDetails(flight, criteria) {
        var params = new URLSearchParams({ flightId: String(flight.id) });

        if (criteria.passengers) {
            params.set("passengers", criteria.passengers);
            params.set("adults", String(criteria.adults));
            params.set("children", String(criteria.children));
            params.set("infants", String(criteria.infants));
        }
        if (criteria.tripType) {
            params.set("tripType", criteria.tripType);
        }
        if (criteria.returnDate) {
            params.set("returnDate", criteria.returnDate);
        }
        if (criteria.leg > 1) {
            params.set("leg", String(criteria.leg));
        }
        if (criteria.multi) {
            params.set("segmentsJson", JSON.stringify(criteria.multi.segments));
        }
        if (flight.date || criteria.departureDate) {
            params.set("departureDate", flight.date || criteria.departureDate);
        }
        if (resolveCabinName(criteria.cabinClass)) {
            params.set("cabinClass", resolveCabinName(criteria.cabinClass));
        }

        window.location.href = "flight-details.html?" + params.toString();
    }

    function renderFlightCards(flights, criteria, cabinClass) {
        var container = document.querySelector(".flight-list");
        if (!container) {
            return;
        }

        container.innerHTML = "";

        if (!flights.length) {
            renderEmptyState(container);
            return;
        }

        var defaultCabin = cabinClass || getDefaultCabin(criteria);

        flights.forEach(function (flight) {
            var card = createFlightCard(flight, defaultCabin);
            var cabinButtons = card.querySelectorAll(".cabin-option");
            var viewDetailsButton = card.querySelector(".view-details-button");
            var selectButton = card.querySelector(".select-flight-button");

            cabinButtons.forEach(function (button) {
                button.addEventListener("click", function () {
                    var selectedCabin = button.getAttribute("data-cabin");
                    updateCardCabinSelection(card, flight, selectedCabin);
                });
            });

            if (viewDetailsButton) {
                viewDetailsButton.addEventListener("click", function () {
                    openFlightDetails(flight, criteria);
                });
            }

            if (selectButton) {
                selectButton.addEventListener("click", function () {
                    var selectedCabin = card.getAttribute("data-selected-cabin") || defaultCabin;
                    saveSelectedFlight(flight, selectedCabin, criteria);
                });
            }

            container.appendChild(card);
        });
    }

    function initCabinFilterDefault(criteria) {
        var defaultCabin = getDefaultCabin(criteria);
        document.querySelectorAll('input[name="filter-cabin"]').forEach(function (input) {
            input.checked = resolveCabinName(input.value) === defaultCabin;
        });
    }

    function init() {
        searchCriteria = readSearchCriteria();
        activeCabin = getDefaultCabin(searchCriteria);

        updateResultsHeader(searchCriteria);
        initCabinFilterDefault(searchCriteria);
        bindFilterControls();
        loadFlights();

        window.addEventListener("aerova:languagechange", function () {
            updateResultsHeader(searchCriteria || {});
            if (viewState === "ready") {
                refreshResults();
            } else {
                paintStatus();
            }
            if (window.AEROVA_I18N && typeof window.AEROVA_I18N.applyTranslations === "function") {
                window.AEROVA_I18N.applyTranslations(document);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
