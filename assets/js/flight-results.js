(function () {
    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var MOCK_FLIGHTS = [
        {
            id: "av-101",
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
            price: 420,
            cabinClass: "Economy"
        },
        {
            id: "av-205",
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
            price: 365,
            cabinClass: "Economy"
        },
        {
            id: "av-318",
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
            price: 455,
            cabinClass: "Economy"
        },
        {
            id: "av-412",
            airline: "AEROVA",
            flightNumber: "AV 412",
            from: "Baku",
            to: "London",
            departure: "07:15",
            arrival: "11:05",
            duration: "5h 50m",
            durationMinutes: 350,
            stops: "Non-stop",
            aircraft: "AEROVA A320neo",
            price: 510,
            cabinClass: "Comfort"
        },
        {
            id: "av-490",
            airline: "AEROVA",
            flightNumber: "AV 490",
            from: "Baku",
            to: "London",
            departure: "11:40",
            arrival: "15:20",
            duration: "5h 40m",
            durationMinutes: 340,
            stops: "Non-stop",
            aircraft: "AEROVA 787-9",
            price: 890,
            cabinClass: "Business"
        },
        {
            id: "av-220",
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
            price: 390,
            cabinClass: "Economy"
        },
        {
            id: "av-226",
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
            price: 340,
            cabinClass: "Economy"
        },
        {
            id: "av-232",
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
            price: 620,
            cabinClass: "Comfort"
        },
        {
            id: "av-310",
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
            price: 210,
            cabinClass: "Economy"
        },
        {
            id: "av-316",
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
            price: 245,
            cabinClass: "Economy"
        },
        {
            id: "av-322",
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
            price: 480,
            cabinClass: "Business"
        },
        {
            id: "av-501",
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
            price: 185,
            cabinClass: "Economy"
        },
        {
            id: "av-508",
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
            price: 275,
            cabinClass: "Comfort"
        },
        {
            id: "av-515",
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
            price: 430,
            cabinClass: "Business"
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

    function filterFlights(criteria) {
        var fromValue = normalizeText(criteria.from);
        var toValue = normalizeText(criteria.to);
        var cabinValue = normalizeText(criteria.cabinClass);

        if (!fromValue || !toValue) {
            return [];
        }

        return MOCK_FLIGHTS.filter(function (flight) {
            var matchesFrom = normalizeText(flight.from) === fromValue;
            var matchesTo = normalizeText(flight.to) === toValue;
            var matchesCabin = !cabinValue || normalizeText(flight.cabinClass) === cabinValue;

            return matchesFrom && matchesTo && matchesCabin;
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

    function createFlightCard(flight) {
        var article = document.createElement("article");
        article.className = "flight-card";
        article.setAttribute("data-flight-id", flight.id);

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
                '<p class="detail-item"><span class="detail-label">Cabin</span> ' + escapeHtml(flight.cabinClass) + "</p>" +
            "</div>" +
            '<div class="flight-card-action">' +
                '<p class="flight-price">$' + escapeHtml(String(flight.price)) + "</p>" +
                '<button class="select-flight-button" type="button">Select Flight</button>' +
            "</div>";

        return article;
    }

    function renderEmptyState(container) {
        container.innerHTML =
            '<div class="results-empty">' +
                "<h2 class=\"results-empty-title\">No flights found</h2>" +
                "<p class=\"results-empty-text\">Try changing your search criteria.</p>" +
            "</div>";
    }

    function saveSelectedFlight(flight, criteria) {
        var selection = {
            id: flight.id,
            flightNumber: flight.flightNumber,
            from: flight.from,
            to: flight.to,
            departure: flight.departure,
            arrival: flight.arrival,
            duration: flight.duration,
            aircraft: flight.aircraft,
            price: flight.price,
            cabinClass: flight.cabinClass,
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

        flights.forEach(function (flight) {
            var card = createFlightCard(flight);
            var selectButton = card.querySelector(".select-flight-button");

            if (selectButton) {
                selectButton.addEventListener("click", function () {
                    saveSelectedFlight(flight, criteria);
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
