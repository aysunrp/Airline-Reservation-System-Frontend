(function () {
    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var CABIN_CLASSES = ["Economy", "Comfort", "Business"];

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

    function readSearchCriteria() {
        var params = new URLSearchParams(window.location.search);

        return {
            tripType: params.get("tripType") || "",
            from: (params.get("from") || "").trim(),
            to: (params.get("to") || "").trim(),
            departureDate: params.get("departureDate") || "",
            returnDate: params.get("returnDate") || "",
            passengers: params.get("passengers") || "1",
            cabinClass: (params.get("cabinClass") || "").trim(),
            // 2 = choosing the return flight of a round trip (the link already holds the way back as from/to and the return date).
            leg: params.get("leg") === "2" ? 2 : 1
        };
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
            "</div>";

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
            baseFlights = sortFlightsChronologically(found.map(function (dto) { return window.AEROVA_FLIGHTS.toPageFlight(dto, airports); }));
            viewState = "ready";
            statusSpec = null;
            refreshResults();
        }).catch(function (error) {
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
        });
    }

    /* While choosing the way back, remind the traveller of the flight and seats already chosen for the way out. */
    function paintOutboundNote(criteria) {
        var meta = document.querySelector(".results-meta");
        var note = document.getElementById("journey-note");

        if (!meta) {
            return;
        }

        var outbound = criteria.leg === 2 && window.AEROVA_JOURNEY ? window.AEROVA_JOURNEY.outbound() : null;

        if (!outbound) {
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

        var seats = (outbound.selectedSeats || []).join(", ");
        note.textContent = say("api.journey.outboundChosen", "Outbound: {flight}, {route}, {date}, {cabin}{seats}", {
            flight: outbound.flightNumber,
            route: outbound.from + " \u2192 " + outbound.to,
            date: formatDisplayDate(outbound.departureDate),
            cabin: outbound.cabinClass,
            seats: seats ? ", " + seats : ""
        });
        note.hidden = false;
    }

    function updateResultsHeader(criteria) {
        var routeElement = document.querySelector(".results-route");
        var metaElement = document.querySelector(".results-meta");
        var eyebrowElement = document.querySelector(".results-eyebrow");
        var selectedDate = parseISODate(criteria.departureDate);

        if (eyebrowElement) {
            eyebrowElement.textContent = (typeof t === "function" ? t("results.eyebrow") : "Available Flights");

            if (criteria.leg === 2) {
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
            if (selectedDate) {
                metaElement.textContent = formatDisplayDate(toISODate(selectedDate));
            } else {
                metaElement.textContent = (typeof t === "function" ? t("results.availableNext30") : "Available flights in the next 30 days");
            }
        }
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
            departureDate: flight.date || criteria.departureDate,
            returnDate: criteria.returnDate,
            tripType: criteria.tripType,
            leg: criteria.leg
        };

        // Choosing a new outbound flight starts a new trip; the return flight keeps the outbound one.
        if (criteria.leg !== 2 && window.AEROVA_JOURNEY) {
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
        }
        if (criteria.tripType) {
            params.set("tripType", criteria.tripType);
        }
        if (criteria.returnDate) {
            params.set("returnDate", criteria.returnDate);
        }
        if (criteria.leg === 2) {
            params.set("leg", "2");
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
