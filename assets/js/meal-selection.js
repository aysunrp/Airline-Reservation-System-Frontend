(function () {
    var MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var MOCK_PASSENGER_NAMES = [
        "Leyla Mammadova",
        "Orkhan Aliyev",
        "Nigar Huseynova",
        "Rashad Ismayilov",
        "Aysel Karimova",
        "Elvin Abbasov"
    ];

    var MEAL_OPTIONS = [
        {
            id: "none",
            name: "No Meal",
            description: "Skip in-flight dining for this passenger.",
            price: 0
        },
        {
            id: "standard",
            name: "Standard Meal",
            description: "Chef-prepared main with seasonal sides.",
            price: 18
        },
        {
            id: "vegetarian",
            name: "Vegetarian Meal",
            description: "Meat-free course with fresh vegetables.",
            price: 20
        },
        {
            id: "vegan",
            name: "Vegan Meal",
            description: "Plant-based dish prepared without animal products.",
            price: 22
        },
        {
            id: "halal",
            name: "Halal Meal",
            description: "Prepared according to Halal dietary standards.",
            price: 20
        },
        {
            id: "kids",
            name: "Kids Meal",
            description: "A lighter, child-friendly plate and dessert.",
            price: 15
        }
    ];

    var DEFAULT_FLIGHT = {
        airline: "AEROVA",
        flightNumber: "AV 101",
        from: "Baku",
        to: "London",
        departureDate: "2026-10-10",
        departure: "09:30",
        arrival: "13:10",
        cabinClass: "Economy",
        aircraft: "AEROVA 787-9"
    };

    var passengersState = [];

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function formatDisplayDate(dateValue) {
        if (!dateValue) {
            return "—";
        }

        var parts = String(dateValue).split("-");
        if (parts.length !== 3) {
            return String(dateValue);
        }

        var year = Number(parts[0]);
        var month = Number(parts[1]);
        var day = Number(parts[2]);

        if (!year || !month || !day || month < 1 || month > 12) {
            return String(dateValue);
        }

        return day + " " + MONTH_NAMES[month - 1] + " " + year;
    }

    function formatPrice(price) {
        var amount = Number(price);

        if (!isFinite(amount)) {
            return "$0";
        }

        if (amount === 0) {
            return "$0";
        }

        return "$" + amount.toFixed(amount % 1 === 0 ? 0 : 2);
    }

    function readJSON(key) {
        try {
            var raw = sessionStorage.getItem(key);
            if (!raw) {
                return null;
            }

            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function getPassengerDisplayName(passenger, index) {
        if (!passenger || typeof passenger !== "object") {
            return MOCK_PASSENGER_NAMES[index % MOCK_PASSENGER_NAMES.length];
        }

        if (passenger.fullName) {
            return String(passenger.fullName);
        }

        var parts = [passenger.firstName, passenger.middleName, passenger.lastName]
            .map(function (part) {
                return String(part || "").trim();
            })
            .filter(Boolean);

        if (parts.length) {
            return parts.join(" ");
        }

        if (passenger.name) {
            return String(passenger.name);
        }

        return MOCK_PASSENGER_NAMES[index % MOCK_PASSENGER_NAMES.length];
    }

    function resolvePassengers() {
        var bookingData = readJSON("bookingData");
        var selectedFlight = readJSON("aerovaSelectedFlight");
        var baggageData = readJSON("baggageData");

        var storedPassengers = bookingData && Array.isArray(bookingData.passengers)
            ? bookingData.passengers
            : [];

        if (!storedPassengers.length && baggageData && Array.isArray(baggageData.passengers)) {
            storedPassengers = baggageData.passengers;
        }

        var count = storedPassengers.length;

        if (!count && bookingData && bookingData.passengerCount) {
            count = Number(bookingData.passengerCount) || 0;
        }

        if (!count && selectedFlight && selectedFlight.passengers) {
            count = Number(selectedFlight.passengers) || 0;
        }

        if (!count || count < 1) {
            count = 2;
        }

        count = Math.min(Math.floor(count), 6);

        var list = [];
        for (var i = 0; i < count; i += 1) {
            list.push({
                index: i,
                name: getPassengerDisplayName(storedPassengers[i], i),
                optionId: "none"
            });
        }

        return list;
    }

    function resolveFlightSummary() {
        var bookingData = readJSON("bookingData");
        var selectedFlight = readJSON("aerovaSelectedFlight");
        var flight = (bookingData && bookingData.flight) || selectedFlight || {};

        return {
            airline: flight.airline || DEFAULT_FLIGHT.airline,
            flightNumber: flight.flightNumber || DEFAULT_FLIGHT.flightNumber,
            from: flight.from || DEFAULT_FLIGHT.from,
            to: flight.to || DEFAULT_FLIGHT.to,
            departureDate: flight.departureDate || flight.date || DEFAULT_FLIGHT.departureDate,
            departure: flight.departure || flight.departureTime || DEFAULT_FLIGHT.departure,
            arrival: flight.arrival || flight.arrivalTime || DEFAULT_FLIGHT.arrival,
            cabinClass: (bookingData && bookingData.cabinClass) ||
                flight.cabinClass ||
                DEFAULT_FLIGHT.cabinClass,
            aircraft: flight.aircraft || DEFAULT_FLIGHT.aircraft
        };
    }

    function getOptionById(optionId) {
        for (var i = 0; i < MEAL_OPTIONS.length; i += 1) {
            if (MEAL_OPTIONS[i].id === optionId) {
                return MEAL_OPTIONS[i];
            }
        }

        return MEAL_OPTIONS[0];
    }

    function buildOptionsMarkup(passengerIndex, selectedOptionId) {
        return MEAL_OPTIONS.map(function (option) {
            var isSelected = option.id === selectedOptionId;

            return (
                '<button' +
                    ' type="button"' +
                    ' class="meal-option' + (isSelected ? " is-selected" : "") + '"' +
                    ' data-passenger-index="' + passengerIndex + '"' +
                    ' data-option-id="' + escapeHtml(option.id) + '"' +
                    ' aria-pressed="' + (isSelected ? "true" : "false") + '"' +
                ">" +
                    '<p class="meal-option-name">' + escapeHtml(option.name) + "</p>" +
                    '<p class="meal-option-description">' + escapeHtml(option.description) + "</p>" +
                    '<p class="meal-option-price">' + escapeHtml(formatPrice(option.price)) + "</p>" +
                "</button>"
            );
        }).join("");
    }

    function buildPassengerCard(passenger) {
        var passengerNumber = passenger.index + 1;
        var titleId = "passenger-meal-title-" + passengerNumber;

        return (
            '<article class="details-card passenger-meal-card" data-passenger-index="' + passenger.index + '" aria-labelledby="' + titleId + '">' +
                '<h2 class="details-card-title" id="' + titleId + '">Passenger ' + passengerNumber + "</h2>" +
                '<p class="passenger-meal-note">' + escapeHtml(passenger.name) + "</p>" +
                '<div class="meal-options" role="group" aria-label="Meal options for ' + escapeHtml(passenger.name) + '">' +
                    buildOptionsMarkup(passenger.index, passenger.optionId) +
                "</div>" +
            "</article>"
        );
    }

    function renderPassengerCards() {
        var container = document.getElementById("passenger-meal-list");
        if (!container) {
            return;
        }

        container.innerHTML = passengersState.map(buildPassengerCard).join("");

        container.querySelectorAll(".meal-option").forEach(function (button) {
            button.addEventListener("click", function () {
                var passengerIndex = Number(button.getAttribute("data-passenger-index"));
                var optionId = button.getAttribute("data-option-id");
                selectMealOption(passengerIndex, optionId);
            });
        });
    }

    function renderFlightSummary(flight) {
        setText("flight-airline", flight.airline);
        setText("flight-number", flight.flightNumber);
        setText("flight-route", flight.from + " → " + flight.to);
        setText("flight-date", formatDisplayDate(flight.departureDate));
        setText("flight-times", flight.departure + " → " + flight.arrival);
        setText("flight-cabin", flight.cabinClass);
        setText("flight-aircraft", flight.aircraft);
    }

    function getTotalMealCost() {
        return passengersState.reduce(function (total, passenger) {
            return total + getOptionById(passenger.optionId).price;
        }, 0);
    }

    function renderSummary() {
        var list = document.getElementById("meal-summary-list");
        var totalElement = document.getElementById("meal-total-cost");

        if (list) {
            list.innerHTML = passengersState.map(function (passenger) {
                var option = getOptionById(passenger.optionId);

                return (
                    '<li class="meal-summary-item">' +
                        '<p class="meal-summary-name">' + escapeHtml(passenger.name) + "</p>" +
                        '<p class="meal-summary-choice">' +
                            '<span class="meal-summary-choice-label">' + escapeHtml(option.name) + "</span>" +
                            '<span class="meal-summary-choice-price">' + escapeHtml(formatPrice(option.price)) + "</span>" +
                        "</p>" +
                    "</li>"
                );
            }).join("");
        }

        if (totalElement) {
            totalElement.textContent = formatPrice(getTotalMealCost());
        }
    }

    function selectMealOption(passengerIndex, optionId) {
        var passenger = passengersState[passengerIndex];
        if (!passenger || !getOptionById(optionId)) {
            return;
        }

        passenger.optionId = optionId;

        var card = document.querySelector(
            '.passenger-meal-card[data-passenger-index="' + passengerIndex + '"]'
        );

        if (card) {
            card.querySelectorAll(".meal-option").forEach(function (button) {
                var isSelected = button.getAttribute("data-option-id") === optionId;
                button.classList.toggle("is-selected", isSelected);
                button.setAttribute("aria-pressed", isSelected ? "true" : "false");
            });
        }

        renderSummary();
    }

    function buildMealData() {
        return {
            passengers: passengersState.map(function (passenger) {
                var option = getOptionById(passenger.optionId);

                return {
                    passengerIndex: passenger.index,
                    name: passenger.name,
                    optionId: option.id,
                    mealName: option.name,
                    description: option.description,
                    price: option.price
                };
            }),
            totalMealCost: getTotalMealCost()
        };
    }

    function saveMealData() {
        try {
            sessionStorage.setItem("mealData", JSON.stringify(buildMealData()));
            return true;
        } catch (error) {
            return false;
        }
    }

    function bindContinue() {
        var button = document.getElementById("continue-extra-services-button");
        if (!button) {
            return;
        }

        button.addEventListener("click", function () {
            saveMealData();
            window.location.href = "extra-services.html";
        });
    }

    function initMenuToggle() {
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
    }

    function init() {
        var flight = resolveFlightSummary();
        passengersState = resolvePassengers();

        renderFlightSummary(flight);
        renderPassengerCards();
        renderSummary();
        bindContinue();
        initMenuToggle();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
