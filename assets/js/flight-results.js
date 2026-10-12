(function () {
    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var CABIN_CLASSES = ["Economy", "Comfort", "Business"];

    var MOCK_FLIGHTS = [
        {
            id: 1,
            airline: "AEROVA",
            flightNumber: "AV 101",
            from: "Baku",
            to: "London",
            departure: "09:30",
            arrival: "13:10",
            duration: "5h 40m",
            durationMinutes: 340,
            stops: "Non-stop",
            aircraft: "AEROVA 787-9",
            cabinPrices: {
                Economy: 420,
                Comfort: 560,
                Business: 890
            }
        },
        {
            id: 2,
            airline: "AEROVA",
            flightNumber: "AV 205",
            from: "Baku",
            to: "London",
            departure: "14:20",
            arrival: "19:15",
            duration: "8h 55m",
            durationMinutes: 535,
            stops: "1 Stop",
            legMinutes: [170, 285],
            via: [{ code: "IST", layoverMinutes: 80 }],
            aircraft: "AEROVA A350-900",
            cabinPrices: {
                Economy: 365,
                Comfort: 490,
                Business: 820
            }
        },
        {
            id: 3,
            airline: "AEROVA",
            flightNumber: "AV 401",
            from: "Baku",
            to: "London",
            departure: "15:00",
            arrival: "19:30",
            duration: "4h 30m",
            durationMinutes: 270,
            stops: "Non-stop",
            aircraft: "AEROVA 787-9",
            cabinPrices: {
                Economy: 420,
                Comfort: 560,
                Business: 890
            }
        },
        {
            id: 4,
            airline: "AEROVA",
            flightNumber: "AV 318",
            from: "Baku",
            to: "London",
            departure: "19:45",
            arrival: "23:25",
            duration: "5h 40m",
            durationMinutes: 340,
            stops: "Non-stop",
            aircraft: "AEROVA A321neo",
            cabinPrices: {
                Economy: 455,
                Comfort: 575,
                Business: 950
            }
        },
        {
            id: 5,
            airline: "AEROVA",
            flightNumber: "AV 220",
            from: "Baku",
            to: "Paris",
            departure: "08:10",
            arrival: "11:55",
            duration: "5h 45m",
            durationMinutes: 345,
            stops: "Non-stop",
            aircraft: "AEROVA A350-900",
            cabinPrices: {
                Economy: 390,
                Comfort: 520,
                Business: 860
            }
        },
        {
            id: 6,
            airline: "AEROVA",
            flightNumber: "AV 226",
            from: "Baku",
            to: "Paris",
            departure: "15:30",
            arrival: "20:40",
            duration: "8h 10m",
            durationMinutes: 490,
            stops: "1 Stop",
            legMinutes: [170, 225],
            via: [{ code: "IST", layoverMinutes: 95 }],
            aircraft: "AEROVA A321neo",
            cabinPrices: {
                Economy: 340,
                Comfort: 470,
                Business: 790
            }
        },
        {
            id: 7,
            airline: "AEROVA",
            flightNumber: "AV 232",
            from: "Baku",
            to: "Paris",
            departure: "20:05",
            arrival: "23:50",
            duration: "5h 45m",
            durationMinutes: 345,
            stops: "Non-stop",
            aircraft: "AEROVA A320neo",
            cabinPrices: {
                Economy: 410,
                Comfort: 620,
                Business: 880
            }
        },
        {
            id: 8,
            airline: "AEROVA",
            flightNumber: "AV 310",
            from: "Baku",
            to: "Dubai",
            departure: "06:45",
            arrival: "09:20",
            duration: "3h 35m",
            durationMinutes: 215,
            stops: "Non-stop",
            aircraft: "AEROVA A320neo",
            cabinPrices: {
                Economy: 210,
                Comfort: 290,
                Business: 480
            }
        },
        {
            id: 9,
            airline: "AEROVA",
            flightNumber: "AV 316",
            from: "Baku",
            to: "Dubai",
            departure: "13:15",
            arrival: "15:55",
            duration: "3h 40m",
            durationMinutes: 220,
            stops: "Non-stop",
            aircraft: "AEROVA A321neo",
            cabinPrices: {
                Economy: 245,
                Comfort: 330,
                Business: 520
            }
        },
        {
            id: 10,
            airline: "AEROVA",
            flightNumber: "AV 322",
            from: "Baku",
            to: "Dubai",
            departure: "18:50",
            arrival: "21:30",
            duration: "3h 40m",
            durationMinutes: 220,
            stops: "Non-stop",
            aircraft: "AEROVA 787-9",
            cabinPrices: {
                Economy: 280,
                Comfort: 380,
                Business: 560
            }
        },
        {
            id: 11,
            airline: "AEROVA",
            flightNumber: "AV 501",
            from: "Baku",
            to: "Istanbul",
            departure: "07:55",
            arrival: "10:10",
            duration: "3h 15m",
            durationMinutes: 195,
            stops: "Non-stop",
            aircraft: "AEROVA A320neo",
            cabinPrices: {
                Economy: 185,
                Comfort: 250,
                Business: 400
            }
        },
        {
            id: 12,
            airline: "AEROVA",
            flightNumber: "AV 508",
            from: "Baku",
            to: "Istanbul",
            departure: "12:40",
            arrival: "15:05",
            duration: "3h 25m",
            durationMinutes: 205,
            stops: "Non-stop",
            aircraft: "AEROVA A321neo",
            cabinPrices: {
                Economy: 200,
                Comfort: 275,
                Business: 430
            }
        },
        {
            id: 13,
            airline: "AEROVA",
            flightNumber: "AV 515",
            from: "Baku",
            to: "Istanbul",
            departure: "21:10",
            arrival: "23:25",
            duration: "3h 15m",
            durationMinutes: 195,
            stops: "Non-stop",
            aircraft: "AEROVA A350-900",
            cabinPrices: {
                Economy: 220,
                Comfort: 310,
                Business: 470
            }
        },
        {
            id: 14,
            airline: "AEROVA",
            flightNumber: "AV 612",
            from: "Baku",
            to: "London",
            departure: "07:15",
            arrival: "13:30",
            duration: "10h 15m",
            durationMinutes: 615,
            stops: "2 Stops",
            legMinutes: [65, 220, 150],
            via: [
                { code: "TBS", layoverMinutes: 70 },
                { code: "VIE", layoverMinutes: 110 }
            ],
            aircraft: "AEROVA A320neo",
            cabinPrices: {
                Economy: 310,
                Comfort: 430,
                Business: 720
            }
        },
        {
            id: 15,
            airline: "AEROVA",
            flightNumber: "AV 724",
            from: "Baku",
            to: "Paris",
            departure: "22:40",
            arrival: "07:35",
            duration: "11h 55m",
            durationMinutes: 715,
            stops: "2 Stops",
            legMinutes: [170, 145, 125],
            via: [
                { code: "IST", layoverMinutes: 150 },
                { code: "VIE", layoverMinutes: 125 }
            ],
            aircraft: "AEROVA A321neo",
            cabinPrices: {
                Economy: 285,
                Comfort: 395,
                Business: 660
            }
        }
    ];

    /*
     * Mock airport data. Times in the itinerary are local to each airport;
     * utcOffset (minutes) is a fixed mock offset used to keep segment
     * durations, layovers and the total journey time consistent.
     */
    var AIRPORTS = {
        GYD: { code: "GYD", city: "Baku", name: "Heydar Aliyev International Airport", utcOffset: 240 },
        LHR: { code: "LHR", city: "London", name: "Heathrow Airport", utcOffset: 0 },
        CDG: { code: "CDG", city: "Paris", name: "Paris Charles de Gaulle Airport", utcOffset: 60 },
        DXB: { code: "DXB", city: "Dubai", name: "Dubai International Airport", utcOffset: 240 },
        IST: { code: "IST", city: "Istanbul", name: "Istanbul Airport", utcOffset: 180 },
        TBS: { code: "TBS", city: "Tbilisi", name: "Tbilisi International Airport", utcOffset: 240 },
        VIE: { code: "VIE", city: "Vienna", name: "Vienna International Airport", utcOffset: 60 }
    };

    var CITY_AIRPORTS = {
        baku: "GYD",
        london: "LHR",
        paris: "CDG",
        dubai: "DXB",
        istanbul: "IST"
    };

    function formatDurationLabel(totalMinutes) {
        var hours = Math.floor(totalMinutes / 60);
        var minutes = totalMinutes % 60;
        return hours + "h " + (minutes < 10 ? "0" : "") + minutes + "m";
    }

    function pad2(value) {
        return (value < 10 ? "0" : "") + value;
    }

    function minutesToClock(totalMinutes) {
        var dayMinutes = ((totalMinutes % 1440) + 1440) % 1440;
        return pad2(Math.floor(dayMinutes / 60)) + ":" + pad2(dayMinutes % 60);
    }

    function airportFor(city) {
        return AIRPORTS[CITY_AIRPORTS[String(city || "").trim().toLowerCase()]] || null;
    }

    /*
     * Builds the segment template of a schedule from its legs and stopovers.
     * Every time is computed in UTC minutes relative to the departure day and
     * then converted back to the local time of the airport involved.
     */
    function buildRoute(schedule) {
        var origin = airportFor(schedule.from);
        var destination = airportFor(schedule.to);
        var via = schedule.via || [];
        var legMinutes = schedule.legMinutes || [schedule.durationMinutes];

        if (!origin || !destination || legMinutes.length !== via.length + 1) {
            return null;
        }

        var stopsList = [origin];
        via.forEach(function (stop) {
            stopsList.push(AIRPORTS[stop.code]);
        });
        stopsList.push(destination);

        if (stopsList.some(function (airport) { return !airport; })) {
            return null;
        }

        var cursorUtc = parseDepartureMinutes(schedule.departure) - origin.utcOffset;
        var segments = [];

        for (var i = 0; i < legMinutes.length; i += 1) {
            var fromAirport = stopsList[i];
            var toAirport = stopsList[i + 1];

            if (i > 0) {
                cursorUtc += via[i - 1].layoverMinutes;
            }

            var depLocal = cursorUtc + fromAirport.utcOffset;
            var arrUtc = cursorUtc + legMinutes[i];
            var arrLocal = arrUtc + toAirport.utcOffset;

            segments.push({
                from: { code: fromAirport.code, city: fromAirport.city, name: fromAirport.name },
                to: { code: toAirport.code, city: toAirport.city, name: toAirport.name },
                departureTime: minutesToClock(depLocal),
                departureDayOffset: Math.floor(depLocal / 1440),
                departureUtcOffset: fromAirport.utcOffset,
                arrivalTime: minutesToClock(arrLocal),
                arrivalDayOffset: Math.floor(arrLocal / 1440),
                arrivalUtcOffset: toAirport.utcOffset,
                durationMinutes: legMinutes[i]
            });

            cursorUtc = arrUtc;
        }

        return segments;
    }

    /* Derive arrival, duration and stops from the itinerary so they always agree. */
    MOCK_FLIGHTS.forEach(function (schedule) {
        var route = buildRoute(schedule);
        if (!route) {
            return;
        }

        var last = route[route.length - 1];
        var total = 0;
        route.forEach(function (segment, index) {
            total += segment.durationMinutes;
            if (index > 0) {
                total += schedule.via[index - 1].layoverMinutes;
            }
        });

        schedule.route = route;
        schedule.arrival = last.arrivalTime;
        schedule.arrivalDayOffset = last.arrivalDayOffset;
        schedule.durationMinutes = total;
        schedule.duration = formatDurationLabel(total);
        schedule.stopsCount = route.length - 1;
        schedule.stops = schedule.stopsCount === 0 ? "Non-stop" : (schedule.stopsCount === 1 ? "1 Stop" : schedule.stopsCount + " Stops");
    });

    function datedSegments(route, date) {
        if (!route) {
            return null;
        }

        return route.map(function (segment) {
            return {
                from: segment.from,
                to: segment.to,
                departureDate: toISODate(addDays(date, segment.departureDayOffset)),
                departureTime: segment.departureTime,
                departureUtcOffset: segment.departureUtcOffset,
                arrivalDate: toISODate(addDays(date, segment.arrivalDayOffset)),
                arrivalTime: segment.arrivalTime,
                arrivalUtcOffset: segment.arrivalUtcOffset,
                durationMinutes: segment.durationMinutes
            };
        });
    }

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
            cabinClass: (params.get("cabinClass") || "").trim()
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

    function startOfToday() {
        var now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

    function addDays(date, days) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
    }

    function getDayNumber(date) {
        return Math.round(date.getTime() / 86400000);
    }

    function scheduleOperatesOn(schedule, date) {
        return getDayNumber(date) % 4 === (schedule.id - 1) % 4;
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

    function createDatedFlight(schedule, date) {
        var dateISO = toISODate(date);

        return {
            id: schedule.id,
            instanceId: String(schedule.id) + "-" + dateISO,
            airline: schedule.airline,
            flightNumber: schedule.flightNumber,
            from: schedule.from,
            to: schedule.to,
            departure: schedule.departure,
            arrival: schedule.arrival,
            duration: schedule.duration,
            durationMinutes: schedule.durationMinutes,
            stops: schedule.stops,
            stopsCount: schedule.stopsCount,
            aircraft: schedule.aircraft,
            cabinPrices: schedule.cabinPrices,
            date: dateISO,
            arrivalDate: schedule.route ? toISODate(addDays(date, schedule.arrivalDayOffset)) : dateISO,
            segments: datedSegments(schedule.route, date)
        };
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

    function filterFlights(criteria) {
        var fromValue = normalizeText(criteria.from);
        var toValue = normalizeText(criteria.to);

        if (!fromValue || !toValue) {
            return [];
        }

        var matchingSchedules = MOCK_FLIGHTS.filter(function (flight) {
            return normalizeText(flight.from) === fromValue &&
                normalizeText(flight.to) === toValue;
        });

        var results = [];
        var selectedDate = parseISODate(criteria.departureDate);

        if (selectedDate) {
            matchingSchedules.forEach(function (schedule) {
                results.push(createDatedFlight(schedule, selectedDate));
            });
        } else {
            var today = startOfToday();
            var dayOffset;

            for (dayOffset = 0; dayOffset < 30; dayOffset += 1) {
                var date = addDays(today, dayOffset);

                matchingSchedules.forEach(function (schedule) {
                    if (scheduleOperatesOn(schedule, date)) {
                        results.push(createDatedFlight(schedule, date));
                    }
                });
            }
        }

        return sortFlightsChronologically(results);
    }

    function updateResultsHeader(criteria) {
        var routeElement = document.querySelector(".results-route");
        var metaElement = document.querySelector(".results-meta");
        var eyebrowElement = document.querySelector(".results-eyebrow");
        var selectedDate = parseISODate(criteria.departureDate);

        if (eyebrowElement) {
            eyebrowElement.textContent = (typeof t === "function" ? t("results.eyebrow") : "Available Flights");
        }

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
            tripType: criteria.tripType
        };

        try {
            sessionStorage.setItem("aerovaSelectedFlight", JSON.stringify(selection));
        } catch (error) {
            // Storage may be unavailable; navigation still continues.
        }

        window.location.href = "seat-selection.html";
    }

    function openFlightDetails(flight, criteria) {
        var params = new URLSearchParams({
            flightNumber: flight.flightNumber || "",
            from: flight.from || "",
            to: flight.to || "",
            departureDate: flight.date || criteria.departureDate || "",
            departureTime: flight.departure || "",
            arrivalTime: flight.arrival || "",
            duration: flight.duration || "",
            stops: flight.stops || "",
            aircraft: flight.aircraft || ""
        });

        if (typeof flight.stopsCount === "number") {
            params.set("stopsCount", String(flight.stopsCount));
        }

        if (flight.arrivalDate) {
            params.set("arrivalDate", flight.arrivalDate);
        }

        if (typeof flight.durationMinutes === "number") {
            params.set("durationMinutes", String(flight.durationMinutes));
        }

        if (flight.segments && flight.segments.length) {
            params.set("segments", JSON.stringify(flight.segments));
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
        baseFlights = filterFlights(searchCriteria);
        activeCabin = getDefaultCabin(searchCriteria);

        updateResultsHeader(searchCriteria);
        initCabinFilterDefault(searchCriteria);
        bindFilterControls();
        refreshResults();

        window.addEventListener("aerova:languagechange", function () {
            updateResultsHeader(searchCriteria || {});
            refreshResults();
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
