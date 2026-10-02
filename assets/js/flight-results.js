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
            arrival: "18:15",
            duration: "5h 55m",
            durationMinutes: 355,
            stops: "1 Stop",
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
            arrival: "19:40",
            duration: "6h 10m",
            durationMinutes: 370,
            stops: "1 Stop",
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
        }
    ];

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

    function formatPassengerLabel(passengers) {
        var count = Number(passengers);

        if (!count || count < 1) {
            count = 1;
        }

        return count + (count === 1 ? " Passenger" : " Passengers");
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

    function filterFlights(criteria) {
        var fromValue = normalizeText(criteria.from);
        var toValue = normalizeText(criteria.to);

        if (!fromValue || !toValue) {
            return [];
        }

        return MOCK_FLIGHTS.filter(function (flight) {
            return normalizeText(flight.from) === fromValue &&
                normalizeText(flight.to) === toValue;
        });
    }

    function updateResultsHeader(criteria) {
        var routeElement = document.querySelector(".results-route");
        var metaElement = document.querySelector(".results-meta");
        var eyebrowElement = document.querySelector(".results-eyebrow");

        if (eyebrowElement) {
            eyebrowElement.textContent = "Available Flights";
        }

        if (routeElement) {
            var fromLabel = criteria.from || "Origin";
            var toLabel = criteria.to || "Destination";
            routeElement.textContent = fromLabel + " → " + toLabel;
        }

        if (metaElement) {
            var metaParts = [];
            var formattedDate = formatDisplayDate(criteria.departureDate);

            if (formattedDate) {
                metaParts.push(formattedDate);
            }

            metaParts.push(formatPassengerLabel(criteria.passengers));

            if (criteria.cabinClass) {
                metaParts.push(criteria.cabinClass);
            }

            metaElement.textContent = metaParts.join(" · ");
        }
    }

    function buildCabinOptionsMarkup(flight, selectedCabin) {
        var groupId = "cabin-group-" + flight.id;
        var optionsMarkup = CABIN_CLASSES.map(function (cabin) {
            var isSelected = cabin === selectedCabin;
            var price = getCabinPrice(flight, cabin);
            var disabled = typeof price !== "number";

            return (
                '<button' +
                    ' type="button"' +
                    ' class="cabin-option' + (isSelected ? " is-selected" : "") + '"' +
                    ' role="radio"' +
                    ' aria-checked="' + (isSelected ? "true" : "false") + '"' +
                    ' data-cabin="' + escapeHtml(cabin) + '"' +
                    (disabled ? " disabled" : "") +
                ">" +
                    escapeHtml(cabin) +
                "</button>"
            );
        }).join("");

        return (
            '<div class="cabin-selection">' +
                '<p class="cabin-selection-label" id="' + groupId + '-label">Cabin Class</p>' +
                '<div class="cabin-options" role="radiogroup" aria-labelledby="' + groupId + '-label">' +
                    optionsMarkup +
                "</div>" +
            "</div>"
        );
    }

    function createFlightCard(flight, selectedCabin) {
        var price = getCabinPrice(flight, selectedCabin);
        var article = document.createElement("article");

        article.className = "flight-card";
        article.setAttribute("data-flight-id", String(flight.id));
        article.setAttribute("data-selected-cabin", selectedCabin);

        article.innerHTML =
            '<div class="flight-card-airline">' +
                '<p class="airline-name">' + escapeHtml(flight.airline) + "</p>" +
                '<p class="flight-number">' + escapeHtml(flight.flightNumber) + "</p>" +
            "</div>" +
            '<div class="flight-card-schedule">' +
                '<div class="schedule-point">' +
                    '<p class="schedule-time">' + escapeHtml(flight.departure) + "</p>" +
                    '<p class="schedule-city">' + escapeHtml(flight.from) + "</p>" +
                "</div>" +
                '<div class="schedule-path">' +
                    '<p class="schedule-duration">' + escapeHtml(flight.duration) + "</p>" +
                    '<div class="schedule-line" aria-hidden="true"></div>' +
                    '<p class="schedule-stops">' + escapeHtml(flight.stops) + "</p>" +
                "</div>" +
                '<div class="schedule-point schedule-point--arrival">' +
                    '<p class="schedule-time">' + escapeHtml(flight.arrival) + "</p>" +
                    '<p class="schedule-city">' + escapeHtml(flight.to) + "</p>" +
                "</div>" +
            "</div>" +
            '<div class="flight-card-details">' +
                '<p class="detail-item"><span class="detail-label">Aircraft</span> ' + escapeHtml(flight.aircraft) + "</p>" +
                buildCabinOptionsMarkup(flight, selectedCabin) +
            "</div>" +
            '<div class="flight-card-action">' +
                '<p class="flight-price">$' + escapeHtml(String(price)) + "</p>" +
                '<button class="select-flight-button" type="button">Select Flight</button>' +
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

    function renderEmptyState(container) {
        container.innerHTML =
            '<div class="results-empty">' +
                '<h2 class="results-empty-title">No flights found</h2>' +
                '<p class="results-empty-text">Try changing your search criteria.</p>' +
            "</div>";
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
            aircraft: flight.aircraft,
            cabinClass: cabinClass,
            price: price,
            passengers: criteria.passengers,
            departureDate: criteria.departureDate,
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

    function renderFlightCards(flights, criteria) {
        var container = document.querySelector(".flight-list");
        if (!container) {
            return;
        }

        container.innerHTML = "";

        if (!flights.length) {
            renderEmptyState(container);
            return;
        }

        var defaultCabin = getDefaultCabin(criteria);

        flights.forEach(function (flight) {
            var card = createFlightCard(flight, defaultCabin);
            var cabinButtons = card.querySelectorAll(".cabin-option");
            var selectButton = card.querySelector(".select-flight-button");

            cabinButtons.forEach(function (button) {
                button.addEventListener("click", function () {
                    var cabinClass = button.getAttribute("data-cabin");
                    updateCardCabinSelection(card, flight, cabinClass);
                });
            });

            if (selectButton) {
                selectButton.addEventListener("click", function () {
                    var selectedCabin = card.getAttribute("data-selected-cabin") || defaultCabin;
                    saveSelectedFlight(flight, selectedCabin, criteria);
                });
            }

            container.appendChild(card);
        });
    }

    function init() {
        var criteria = readSearchCriteria();
        var matchingFlights = filterFlights(criteria);

        updateResultsHeader(criteria);
        renderFlightCards(matchingFlights, criteria);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
