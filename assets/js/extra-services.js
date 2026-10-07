(function () {
    function tr(key, fallback, vars) {
        if (typeof window.t === "function") {
            var value = window.t(key, vars);
            if (value && value !== key) return value;
        }
        return typeof vars === "object" && vars
            ? String(fallback).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? String(vars[k]) : "{" + k + "}"; })
            : fallback;
    }

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

    var SERVICE_OPTIONS = [
        {
            id: "priority-boarding",
            name: "Priority Boarding",
            description: "Board earlier and settle in with less waiting at the gate.",
            price: 25
        },
        {
            id: "lounge-access",
            name: "Lounge Access",
            description: "Relax with complimentary refreshments before departure.",
            price: 55
        },
        {
            id: "extra-legroom",
            name: "Extra Legroom",
            description: "Enjoy additional space for a more comfortable flight.",
            price: 40
        },
        {
            id: "fast-track",
            name: "Fast Track",
            description: "Skip longer security queues with dedicated airport lanes.",
            price: 30
        },
        {
            id: "travel-insurance",
            name: "Travel Insurance",
            description: "Cover unexpected changes, delays, and travel disruptions.",
            price: 35
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

    var DEFAULT_BASE_FARE = 420;
    var selectedServiceIds = {};
    var costState = {
        baseFare: 0,
        baggageTotal: 0,
        mealTotal: 0
    };

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

    function toNumber(value, fallback) {
        var amount = Number(value);
        return isFinite(amount) ? amount : fallback;
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
        var mealData = readJSON("mealData");

        var storedPassengers = bookingData && Array.isArray(bookingData.passengers)
            ? bookingData.passengers
            : [];

        if (!storedPassengers.length && baggageData && Array.isArray(baggageData.passengers)) {
            storedPassengers = baggageData.passengers;
        }

        if (!storedPassengers.length && mealData && Array.isArray(mealData.passengers)) {
            storedPassengers = mealData.passengers;
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
                name: getPassengerDisplayName(storedPassengers[i], i)
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

    function resolveCostTotals(passengerCount) {
        var bookingData = readJSON("bookingData");
        var selectedFlight = readJSON("aerovaSelectedFlight");
        var baggageData = readJSON("baggageData");
        var mealData = readJSON("mealData");

        var baseFare = toNumber(bookingData && bookingData.totalPrice, NaN);

        if (!isFinite(baseFare) && selectedFlight) {
            var unitPrice = toNumber(selectedFlight.price, NaN);
            if (isFinite(unitPrice)) {
                baseFare = unitPrice * passengerCount;
            }
        }

        if (!isFinite(baseFare)) {
            baseFare = DEFAULT_BASE_FARE * passengerCount;
        }

        return {
            baseFare: baseFare,
            baggageTotal: toNumber(baggageData && baggageData.totalBaggageCost, 0),
            mealTotal: toNumber(mealData && mealData.totalMealCost, 0)
        };
    }

    function getServiceById(serviceId) {
        for (var i = 0; i < SERVICE_OPTIONS.length; i += 1) {
            if (SERVICE_OPTIONS[i].id === serviceId) {
                return SERVICE_OPTIONS[i];
            }
        }

        return null;
    }

    function getSelectedServices() {
        return SERVICE_OPTIONS.filter(function (service) {
            return !!selectedServiceIds[service.id];
        });
    }

    function getExtraServicesTotal() {
        return getSelectedServices().reduce(function (total, service) {
            return total + service.price;
        }, 0);
    }

    function getGrandTotal() {
        return costState.baseFare +
            costState.baggageTotal +
            costState.mealTotal +
            getExtraServicesTotal();
    }

    function buildServiceCard(service) {
        var isSelected = !!selectedServiceIds[service.id];

        return (
            '<button' +
                ' type="button"' +
                ' class="service-card' + (isSelected ? " is-selected" : "") + '"' +
                ' data-service-id="' + escapeHtml(service.id) + '"' +
                ' aria-pressed="' + (isSelected ? "true" : "false") + '"' +
            ">" +
                '<span class="service-card-media service-card-media--' + escapeHtml(service.id) + '" aria-hidden="true"></span>' +
                '<span class="service-toggle" aria-hidden="true"></span>' +
                '<div class="service-card-body">' +
                    '<p class="service-card-name">' + escapeHtml(service.name) + "</p>" +
                    '<p class="service-card-description">' + escapeHtml(service.description) + "</p>" +
                "</div>" +
                '<p class="service-card-price">' + escapeHtml(formatPrice(service.price)) + "</p>" +
            "</button>"
        );
    }

    function renderServiceCards() {
        var container = document.getElementById("extra-services-list");
        if (!container) {
            return;
        }

        container.innerHTML = SERVICE_OPTIONS.map(buildServiceCard).join("");

        container.querySelectorAll(".service-card").forEach(function (card) {
            card.addEventListener("click", function () {
                var serviceId = card.getAttribute("data-service-id");
                toggleService(serviceId);
            });
        });
    }

    function renderOverview(flight, passengers) {
        setText("flight-airline", flight.airline);
        setText("flight-number", flight.flightNumber);
        setText("flight-route", flight.from + " → " + flight.to);
        setText(
            "flight-meta",
            formatDisplayDate(flight.departureDate) +
                " · " +
                flight.departure +
                " → " +
                flight.arrival +
                " · " +
                flight.cabinClass
        );

        var list = document.getElementById("overview-passenger-list");
        if (!list) {
            return;
        }

        list.innerHTML = passengers.map(function (passenger, index) {
            return "<li>Passenger " + (index + 1) + ": " + escapeHtml(passenger.name) + "</li>";
        }).join("");
    }

    function renderSummary() {
        var selected = getSelectedServices();
        var list = document.getElementById("selected-services-list");

        if (list) {
            if (!selected.length) {
                list.innerHTML = '<li class="selected-services-empty">' + tr("extras.noneSelected", "No extra services selected") + '</li>';
            } else {
                list.innerHTML = selected.map(function (service) {
                    return (
                        '<li class="selected-service-item">' +
                            '<span class="selected-service-name">' + escapeHtml(service.name) + "</span>" +
                            '<span class="selected-service-price">' + escapeHtml(formatPrice(service.price)) + "</span>" +
                        "</li>"
                    );
                }).join("");
            }
        }

        setText("summary-base-fare", formatPrice(costState.baseFare));
        setText("summary-baggage-total", formatPrice(costState.baggageTotal));
        setText("summary-meal-total", formatPrice(costState.mealTotal));
        setText("summary-services-total", formatPrice(getExtraServicesTotal()));
        setText("summary-grand-total", formatPrice(getGrandTotal()));
    }

    function toggleService(serviceId) {
        if (!getServiceById(serviceId)) {
            return;
        }

        selectedServiceIds[serviceId] = !selectedServiceIds[serviceId];

        var card = document.querySelector('.service-card[data-service-id="' + serviceId + '"]');
        if (card) {
            var isSelected = !!selectedServiceIds[serviceId];
            card.classList.toggle("is-selected", isSelected);
            card.setAttribute("aria-pressed", isSelected ? "true" : "false");
        }

        renderSummary();
    }

    function buildExtraServicesData() {
        var selected = getSelectedServices();
        var servicesTotal = getExtraServicesTotal();
        var grandTotal = getGrandTotal();

        return {
            selectedServices: selected.map(function (service) {
                return {
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    price: service.price
                };
            }),
            baseFare: costState.baseFare,
            baggageTotal: costState.baggageTotal,
            mealTotal: costState.mealTotal,
            extraServicesTotal: servicesTotal,
            grandTotal: grandTotal
        };
    }

    function saveExtraServicesData() {
        try {
            var data = buildExtraServicesData();
            sessionStorage.setItem("extraServicesData", JSON.stringify(data));

            var bookingData = readJSON("bookingData");
            if (bookingData) {
                bookingData.totalPrice = data.grandTotal;
                bookingData.extraServices = data.selectedServices;
                bookingData.baggageTotal = data.baggageTotal;
                bookingData.mealTotal = data.mealTotal;
                bookingData.extraServicesTotal = data.extraServicesTotal;
                sessionStorage.setItem("bookingData", JSON.stringify(bookingData));
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    function bindContinue() {
        var button = document.getElementById("continue-payment-button");
        if (!button) {
            return;
        }

        button.addEventListener("click", function () {
            saveExtraServicesData();
            window.location.href = "payment.html";
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
        var passengers = resolvePassengers();
        var flight = resolveFlightSummary();

        costState = resolveCostTotals(passengers.length);

        renderOverview(flight, passengers);
        renderServiceCards();
        renderSummary();
        bindContinue();
        initMenuToggle();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
    window.addEventListener("aerova:languagechange", function () {
        if (typeof renderSelectedServices === 'function') { try { renderSelectedServices(); } catch (e) {} } if (window.AEROVA_I18N) window.AEROVA_I18N.applyTranslations(document);
    });
})();
